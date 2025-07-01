import { QdrantClient } from '@qdrant/js-client-rest';
import { CollectionManager } from './collections';
import { EmbeddingService } from './embeddings';
import { logger } from '../../lib/debug/server-logger';
import {
  DesignVector,
  DesignMetadata,
  MutationMemory,
  ComponentPattern,
  UserPreference,
  SearchResult,
  MEMORY_COLLECTIONS,
  MemoryStats,
  FrameMutation,
} from '../../types/memory';

export class MemoryService {
  private client: QdrantClient;
  private collections: CollectionManager;
  private initialized = false;

  constructor(url: string = process.env.QDRANT_URL || 'http://localhost:6333') {
    logger.memory.info('Initializing memory service', { url });
    this.client = new QdrantClient({ url });
    this.collections = new CollectionManager(this.client);
  }

  /**
   * Initialize the memory service and create collections
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.memory.debug('Creating Qdrant collections...');
      await this.collections.initializeCollections();
      this.initialized = true;
      logger.memory.info('Memory service initialized successfully');
    } catch (error) {
      logger.memory.error('Failed to initialize memory service', error);
      throw error;
    }
  }

  /**
   * Store a design pattern from a frame
   */
  async storeDesignPattern(
    frameId: string,
    frameName: string,
    metadata: DesignMetadata,
    description?: string
  ): Promise<string> {
    const id = `design_${frameId}_${Date.now()}`;
    const embedding = EmbeddingService.generateFrameEmbedding(metadata);

    const vector: DesignVector = {
      id,
      frameId,
      frameName,
      timestamp: new Date(),
      embedding,
      metadata: {
        ...metadata,
        description: description || metadata.description,
        lastUsed: new Date(),
        usageCount: 1,
      },
    };

    await this.client.upsert(MEMORY_COLLECTIONS.DESIGN_PATTERNS, {
      wait: true,
      points: [
        {
          id,
          vector: embedding,
          payload: {
            frameId: vector.frameId,
            frameName: vector.frameName,
            timestamp: vector.timestamp.getTime(),
            metadata: vector.metadata,
          },
        },
      ],
    });

    return id;
  }

  /**
   * Find similar design patterns
   */
  async findSimilarDesigns(
    frameMetadata: DesignMetadata,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<SearchResult<DesignVector>[]> {
    const embedding = EmbeddingService.generateFrameEmbedding(frameMetadata);

    const results = await this.client.search(MEMORY_COLLECTIONS.DESIGN_PATTERNS, {
      vector: embedding,
      limit,
      score_threshold: threshold,
      with_payload: true,
    });

    return results.map(result => ({
      item: {
        id: result.id as string,
        frameId: result.payload?.frameId as string,
        frameName: result.payload?.frameName as string,
        timestamp: new Date(result.payload?.timestamp as number),
        embedding: [], // Not returning the full embedding for efficiency
        metadata: result.payload?.metadata as DesignMetadata,
      },
      score: result.score || 0,
      distance: 1 - (result.score || 0), // Convert similarity to distance
    }));
  }

  /**
   * Store a mutation and its outcome
   */
  async storeMutation(
    frameId: string,
    mutations: FrameMutation[],
    beforeState: Partial<DesignMetadata>,
    afterState: Partial<DesignMetadata>,
    success: boolean,
    context?: string
  ): Promise<string> {
    const id = `mutation_${frameId}_${Date.now()}`;
    const embedding = EmbeddingService.generateMutationEmbedding(mutations);

    const mutationMemory: MutationMemory = {
      id,
      frameId,
      beforeState,
      afterState,
      mutations,
      success,
      timestamp: new Date(),
      context,
    };

    await this.client.upsert(MEMORY_COLLECTIONS.MUTATION_HISTORY, {
      wait: true,
      points: [
        {
          id,
          vector: embedding,
          payload: mutationMemory as Record<string, any>,
        },
      ],
    });

    return id;
  }

  /**
   * Find successful mutations for similar frames
   */
  async findSuccessfulMutations(
    frameMetadata: DesignMetadata,
    limit: number = 10
  ): Promise<MutationMemory[]> {
    const embedding = EmbeddingService.generateFrameEmbedding(frameMetadata);

    const results = await this.client.search(MEMORY_COLLECTIONS.MUTATION_HISTORY, {
      vector: embedding,
      limit,
      filter: {
        must: [
          {
            key: 'success',
            match: { value: true },
          },
        ],
      },
      with_payload: true,
    });

    return results
      .map(result => result.payload as MutationMemory)
      .filter(Boolean);
  }

  /**
   * Store user preference
   */
  async storeUserPreference(
    userId: string,
    category: UserPreference['category'],
    preferences: Record<string, any>
  ): Promise<void> {
    const id = `pref_${userId}_${category}`;
    
    // Create a simple embedding based on preference values
    const prefString = JSON.stringify(preferences);
    const embedding = EmbeddingService.generateTextEmbedding(prefString);

    const preference: UserPreference = {
      id,
      userId,
      category,
      preferences,
      confidence: 1.0,
      lastUpdated: new Date(),
    };

    await this.client.upsert(MEMORY_COLLECTIONS.USER_PREFERENCES, {
      wait: true,
      points: [
        {
          id,
          vector: embedding,
          payload: preference as Record<string, any>,
        },
      ],
    });
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreference[]> {
    const results = await this.client.scroll(MEMORY_COLLECTIONS.USER_PREFERENCES, {
      filter: {
        must: [
          {
            key: 'userId',
            match: { value: userId },
          },
        ],
      },
      with_payload: true,
      limit: 100,
    });

    return (results as any).points
      .map((point: any) => point.payload as UserPreference)
      .filter(Boolean);
  }

  /**
   * Search designs by text description
   */
  async searchByDescription(
    query: string,
    limit: number = 10
  ): Promise<SearchResult<DesignVector>[]> {
    const embedding = EmbeddingService.generateTextEmbedding(query);

    const results = await this.client.search(MEMORY_COLLECTIONS.DESIGN_PATTERNS, {
      vector: embedding,
      limit,
      with_payload: true,
    });

    return results.map(result => ({
      item: {
        id: result.id as string,
        frameId: result.payload?.frameId as string,
        frameName: result.payload?.frameName as string,
        timestamp: new Date(result.payload?.timestamp as number),
        embedding: [],
        metadata: result.payload?.metadata as DesignMetadata,
      },
      score: result.score || 0,
      distance: 1 - (result.score || 0),
    }));
  }

  /**
   * Update usage statistics for a design
   */
  async updateDesignUsage(designId: string): Promise<void> {
    try {
      // First get the current design
      const points = await this.client.retrieve(MEMORY_COLLECTIONS.DESIGN_PATTERNS, {
        ids: [designId],
        with_payload: true,
      });

      if (points.length === 0) return;

      const payload = points[0].payload as any;
      if (!payload?.metadata) return;

      // Update usage stats
      payload.metadata.usageCount = (payload.metadata.usageCount || 0) + 1;
      payload.metadata.lastUsed = new Date();

      // Update the point
      await this.client.setPayload(MEMORY_COLLECTIONS.DESIGN_PATTERNS, {
        payload: {
          metadata: payload.metadata,
        },
        points: [designId],
      });
    } catch (error) {
      console.error('Error updating design usage:', error);
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<MemoryStats> {
    const collectionNames = Object.values(MEMORY_COLLECTIONS);
    const collections = await Promise.all(
      collectionNames.map(async name => {
        try {
          const stats = await this.collections.getCollectionStats(name);
          return {
            name,
            count: stats.pointsCount,
            lastUpdated: new Date(), // Would need to track this separately
          };
        } catch (error) {
          return {
            name,
            count: 0,
            lastUpdated: new Date(),
          };
        }
      })
    );

    const totalVectors = collections.reduce((sum, col) => sum + col.count, 0);

    return {
      totalVectors,
      collections,
      storageUsed: 0, // Would need to calculate based on vector dimensions
      indexingStatus: 'ready',
    };
  }

  /**
   * Clear all memory (use with caution!)
   */
  async clearAllMemory(): Promise<void> {
    const collections = Object.values(MEMORY_COLLECTIONS);
    for (const collection of collections) {
      await this.collections.clearCollection(collection);
    }
  }

  /**
   * Export memory to JSON (for backup)
   */
  async exportMemory(): Promise<Record<string, any[]>> {
    const exported: Record<string, any[]> = {};
    
    const collections = Object.values(MEMORY_COLLECTIONS);
    for (const collection of collections) {
      try {
        const result = await this.client.scroll(collection, {
          with_payload: true,
          with_vector: true,
          limit: 10000,
        });
        exported[collection] = result.points;
      } catch (error) {
        console.error(`Error exporting collection ${collection}:`, error);
        exported[collection] = [];
      }
    }

    return exported;
  }
}

// Singleton instance
let memoryService: MemoryService | null = null;

export function getMemoryService(): MemoryService {
  if (!memoryService) {
    memoryService = new MemoryService();
  }
  return memoryService;
}