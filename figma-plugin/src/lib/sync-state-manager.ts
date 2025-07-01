/**
 * Sync State Manager
 * Manages operation state and resumable sync operations
 */

import { figmaLogger, logger } from './figma-logger';

export type OperationType = 
  | 'token-extraction'
  | 'token-sync'
  | 'design-generation'
  | 'component-generation'
  | 'spacing-generation'
  | 'typography-generation'
  | 'documentation-export'
  | 'batch-mutation'
  | 'component-import';

export interface OperationState {
  id: string;
  type: OperationType;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress: number;
  data: any;
  checkpoint?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperationCheckpoint {
  step: string;
  data: any;
  timestamp: Date;
}

class SyncStateManager {
  private operations: Map<string, OperationState> = new Map();
  private stateKey = 'figma-sync-state';
  private checkpointKey = 'figma-sync-checkpoints';

  constructor() {
    this.loadState();
  }

  /**
   * Load persisted state
   */
  private async loadState() {
    try {
      const savedState = await figma.clientStorage.getAsync(this.stateKey);
      if (savedState && typeof savedState === 'object') {
        Object.entries(savedState).forEach(([id, state]: [string, any]) => {
          this.operations.set(id, {
            ...state,
            createdAt: new Date(state.createdAt),
            updatedAt: new Date(state.updatedAt)
          });
        });
      }
    } catch (error) {
      logger.error('Failed to load sync state', error);
    }
  }

  /**
   * Save state to storage
   */
  private async saveState() {
    try {
      const stateObject: Record<string, OperationState> = {};
      this.operations.forEach((state, id) => {
        stateObject[id] = state;
      });
      await figma.clientStorage.setAsync(this.stateKey, stateObject);
    } catch (error) {
      logger.error('Failed to save sync state', error);
    }
  }

  /**
   * Create a new operation
   */
  createOperation(type: OperationType, data: any): string {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const operation: OperationState = {
      id,
      type,
      status: 'pending',
      progress: 0,
      data,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.operations.set(id, operation);
    figmaLogger.startOperation(id, type, { data });
    this.saveState();

    return id;
  }

  /**
   * Start an operation
   */
  startOperation(operationId: string) {
    const operation = this.operations.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    operation.status = 'running';
    operation.updatedAt = new Date();
    
    logger.sync.info(`Starting operation: ${operation.type}`, { operationId });
    this.saveState();
  }

  /**
   * Update operation progress
   */
  updateProgress(operationId: string, progress: number, checkpoint?: any) {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.progress = progress;
    operation.updatedAt = new Date();
    
    if (checkpoint) {
      operation.checkpoint = checkpoint;
      this.saveCheckpoint(operationId, checkpoint);
    }

    figmaLogger.updateProgress(operationId, progress);
    this.saveState();
  }

  /**
   * Save operation checkpoint
   */
  private async saveCheckpoint(operationId: string, checkpoint: any) {
    try {
      const checkpoints = await figma.clientStorage.getAsync(this.checkpointKey) || {};
      checkpoints[operationId] = {
        ...checkpoint,
        timestamp: new Date()
      };
      await figma.clientStorage.setAsync(this.checkpointKey, checkpoints);
    } catch (error) {
      logger.error('Failed to save checkpoint', error);
    }
  }

  /**
   * Get operation checkpoint
   */
  async getCheckpoint(operationId: string): Promise<any> {
    try {
      const checkpoints = await figma.clientStorage.getAsync(this.checkpointKey) || {};
      return checkpoints[operationId];
    } catch (error) {
      logger.error('Failed to get checkpoint', error);
      return null;
    }
  }

  /**
   * Pause an operation
   */
  pauseOperation(operationId: string, checkpoint?: any) {
    const operation = this.operations.get(operationId);
    if (!operation || operation.status !== 'running') return;

    operation.status = 'paused';
    operation.updatedAt = new Date();
    
    if (checkpoint) {
      operation.checkpoint = checkpoint;
      this.saveCheckpoint(operationId, checkpoint);
    }

    figmaLogger.pauseOperation(operationId);
    this.saveState();
  }

  /**
   * Resume an operation
   */
  async resumeOperation(operationId: string): Promise<OperationState | null> {
    const operation = this.operations.get(operationId);
    if (!operation || operation.status !== 'paused') return null;

    operation.status = 'running';
    operation.updatedAt = new Date();

    // Load checkpoint if available
    const checkpoint = await this.getCheckpoint(operationId);
    if (checkpoint) {
      operation.checkpoint = checkpoint;
    }

    figmaLogger.resumeOperation(operationId);
    this.saveState();

    return operation;
  }

  /**
   * Complete an operation
   */
  completeOperation(operationId: string, result?: any) {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.status = 'completed';
    operation.progress = 100;
    operation.updatedAt = new Date();
    
    if (result) {
      operation.data = { ...operation.data, result };
    }

    figmaLogger.completeOperation(operationId, result);
    this.saveState();
    
    // Clean up checkpoint
    this.removeCheckpoint(operationId);
  }

  /**
   * Fail an operation
   */
  failOperation(operationId: string, error: Error | string) {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.status = 'failed';
    operation.error = error instanceof Error ? error.message : error;
    operation.updatedAt = new Date();

    figmaLogger.failOperation(operationId, error);
    this.saveState();
  }

  /**
   * Remove checkpoint
   */
  private async removeCheckpoint(operationId: string) {
    try {
      const checkpoints = await figma.clientStorage.getAsync(this.checkpointKey) || {};
      delete checkpoints[operationId];
      await figma.clientStorage.setAsync(this.checkpointKey, checkpoints);
    } catch (error) {
      logger.error('Failed to remove checkpoint', error);
    }
  }

  /**
   * Get operation state
   */
  getOperation(operationId: string): OperationState | undefined {
    return this.operations.get(operationId);
  }

  /**
   * Get operations by type
   */
  getOperationsByType(type: OperationType): OperationState[] {
    return Array.from(this.operations.values()).filter(op => op.type === type);
  }

  /**
   * Get resumable operations
   */
  getResumableOperations(): OperationState[] {
    return Array.from(this.operations.values()).filter(
      op => op.status === 'paused'
    );
  }

  /**
   * Get running operations
   */
  getRunningOperations(): OperationState[] {
    return Array.from(this.operations.values()).filter(
      op => op.status === 'running'
    );
  }

  /**
   * Check if operation can be resumed
   */
  canResume(operationId: string): boolean {
    const operation = this.operations.get(operationId);
    return operation !== undefined && operation.status === 'paused';
  }

  /**
   * Clear completed operations older than specified days
   */
  clearOldOperations(daysOld: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const toRemove: string[] = [];
    this.operations.forEach((op, id) => {
      if (
        (op.status === 'completed' || op.status === 'failed') &&
        op.updatedAt < cutoffDate
      ) {
        toRemove.push(id);
      }
    });

    toRemove.forEach(id => {
      this.operations.delete(id);
      this.removeCheckpoint(id);
    });

    if (toRemove.length > 0) {
      this.saveState();
      logger.sync.info(`Cleared ${toRemove.length} old operations`);
    }
  }

  /**
   * Get operation summary
   */
  getOperationSummary(): {
    total: number;
    running: number;
    paused: number;
    completed: number;
    failed: number;
  } {
    const summary = {
      total: this.operations.size,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0
    };

    this.operations.forEach(op => {
      summary[op.status]++;
    });

    return summary;
  }
}

// Export singleton instance
export const syncStateManager = new SyncStateManager();