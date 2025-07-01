import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { Document, CodeSnippet, Pattern, getQdrantService } from './index';
import { v4 as uuidv4 } from 'uuid';

export class DocumentationIndexer {
  private qdrant = getQdrantService();
  
  async indexAllDocumentation(docsPath: string): Promise<void> {
    console.log('🔍 Starting documentation indexing...');
    
    // Index markdown documentation
    await this.indexMarkdownDocs(join(docsPath, 'docs'));
    
    // Index code examples
    await this.indexCodeExamples(join(docsPath, 'src'));
    
    // Index common patterns
    await this.indexPatterns();
    
    // Index error solutions
    await this.indexErrorSolutions();
    
    console.log('✅ Documentation indexing complete');
  }
  
  private async indexMarkdownDocs(docsDir: string): Promise<void> {
    const files = await this.getMarkdownFiles(docsDir);
    const documents: Document[] = [];
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const relativePath = file.replace(docsDir, '');
      
      const doc: Document = {
        id: uuidv4(),
        content,
        metadata: {
          type: this.getDocType(relativePath),
          title: this.extractTitle(content),
          path: relativePath,
          tags: this.extractTags(content),
          lastUpdated: new Date()
        }
      };
      
      documents.push(doc);
    }
    
    await this.qdrant.indexDocumentsBatch(documents);
    console.log(`📚 Indexed ${documents.length} documentation files`);
  }
  
  private async indexCodeExamples(srcDir: string): Promise<void> {
    const files = await this.getTypeScriptFiles(srcDir);
    const snippets: CodeSnippet[] = [];
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const functions = this.extractFunctions(content);
      
      for (const func of functions) {
        const snippet: CodeSnippet = {
          id: uuidv4(),
          code: func.code,
          language: 'typescript',
          metadata: {
            fileName: file.replace(srcDir, ''),
            functionName: func.name,
            description: func.description,
            tags: func.tags
          }
        };
        
        snippets.push(snippet);
      }
    }
    
    // Index in batches
    for (let i = 0; i < snippets.length; i += 50) {
      const batch = snippets.slice(i, i + 50);
      await Promise.all(batch.map(snippet => this.qdrant.indexCode(snippet)));
    }
    
    console.log(`💻 Indexed ${snippets.length} code snippets`);
  }
  
  private async indexPatterns(): Promise<void> {
    const patterns: Pattern[] = [
      {
        id: uuidv4(),
        name: 'Token Extraction Pattern',
        description: 'Extract design tokens from Figma selection',
        code: `
const tokens = await extractDesignTokens();
const validation = validateTokens(tokens);
if (validation.isValid) {
  await syncToCode(tokens);
}`,
        useCase: 'Extracting and syncing design tokens',
        tags: ['tokens', 'extraction', 'sync']
      },
      {
        id: uuidv4(),
        name: 'Component Generation Pattern',
        description: 'Generate React component from Figma node',
        code: `
const component = await componentLibraryGenerator.generate({
  framework: 'react',
  components: [selectedNode],
  options: {
    typescript: true,
    styling: 'styled-components'
  }
});`,
        useCase: 'Generating framework components from design',
        tags: ['component', 'generation', 'react']
      },
      {
        id: uuidv4(),
        name: 'Real-time Sync Pattern',
        description: 'Set up WebSocket for real-time synchronization',
        code: `
const ws = new WebSocketManager({
  url: process.env.WEBSOCKET_URL,
  reconnect: true
});

ws.on('design-update', (update) => {
  applyUpdate(update);
});`,
        useCase: 'Real-time design-to-code synchronization',
        tags: ['websocket', 'realtime', 'sync']
      },
      {
        id: uuidv4(),
        name: 'Error Handling Pattern',
        description: 'Comprehensive error handling for operations',
        code: `
try {
  const result = await operation.execute();
  figma.ui.postMessage({
    type: MessageType.SUCCESS,
    data: result
  });
} catch (error) {
  logger.error('Operation failed', { error });
  figma.ui.postMessage({
    type: MessageType.ERROR,
    data: { message: error.message }
  });
}`,
        useCase: 'Handling errors in plugin operations',
        tags: ['error', 'handling', 'logging']
      }
    ];
    
    await Promise.all(patterns.map(pattern => this.qdrant.indexPattern(pattern)));
    console.log(`🎨 Indexed ${patterns.length} design patterns`);
  }
  
  private async indexErrorSolutions(): Promise<void> {
    const errors = [
      {
        id: uuidv4(),
        error: 'Unexpected token = class field',
        solution: 'Use the custom build script that transpiles ES2022 features to ES5',
        context: 'Figma runtime only supports ES5 JavaScript',
        tags: ['syntax', 'transpilation', 'build']
      },
      {
        id: uuidv4(),
        error: 'Cannot read properties of undefined',
        solution: 'Check if the node has the property before accessing it. Use optional chaining or guard clauses.',
        context: 'Different node types have different properties',
        tags: ['runtime', 'node', 'properties']
      },
      {
        id: uuidv4(),
        error: 'Font not loaded',
        solution: 'Use figma.loadFontAsync() before modifying text properties',
        context: 'Fonts must be loaded before text manipulation',
        tags: ['font', 'text', 'async']
      }
    ];
    
    await Promise.all(errors.map(error => this.qdrant.indexError(error)));
    console.log(`🐛 Indexed ${errors.length} error solutions`);
  }
  
  // Helper methods
  private async getMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.getMarkdownFiles(fullPath));
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  private async getTypeScriptFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        files.push(...await this.getTypeScriptFiles(fullPath));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  private getDocType(path: string): 'guide' | 'api' | 'example' | 'architecture' {
    if (path.includes('/api/')) return 'api';
    if (path.includes('/examples/')) return 'example';
    if (path.includes('/architecture/')) return 'architecture';
    return 'guide';
  }
  
  private extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1] : 'Untitled';
  }
  
  private extractTags(content: string): string[] {
    const tags: string[] = [];
    
    // Extract from front matter if present
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontMatterMatch) {
      const tagsMatch = frontMatterMatch[1].match(/tags:\s*\[(.*?)\]/);
      if (tagsMatch) {
        tags.push(...tagsMatch[1].split(',').map(t => t.trim()));
      }
    }
    
    // Extract from headings
    const headings = content.match(/^##\s+(.+)$/gm);
    if (headings) {
      tags.push(...headings.map(h => h.replace(/^##\s+/, '').toLowerCase()));
    }
    
    return [...new Set(tags)];
  }
  
  private extractFunctions(code: string): Array<{
    name: string;
    code: string;
    description: string;
    tags: string[];
  }> {
    const functions: any[] = [];
    
    // Simple regex-based function extraction
    // In production, use a proper AST parser
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
    
    let match;
    while ((match = functionRegex.exec(code)) !== null) {
      const name = match[1] || match[2];
      const startIndex = match.index;
      
      // Extract function body (simplified)
      let braceCount = 0;
      let inFunction = false;
      let endIndex = startIndex;
      
      for (let i = startIndex; i < code.length; i++) {
        if (code[i] === '{') {
          braceCount++;
          inFunction = true;
        } else if (code[i] === '}') {
          braceCount--;
          if (inFunction && braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
      
      const functionCode = code.substring(startIndex, endIndex);
      
      // Extract JSDoc comment if present
      const jsdocMatch = code.substring(Math.max(0, startIndex - 500), startIndex).match(/\/\*\*([\s\S]*?)\*\/\s*$/);
      const description = jsdocMatch ? this.extractJSDocDescription(jsdocMatch[1]) : '';
      
      functions.push({
        name,
        code: functionCode,
        description,
        tags: this.extractCodeTags(functionCode)
      });
    }
    
    return functions;
  }
  
  private extractJSDocDescription(jsdoc: string): string {
    const lines = jsdoc.split('\n').map(line => line.replace(/^\s*\*\s?/, ''));
    return lines[0] || '';
  }
  
  private extractCodeTags(code: string): string[] {
    const tags: string[] = [];
    
    if (code.includes('async')) tags.push('async');
    if (code.includes('export')) tags.push('export');
    if (code.includes('figma.')) tags.push('figma-api');
    if (code.includes('MessageType')) tags.push('messaging');
    if (code.includes('token')) tags.push('tokens');
    if (code.includes('component')) tags.push('components');
    
    return tags;
  }
}

// Export singleton indexer
export const documentationIndexer = new DocumentationIndexer();