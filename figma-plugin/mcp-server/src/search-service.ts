import { QdrantClient } from '@qdrant/js-client-rest';

export class SearchService {
  private client: QdrantClient;
  private collections = {
    documentation: 'figma_plugin_docs',
    code: 'figma_plugin_code',
    patterns: 'figma_plugin_patterns',
    errors: 'figma_plugin_errors'
  };
  
  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY
    });
  }
  
  async search(query: string, type: string = 'all'): Promise<any[]> {
    const embedding = this.generateEmbedding(query);
    
    switch (type) {
      case 'all':
        return this.searchAll(query, embedding);
      case 'documentation':
        return this.searchCollection(this.collections.documentation, embedding, 10);
      case 'code':
        return this.searchCollection(this.collections.code, embedding, 5);
      case 'pattern':
        return this.searchCollection(this.collections.patterns, embedding, 3);
      case 'error':
        return this.searchCollection(this.collections.errors, embedding, 3);
      default:
        return this.searchAll(query, embedding);
    }
  }
  
  private async searchAll(query: string, embedding: number[]): Promise<any[]> {
    const [docs, code, patterns, errors] = await Promise.all([
      this.searchCollection(this.collections.documentation, embedding, 3),
      this.searchCollection(this.collections.code, embedding, 3),
      this.searchCollection(this.collections.patterns, embedding, 2),
      this.searchCollection(this.collections.errors, embedding, 2)
    ]);
    
    return [...docs, ...code, ...patterns, ...errors]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }
  
  private async searchCollection(collection: string, embedding: number[], limit: number): Promise<any[]> {
    try {
      const results = await this.client.search(collection, {
        vector: embedding,
        limit,
        withPayload: true
      });
      
      return results.map(result => ({
        id: result.id,
        score: result.score,
        type: this.getTypeFromCollection(collection),
        ...result.payload
      }));
    } catch (error) {
      console.error(`Error searching ${collection}:`, error);
      return [];
    }
  }
  
  private getTypeFromCollection(collection: string): string {
    switch (collection) {
      case this.collections.documentation:
        return 'documentation';
      case this.collections.code:
        return 'code';
      case this.collections.patterns:
        return 'pattern';
      case this.collections.errors:
        return 'error';
      default:
        return 'unknown';
    }
  }
  
  // Simple embedding generation (same as indexer for consistency)
  private generateEmbedding(text: string): number[] {
    const embedding = new Array(1536).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach((word, idx) => {
      const hash = this.hashString(word);
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
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

export const searchService = new SearchService();