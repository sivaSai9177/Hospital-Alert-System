import { QdrantClient } from '@qdrant/js-client-rest';
import { embeddings } from '../embeddings';

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  collections: {
    documentation: string;
    code: string;
    patterns: string;
    errors: string;
  };
}

export interface SearchResult {
  id: string;
  score: number;
  payload: any;
}

export interface Document {
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

export interface CodeSnippet {
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

export interface Pattern {
  id: string;
  name: string;
  description: string;
  code: string;
  useCase: string;
  tags: string[];
}

export class QdrantService {
  private client: QdrantClient;
  private config: QdrantConfig;
  
  constructor(config: QdrantConfig) {
    this.config = config;
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey
    });
  }
  
  async initialize() {
    // Create collections if they don't exist
    await this.ensureCollections();
  }
  
  private async ensureCollections() {
    const collections = Object.values(this.config.collections);
    
    for (const collectionName of collections) {
      try {
        await this.client.getCollection(collectionName);
      } catch (error) {
        // Collection doesn't exist, create it
        await this.client.createCollection(collectionName, {
          vectors: {
            size: 1536, // OpenAI embedding size
            distance: 'Cosine'
          }
        });
      }
    }
  }
  
  // Document Management
  async indexDocument(doc: Document): Promise<void> {
    const embedding = await embeddings.generateEmbedding(
      `${doc.metadata.title} ${doc.content}`
    );
    
    await this.client.upsert(this.config.collections.documentation, {
      points: [{
        id: doc.id,
        vector: embedding,
        payload: {
          ...doc.metadata,
          content: doc.content
        }
      }]
    });
  }
  
  async searchDocuments(query: string, limit: number = 10): Promise<SearchResult[]> {
    const queryEmbedding = await embeddings.generateEmbedding(query);
    
    const result = await this.client.search(this.config.collections.documentation, {
      vector: queryEmbedding,
      limit,
      withPayload: true
    });
    
    return result.map(item => ({
      id: item.id as string,
      score: item.score,
      payload: item.payload
    }));
  }
  
  // Code Search
  async indexCode(snippet: CodeSnippet): Promise<void> {
    const embedding = await embeddings.generateEmbedding(
      `${snippet.metadata.functionName || ''} ${snippet.metadata.description || ''} ${snippet.code}`
    );
    
    await this.client.upsert(this.config.collections.code, {
      points: [{
        id: snippet.id,
        vector: embedding,
        payload: {
          ...snippet.metadata,
          code: snippet.code,
          language: snippet.language
        }
      }]
    });
  }
  
  async findSimilarCode(query: string, limit: number = 5): Promise<CodeSnippet[]> {
    const queryEmbedding = await embeddings.generateEmbedding(query);
    
    const result = await this.client.search(this.config.collections.code, {
      vector: queryEmbedding,
      limit,
      withPayload: true
    });
    
    return result.map(item => ({
      id: item.id as string,
      code: item.payload.code,
      language: item.payload.language,
      metadata: {
        fileName: item.payload.fileName,
        functionName: item.payload.functionName,
        description: item.payload.description,
        tags: item.payload.tags
      }
    }));
  }
  
  // Pattern Search
  async indexPattern(pattern: Pattern): Promise<void> {
    const embedding = await embeddings.generateEmbedding(
      `${pattern.name} ${pattern.description} ${pattern.useCase} ${pattern.code}`
    );
    
    await this.client.upsert(this.config.collections.patterns, {
      points: [{
        id: pattern.id,
        vector: embedding,
        payload: pattern
      }]
    });
  }
  
  async suggestPatterns(description: string, limit: number = 3): Promise<Pattern[]> {
    const queryEmbedding = await embeddings.generateEmbedding(description);
    
    const result = await this.client.search(this.config.collections.patterns, {
      vector: queryEmbedding,
      limit,
      withPayload: true
    });
    
    return result.map(item => item.payload as Pattern);
  }
  
  // Error Solutions
  async indexError(error: {
    id: string;
    error: string;
    solution: string;
    context?: string;
    tags?: string[];
  }): Promise<void> {
    const embedding = await embeddings.generateEmbedding(
      `${error.error} ${error.solution} ${error.context || ''}`
    );
    
    await this.client.upsert(this.config.collections.errors, {
      points: [{
        id: error.id,
        vector: embedding,
        payload: error
      }]
    });
  }
  
  async findErrorSolution(errorMessage: string): Promise<any[]> {
    const queryEmbedding = await embeddings.generateEmbedding(errorMessage);
    
    const result = await this.client.search(this.config.collections.errors, {
      vector: queryEmbedding,
      limit: 3,
      withPayload: true
    });
    
    return result.map(item => item.payload);
  }
  
  // Batch Operations
  async indexDocumentsBatch(documents: Document[]): Promise<void> {
    const points = await Promise.all(documents.map(async doc => {
      const embedding = await embeddings.generateEmbedding(
        `${doc.metadata.title} ${doc.content}`
      );
      
      return {
        id: doc.id,
        vector: embedding,
        payload: {
          ...doc.metadata,
          content: doc.content
        }
      };
    }));
    
    await this.client.upsert(this.config.collections.documentation, { points });
  }
  
  // Collection Management
  async clearCollection(collectionName: string): Promise<void> {
    await this.client.deleteCollection(collectionName);
    await this.client.createCollection(collectionName, {
      vectors: {
        size: 1536,
        distance: 'Cosine'
      }
    });
  }
  
  async getCollectionInfo(collectionName: string) {
    return await this.client.getCollection(collectionName);
  }
}

// Singleton instance
let qdrantService: QdrantService | null = null;

export function initializeQdrant(config: QdrantConfig): QdrantService {
  if (!qdrantService) {
    qdrantService = new QdrantService(config);
  }
  return qdrantService;
}

export function getQdrantService(): QdrantService {
  if (!qdrantService) {
    throw new Error('Qdrant service not initialized. Call initializeQdrant first.');
  }
  return qdrantService;
}