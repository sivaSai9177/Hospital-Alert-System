/**
 * Operation Queue System
 * Manages queued operations with priority levels and concurrency control
 */

import { syncStateManager, OperationType } from './sync-state-manager';
import { logger } from './figma-logger';

export type OperationPriority = 'low' | 'normal' | 'high' | 'critical';

export interface QueuedOperation {
  id: string;
  type: OperationType;
  priority: OperationPriority;
  handler: () => Promise<any>;
  data?: any;
  retries: number;
  maxRetries: number;
  createdAt: Date;
  dependencies?: string[];
  onProgress?: (progress: number) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

interface QueueConfig {
  maxConcurrent: number;
  retryDelay: number;
  priorityWeights: Record<OperationPriority, number>;
}

class OperationQueue {
  private queue: QueuedOperation[] = [];
  private running: Map<string, QueuedOperation> = new Map();
  private completed: Set<string> = new Set();
  private config: QueueConfig = {
    maxConcurrent: 3,
    retryDelay: 1000,
    priorityWeights: {
      critical: 1000,
      high: 100,
      normal: 10,
      low: 1
    }
  };
  private isPaused = false;
  private queueKey = 'figma-operation-queue';

  constructor() {
    this.loadQueue();
  }

  /**
   * Load persisted queue
   */
  private async loadQueue() {
    try {
      const savedQueue = await figma.clientStorage.getAsync(this.queueKey);
      if (savedQueue && Array.isArray(savedQueue)) {
        // Note: We can't persist handlers, so we'll need to re-register them
        this.queue = savedQueue.map(op => ({
          ...op,
          createdAt: new Date(op.createdAt),
          handler: () => Promise.resolve() // Placeholder
        }));
      }
    } catch (error) {
      logger.error('Failed to load operation queue', error);
    }
  }

  /**
   * Save queue state
   */
  private async saveQueue() {
    try {
      // Save queue without handlers
      const queueData = this.queue.map(({ handler, onProgress, onComplete, onError, ...op }) => op);
      await figma.clientStorage.setAsync(this.queueKey, queueData);
    } catch (error) {
      logger.error('Failed to save operation queue', error);
    }
  }

  /**
   * Add operation to queue
   */
  async addOperation(
    type: OperationType,
    handler: () => Promise<any>,
    options: {
      priority?: OperationPriority;
      data?: any;
      dependencies?: string[];
      maxRetries?: number;
      onProgress?: (progress: number) => void;
      onComplete?: (result: any) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<string> {
    const id = syncStateManager.createOperation(type, options.data);
    
    const operation: QueuedOperation = {
      id,
      type,
      priority: options.priority || 'normal',
      handler,
      data: options.data,
      retries: 0,
      maxRetries: options.maxRetries || 3,
      createdAt: new Date(),
      dependencies: options.dependencies,
      onProgress: options.onProgress,
      onComplete: options.onComplete,
      onError: options.onError
    };

    this.queue.push(operation);
    this.sortQueue();
    await this.saveQueue();

    logger.sync.info(`Added operation to queue`, { 
      id, 
      type, 
      priority: operation.priority,
      queueLength: this.queue.length 
    });

    // Process queue if not paused
    if (!this.isPaused) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Sort queue by priority and dependencies
   */
  private sortQueue() {
    this.queue.sort((a, b) => {
      // Check dependencies first
      if (a.dependencies?.includes(b.id)) return 1;
      if (b.dependencies?.includes(a.id)) return -1;

      // Sort by priority weight
      const weightA = this.config.priorityWeights[a.priority];
      const weightB = this.config.priorityWeights[b.priority];
      
      if (weightA !== weightB) {
        return weightB - weightA;
      }

      // Sort by creation time (FIFO for same priority)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Process the queue
   */
  private async processQueue() {
    if (this.isPaused) return;

    while (
      this.running.size < this.config.maxConcurrent && 
      this.queue.length > 0
    ) {
      const operation = this.getNextOperation();
      if (!operation) break;

      this.runOperation(operation);
    }
  }

  /**
   * Get next operation that can run
   */
  private getNextOperation(): QueuedOperation | null {
    for (let i = 0; i < this.queue.length; i++) {
      const operation = this.queue[i];
      
      // Check if dependencies are satisfied
      if (this.areDependenciesSatisfied(operation)) {
        this.queue.splice(i, 1);
        return operation;
      }
    }
    return null;
  }

  /**
   * Check if operation dependencies are satisfied
   */
  private areDependenciesSatisfied(operation: QueuedOperation): boolean {
    if (!operation.dependencies || operation.dependencies.length === 0) {
      return true;
    }

    return operation.dependencies.every(depId => 
      this.completed.has(depId) || 
      syncStateManager.getOperation(depId)?.status === 'completed'
    );
  }

  /**
   * Run an operation
   */
  private async runOperation(operation: QueuedOperation) {
    this.running.set(operation.id, operation);
    syncStateManager.startOperation(operation.id);

    try {
      logger.sync.info(`Running operation`, { 
        id: operation.id, 
        type: operation.type 
      });

      // Create progress tracker
      const progressTracker = (progress: number) => {
        syncStateManager.updateProgress(operation.id, progress);
        operation.onProgress?.(progress);
      };

      // Inject progress tracker into handler context
      const result = await operation.handler.call({ 
        updateProgress: progressTracker,
        operationId: operation.id 
      });

      // Operation completed successfully
      syncStateManager.completeOperation(operation.id, result);
      this.completed.add(operation.id);
      operation.onComplete?.(result);

      logger.sync.success(`Operation completed`, { 
        id: operation.id, 
        type: operation.type 
      });
    } catch (error) {
      logger.sync.error(`Operation failed`, { 
        id: operation.id, 
        type: operation.type,
        error 
      });

      // Handle retry logic
      if (operation.retries < operation.maxRetries) {
        operation.retries++;
        logger.sync.info(`Retrying operation`, { 
          id: operation.id, 
          attempt: operation.retries 
        });

        // Re-queue with delay
        setTimeout(() => {
          this.queue.unshift(operation);
          this.processQueue();
        }, this.config.retryDelay * operation.retries);
      } else {
        // Max retries reached
        syncStateManager.failOperation(operation.id, error as Error);
        operation.onError?.(error as Error);
      }
    } finally {
      this.running.delete(operation.id);
      await this.saveQueue();
      
      // Process next operations
      if (!this.isPaused) {
        this.processQueue();
      }
    }
  }

  /**
   * Pause the queue
   */
  pauseQueue() {
    this.isPaused = true;
    logger.sync.info('Operation queue paused');

    // Pause all running operations
    this.running.forEach(operation => {
      syncStateManager.pauseOperation(operation.id);
    });
  }

  /**
   * Resume the queue
   */
  async resumeQueue() {
    this.isPaused = false;
    logger.sync.info('Operation queue resumed');

    // Resume paused operations
    const resumable = syncStateManager.getResumableOperations();
    for (const op of resumable) {
      const queuedOp = Array.from(this.running.values()).find(
        running => running.id === op.id
      );
      
      if (queuedOp) {
        await syncStateManager.resumeOperation(op.id);
      }
    }

    // Process queue
    this.processQueue();
  }

  /**
   * Cancel an operation
   */
  cancelOperation(operationId: string): boolean {
    // Remove from queue if pending
    const queueIndex = this.queue.findIndex(op => op.id === operationId);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
      syncStateManager.failOperation(operationId, 'Cancelled by user');
      return true;
    }

    // Cancel if running
    if (this.running.has(operationId)) {
      syncStateManager.failOperation(operationId, 'Cancelled by user');
      this.running.delete(operationId);
      return true;
    }

    return false;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    queued: number;
    running: number;
    completed: number;
    paused: boolean;
    operations: {
      id: string;
      type: OperationType;
      priority: OperationPriority;
      status: string;
      progress: number;
    }[];
  } {
    const operations = [
      ...this.queue.map(op => ({
        id: op.id,
        type: op.type,
        priority: op.priority,
        status: 'queued' as const,
        progress: 0
      })),
      ...Array.from(this.running.values()).map(op => {
        const state = syncStateManager.getOperation(op.id);
        return {
          id: op.id,
          type: op.type,
          priority: op.priority,
          status: state?.status || 'running',
          progress: state?.progress || 0
        };
      })
    ];

    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: this.completed.size,
      paused: this.isPaused,
      operations
    };
  }

  /**
   * Clear completed operations
   */
  clearCompleted() {
    this.completed.clear();
    syncStateManager.clearOldOperations(0);
    logger.sync.info('Cleared completed operations');
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QueueConfig>) {
    this.config = { ...this.config, ...config };
    logger.sync.info('Updated queue configuration', config);
  }
}

// Export singleton instance
export const operationQueue = new OperationQueue();