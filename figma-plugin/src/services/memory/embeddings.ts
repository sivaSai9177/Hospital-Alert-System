import { DesignMetadata, FrameMutation } from '../../types/memory';

/**
 * Generate embeddings for design elements
 * In production, this would use an actual embedding model (OpenAI, Cohere, etc.)
 * For now, we create deterministic embeddings based on design properties
 */
export class EmbeddingService {
  private static readonly VECTOR_SIZE = 384; // Small but effective size

  /**
   * Generate embedding for a frame's design properties
   */
  static generateFrameEmbedding(metadata: DesignMetadata): number[] {
    const features: number[] = [];

    // Layout features (0-49)
    features.push(...this.encodeLayout(metadata));
    
    // Size features (50-99)
    features.push(...this.encodeSize(metadata.width, metadata.height));
    
    // Color features (100-149)
    features.push(...this.encodeColors(metadata.colors));
    
    // Typography features (150-199)
    features.push(...this.encodeTypography(metadata.typography));
    
    // Spacing features (200-249)
    features.push(...this.encodeSpacing(metadata.spacing));
    
    // Effects features (250-299)
    features.push(...this.encodeEffects(metadata.effects));
    
    // Semantic features (300-383)
    features.push(...this.encodeSemantic(metadata.description, metadata.tags));

    // Normalize to unit vector
    return this.normalize(features);
  }

  /**
   * Generate embedding for a text description
   */
  static generateTextEmbedding(text: string): number[] {
    // Simple text embedding based on character frequencies and patterns
    const words = text.toLowerCase().split(/\s+/);
    const features = new Array(this.VECTOR_SIZE).fill(0);

    // Word-based features
    words.forEach((word, idx) => {
      const hash = this.hashString(word);
      const position = hash % this.VECTOR_SIZE;
      features[position] += 1 / (idx + 1); // Position-weighted
    });

    // Character n-gram features
    for (let i = 0; i < text.length - 2; i++) {
      const trigram = text.slice(i, i + 3);
      const hash = this.hashString(trigram);
      const position = hash % this.VECTOR_SIZE;
      features[position] += 0.5;
    }

    return this.normalize(features);
  }

  /**
   * Generate embedding for mutations
   */
  static generateMutationEmbedding(mutations: FrameMutation[]): number[] {
    const features = new Array(this.VECTOR_SIZE).fill(0);

    mutations.forEach((mutation, idx) => {
      const propertyHash = this.hashString(mutation.property);
      const position = propertyHash % this.VECTOR_SIZE;
      
      // Encode the type of change
      const changeType = this.getChangeType(mutation.oldValue, mutation.newValue);
      features[position] += changeType;
      
      // Encode magnitude of change if numeric
      if (typeof mutation.newValue === 'number' && typeof mutation.oldValue === 'number') {
        const magnitude = Math.abs(mutation.newValue - mutation.oldValue);
        features[(position + 1) % this.VECTOR_SIZE] += Math.log1p(magnitude);
      }
    });

    return this.normalize(features);
  }

  /**
   * Calculate similarity between two embeddings
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // Private helper methods

  private static encodeLayout(metadata: DesignMetadata): number[] {
    const features = new Array(50).fill(0);
    
    // Layout mode encoding
    if (metadata.layoutMode === 'HORIZONTAL') features[0] = 1;
    else if (metadata.layoutMode === 'VERTICAL') features[1] = 1;
    else features[2] = 1; // NONE

    // Sizing mode encoding
    if (metadata.primaryAxisSizingMode === 'AUTO') features[3] = 1;
    if (metadata.counterAxisSizingMode === 'AUTO') features[4] = 1;

    return features;
  }

  private static encodeSize(width: number, height: number): number[] {
    const features = new Array(50).fill(0);
    
    // Normalized dimensions
    features[0] = Math.log1p(width) / 10;
    features[1] = Math.log1p(height) / 10;
    
    // Aspect ratio
    features[2] = width / (height || 1);
    
    // Size categories
    const area = width * height;
    features[3] = Math.log1p(area) / 20;
    
    // Common size detection
    if (width === 375 && height === 812) features[10] = 1; // iPhone X
    if (width === 1920 && height === 1080) features[11] = 1; // Desktop
    if (width === 320 || width === 375 || width === 414) features[12] = 1; // Mobile widths

    return features;
  }

  private static encodeColors(colors: string[]): number[] {
    const features = new Array(50).fill(0);
    
    colors.forEach((color, idx) => {
      if (idx < 10) {
        const hash = this.hashString(color);
        features[idx * 5] = (hash % 256) / 256;
      }
    });

    // Color diversity
    features[45] = Math.min(colors.length / 10, 1);
    
    return features;
  }

  private static encodeTypography(typography: string[]): number[] {
    const features = new Array(50).fill(0);
    
    typography.forEach((font, idx) => {
      if (idx < 5) {
        const hash = this.hashString(font);
        features[idx * 10] = (hash % 256) / 256;
      }
    });

    // Typography variety
    features[45] = Math.min(typography.length / 5, 1);
    
    return features;
  }

  private static encodeSpacing(spacing: number[]): number[] {
    const features = new Array(50).fill(0);
    
    if (spacing.length > 0) {
      // Statistical features
      features[0] = Math.min(...spacing) / 100;
      features[1] = Math.max(...spacing) / 100;
      features[2] = spacing.reduce((a, b) => a + b, 0) / spacing.length / 100;
      
      // Common spacing values
      if (spacing.includes(8)) features[10] = 1;
      if (spacing.includes(16)) features[11] = 1;
      if (spacing.includes(24)) features[12] = 1;
      if (spacing.includes(32)) features[13] = 1;
    }

    return features;
  }

  private static encodeEffects(effects: string[]): number[] {
    const features = new Array(50).fill(0);
    
    effects.forEach((effect, idx) => {
      if (idx < 10) {
        const hash = this.hashString(effect);
        features[idx * 5] = (hash % 256) / 256;
      }
    });

    return features;
  }

  private static encodeSemantic(description?: string, tags?: string[]): number[] {
    const features = new Array(84).fill(0);
    
    // Description features
    if (description) {
      const words = description.toLowerCase().split(/\s+/);
      words.forEach((word, idx) => {
        if (idx < 10) {
          const hash = this.hashString(word);
          features[idx * 4] = (hash % 256) / 256;
        }
      });
    }

    // Tag features
    if (tags) {
      tags.forEach((tag, idx) => {
        if (idx < 10) {
          const hash = this.hashString(tag);
          features[40 + idx * 4] = (hash % 256) / 256;
        }
      });
    }

    return features;
  }

  private static normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
  }

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private static getChangeType(oldValue: any, newValue: any): number {
    if (oldValue === newValue) return 0;
    if (oldValue === undefined || oldValue === null) return 1; // Addition
    if (newValue === undefined || newValue === null) return -1; // Deletion
    return 0.5; // Modification
  }
}