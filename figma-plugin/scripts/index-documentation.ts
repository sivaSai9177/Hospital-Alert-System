#!/usr/bin/env bun

import { initializeQdrant, QdrantConfig } from '../src/services/qdrant';
import { documentationIndexer } from '../src/services/qdrant/indexer';
import { resolve } from 'path';

async function main() {
  console.log('🚀 Starting documentation indexing...\n');
  
  // Initialize Qdrant
  const config: QdrantConfig = {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
    collections: {
      documentation: 'figma_plugin_docs',
      code: 'figma_plugin_code',
      patterns: 'figma_plugin_patterns',
      errors: 'figma_plugin_errors'
    }
  };
  
  const qdrant = initializeQdrant(config);
  await qdrant.initialize();
  
  console.log('✅ Qdrant initialized\n');
  
  // Index all documentation
  const projectRoot = resolve(__dirname, '..');
  await documentationIndexer.indexAllDocumentation(projectRoot);
  
  console.log('\n🎉 Documentation indexing complete!');
  
  // Show collection statistics
  console.log('\n📊 Collection Statistics:');
  for (const [name, collectionName] of Object.entries(config.collections)) {
    try {
      const info = await qdrant.getCollectionInfo(collectionName);
      console.log(`  ${name}: ${info.points_count} items indexed`);
    } catch (error) {
      console.log(`  ${name}: Error getting info`);
    }
  }
}

// Run the indexer
main().catch(console.error);