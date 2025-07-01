export interface EmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

export class OpenAIEmbeddings implements EmbeddingService {
  private apiKey: string;
  private model: string = 'text-embedding-ada-002';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: this.model
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  }
  
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: texts,
        model: this.model
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data.map((item: any) => item.embedding);
  }
}

// Mock embedding service for development/testing
export class MockEmbeddings implements EmbeddingService {
  async generateEmbedding(text: string): Promise<number[]> {
    // Generate a deterministic fake embedding based on text
    const embedding = new Array(1536).fill(0);
    for (let i = 0; i < text.length && i < embedding.length; i++) {
      embedding[i] = text.charCodeAt(i) / 255;
    }
    return embedding;
  }
  
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }
}

// Local embedding service using a lightweight model
export class LocalEmbeddings implements EmbeddingService {
  private cache: Map<string, number[]> = new Map();
  
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    if (this.cache.has(text)) {
      return this.cache.get(text)!;
    }
    
    // Simple TF-IDF-like embedding (for demo purposes)
    // In production, use a real embedding model
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(1536).fill(0);
    
    // Simple word hashing to create embedding
    words.forEach((word, idx) => {
      const hash = this.hashString(word);
      const position = hash % embedding.length;
      embedding[position] += 1 / (idx + 1); // TF-IDF-like weighting
    });
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    this.cache.set(text, embedding);
    return embedding;
  }
  
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

// Factory function to create appropriate embedding service
export function createEmbeddingService(type: 'openai' | 'mock' | 'local', apiKey?: string): EmbeddingService {
  switch (type) {
    case 'openai':
      if (!apiKey) {
        throw new Error('OpenAI API key required');
      }
      return new OpenAIEmbeddings(apiKey);
    case 'mock':
      return new MockEmbeddings();
    case 'local':
      return new LocalEmbeddings();
    default:
      return new LocalEmbeddings();
  }
}

// Export singleton instance
export const embeddings = createEmbeddingService(
  process.env.OPENAI_API_KEY ? 'openai' : 'local',
  process.env.OPENAI_API_KEY
);