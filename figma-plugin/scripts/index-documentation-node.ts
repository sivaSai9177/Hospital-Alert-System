#!/usr/bin/env bun

// This is a Node.js script that runs outside of Figma to index documentation

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { QdrantClient } from '@qdrant/js-client-rest';

interface Document {
  id: string;
  content: string;
  metadata: {
    type: 'guide' | 'api' | 'example' | 'architecture';
    title: string;
    path: string;
    tags?: string[];
    lastUpdated?: Date;
  };
}

interface CodeSnippet {
  id: string;
  code: string;
  language: string;
  metadata: {
    fileName: string;
    functionName?: string;
    description?: string;
    tags?: string[];
  };
}

// Simple local embeddings for now (replace with OpenAI when API key is available)
function generateEmbedding(text: string): number[] {
  const embedding = new Array(1536).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  words.forEach((word, idx) => {
    const hash = hashString(word);
    const position = hash % embedding.length;
    embedding[position] += 1 / (idx + 1);
  });
  
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }
  
  return embedding;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

async function getMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function getTypeScriptFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.includes('dist')) {
      files.push(...await getTypeScriptFiles(fullPath));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1] : 'Untitled';
}

function extractFunctionName(code: string, startIndex: number): string | undefined {
  const beforeCode = code.substring(Math.max(0, startIndex - 100), startIndex);
  const match = beforeCode.match(/(?:function|const|let|var)\s+(\w+)/);
  return match ? match[1] : undefined;
}

async function main() {
  console.log('🚀 Starting documentation indexing...\n');
  
  // Initialize Qdrant client
  const client = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY
  });
  
  const collections = {
    documentation: 'figma_plugin_docs',
    code: 'figma_plugin_code',
    patterns: 'figma_plugin_patterns',
    errors: 'figma_plugin_errors'
  };
  
  // Create collections if they don't exist
  for (const collectionName of Object.values(collections)) {
    try {
      await client.getCollection(collectionName);
      console.log(`✓ Collection ${collectionName} exists`);
    } catch (error) {
      console.log(`Creating collection ${collectionName}...`);
      await client.createCollection(collectionName, {
        vectors: {
          size: 1536,
          distance: 'Cosine'
        }
      });
    }
  }
  
  // Index documentation
  console.log('\n📚 Indexing documentation...');
  const docsDir = join(__dirname, '..', 'docs');
  const docFiles = await getMarkdownFiles(docsDir);
  
  const documents: any[] = [];
  for (const file of docFiles) {
    const content = await readFile(file, 'utf-8');
    const relativePath = file.replace(join(__dirname, '..'), '');
    
    documents.push({
      id: uuidv4(),
      vector: generateEmbedding(`${extractTitle(content)} ${content}`),
      payload: {
        type: relativePath.includes('/api/') ? 'api' : 
              relativePath.includes('/examples/') ? 'example' :
              relativePath.includes('/architecture/') ? 'architecture' : 'guide',
        title: extractTitle(content),
        path: relativePath,
        content: content.substring(0, 1000), // Truncate for storage
        lastUpdated: new Date()
      }
    });
  }
  
  if (documents.length > 0) {
    await client.upsert(collections.documentation, {
      points: documents
    });
    console.log(`✓ Indexed ${documents.length} documentation files`);
  }
  
  // Index code examples
  console.log('\n💻 Indexing code examples...');
  const srcDir = join(__dirname, '..', 'src');
  const codeFiles = await getTypeScriptFiles(srcDir);
  
  const codeSnippets: any[] = [];
  for (const file of codeFiles.slice(0, 50)) { // Limit to 50 files for demo
    const content = await readFile(file, 'utf-8');
    const relativePath = file.replace(join(__dirname, '..'), '');
    
    // Simple function extraction
    const functionMatches = content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g);
    
    for (const match of functionMatches) {
      const functionName = match[1] || match[2];
      const startIndex = match.index || 0;
      const endIndex = Math.min(startIndex + 500, content.length);
      const functionCode = content.substring(startIndex, endIndex);
      
      codeSnippets.push({
        id: uuidv4(),
        vector: generateEmbedding(`${functionName} ${functionCode}`),
        payload: {
          fileName: relativePath,
          functionName,
          code: functionCode,
          language: 'typescript'
        }
      });
    }
  }
  
  if (codeSnippets.length > 0) {
    // Upload in batches
    for (let i = 0; i < codeSnippets.length; i += 50) {
      const batch = codeSnippets.slice(i, i + 50);
      await client.upsert(collections.code, { points: batch });
    }
    console.log(`✓ Indexed ${codeSnippets.length} code snippets`);
  }
  
  // Index patterns
  console.log('\n🎨 Indexing design patterns...');
  const patterns = [
    {
      id: uuidv4(),
      vector: generateEmbedding('token extraction extract design tokens figma selection'),
      payload: {
        name: 'Token Extraction Pattern',
        description: 'Extract design tokens from Figma selection',
        code: `const tokens = await extractDesignTokens();\nconst validation = validateTokens(tokens);\nif (validation.isValid) {\n  await syncToCode(tokens);\n}`,
        useCase: 'Extracting and syncing design tokens',
        tags: ['tokens', 'extraction', 'sync']
      }
    },
    {
      id: uuidv4(),
      vector: generateEmbedding('component generation generate react component figma node'),
      payload: {
        name: 'Component Generation Pattern',
        description: 'Generate React component from Figma node',
        code: `const component = await componentLibraryGenerator.generate({\n  framework: 'react',\n  components: [selectedNode],\n  options: {\n    typescript: true,\n    styling: 'styled-components'\n  }\n});`,
        useCase: 'Generating framework components from design',
        tags: ['component', 'generation', 'react']
      }
    }
  ];
  
  await client.upsert(collections.patterns, { points: patterns });
  console.log(`✓ Indexed ${patterns.length} design patterns`);
  
  // Index error solutions
  console.log('\n🐛 Indexing error solutions...');
  const errors = [
    {
      id: uuidv4(),
      vector: generateEmbedding('unexpected token class field syntax error figma'),
      payload: {
        error: 'Unexpected token = class field',
        solution: 'Use the custom build script that transpiles ES2022 features to ES5',
        context: 'Figma runtime only supports ES5 JavaScript',
        tags: ['syntax', 'transpilation', 'build']
      }
    },
    {
      id: uuidv4(),
      vector: generateEmbedding('cannot read properties undefined node type figma'),
      payload: {
        error: 'Cannot read properties of undefined',
        solution: 'Check if the node has the property before accessing it. Use optional chaining or guard clauses.',
        context: 'Different node types have different properties',
        tags: ['runtime', 'node', 'properties']
      }
    }
  ];
  
  await client.upsert(collections.errors, { points: errors });
  console.log(`✓ Indexed ${errors.length} error solutions`);
  
  // Show statistics
  console.log('\n📊 Collection Statistics:');
  for (const [name, collectionName] of Object.entries(collections)) {
    try {
      const info = await client.getCollection(collectionName);
      console.log(`  ${name}: ${info.points_count} items indexed`);
    } catch (error) {
      console.log(`  ${name}: Error getting info`);
    }
  }
  
  console.log('\n🎉 Documentation indexing complete!');
}

main().catch(console.error);