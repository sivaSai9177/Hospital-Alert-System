import { QdrantClient } from '@qdrant/js-client-rest';
import { MEMORY_COLLECTIONS } from '../../types/memory';

export class CollectionManager {
  private client: QdrantClient;

  constructor(client: QdrantClient) {
    this.client = client;
  }

  /**
   * Initialize all collections for the Design Agent
   */
  async initializeCollections(): Promise<void> {
    const collections = [
      {
        name: MEMORY_COLLECTIONS.DESIGN_PATTERNS,
        vectorSize: 384,
        description: 'Frame layouts and design patterns',
      },
      {
        name: MEMORY_COLLECTIONS.COMPONENT_MEMORY,
        vectorSize: 384,
        description: 'Component properties and usage patterns',
      },
      {
        name: MEMORY_COLLECTIONS.USER_PREFERENCES,
        vectorSize: 384,
        description: 'User design preferences and style choices',
      },
      {
        name: MEMORY_COLLECTIONS.MUTATION_HISTORY,
        vectorSize: 384,
        description: 'History of frame mutations and their outcomes',
      },
      {
        name: MEMORY_COLLECTIONS.TOKEN_USAGE,
        vectorSize: 384,
        description: 'Design token usage patterns and combinations',
      },
    ];

    for (const collection of collections) {
      await this.createCollectionIfNotExists(collection);
    }
  }

  /**
   * Create a collection if it doesn't exist
   */
  private async createCollectionIfNotExists(config: {
    name: string;
    vectorSize: number;
    description: string;
  }): Promise<void> {
    try {
      // Check if collection exists
      await this.client.getCollection(config.name);
      console.log(`Collection ${config.name} already exists`);
    } catch (error) {
      // Collection doesn't exist, create it
      console.log(`Creating collection ${config.name}...`);
      
      await this.client.createCollection(config.name, {
        vectors: {
          size: config.vectorSize,
          distance: 'Cosine', // Best for normalized vectors
        },
        optimizers_config: {
          default_segment_number: 2,
          indexing_threshold: 20000,
        },
        replication_factor: 1,
      });

      // Create indexes for common filters
      await this.createIndexes(config.name);
      
      console.log(`Collection ${config.name} created successfully`);
    }
  }

  /**
   * Create indexes for efficient filtering
   */
  private async createIndexes(collectionName: string): Promise<void> {
    const indexes = [
      { field: 'frameId', type: 'keyword' },
      { field: 'userId', type: 'keyword' },
      { field: 'projectId', type: 'keyword' },
      { field: 'category', type: 'keyword' },
      { field: 'componentType', type: 'keyword' },
      { field: 'timestamp', type: 'integer' },
      { field: 'usageCount', type: 'integer' },
      { field: 'successRate', type: 'float' },
    ];

    for (const index of indexes) {
      try {
        await this.client.createPayloadIndex(collectionName, {
          field_name: index.field,
          field_schema: index.type as any,
        });
      } catch (error) {
        // Index might already exist or field might not be applicable
        console.log(`Index ${index.field} on ${collectionName}: ${(error as any).message}`);
      }
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionName: string): Promise<{
    vectorCount: number;
    indexedVectorCount: number;
    pointsCount: number;
    segmentsCount: number;
  }> {
    const info = await this.client.getCollection(collectionName);
    
    return {
      vectorCount: info.vectors_count || 0,
      indexedVectorCount: info.indexed_vectors_count || 0,
      pointsCount: info.points_count || 0,
      segmentsCount: info.segments_count || 0,
    };
  }

  /**
   * Clear a collection (delete all points)
   */
  async clearCollection(collectionName: string): Promise<void> {
    try {
      await this.client.delete(collectionName, {
        wait: true,
        filter: {}, // Empty filter matches all
      });
      console.log(`Collection ${collectionName} cleared`);
    } catch (error) {
      console.error(`Error clearing collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a collection entirely
   */
  async deleteCollection(collectionName: string): Promise<void> {
    try {
      await this.client.deleteCollection(collectionName);
      console.log(`Collection ${collectionName} deleted`);
    } catch (error) {
      console.error(`Error deleting collection ${collectionName}:`, error);
      throw error;
    }
  }
}