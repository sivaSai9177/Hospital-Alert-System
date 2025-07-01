/**
 * Enhanced Figma Plugin Logger with pause/resume support
 * Extends server logger to add Figma-specific features
 */

import { serverLogger, LogLevel, LogCategory as BaseLogCategory } from './debug/server-logger';
import { MessageType } from '../types/messages';

// Extend log categories for Figma-specific operations
export type FigmaLogCategory = BaseLogCategory | 'SYNC' | 'GENERATION' | 'EXTRACTION' | 'MUTATION' | 'TOKEN' | 'COMPONENT' | 'AGENT' | 'OPERATION';

interface OperationLog {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  logs: any[];
  progress: number;
  metadata?: Record<string, any>;
}

class FigmaLogger {
  private operations: Map<string, OperationLog> = new Map();
  private operationsKey = 'figma-plugin-operations';

  constructor() {
    this.loadPersistedOperations();
  }

  /**
   * Load persisted operations from storage
   */
  private async loadPersistedOperations() {
    try {
      const savedOps = await figma.clientStorage.getAsync(this.operationsKey);
      if (savedOps && typeof savedOps === 'object') {
        Object.entries(savedOps).forEach(([id, op]: [string, any]) => {
          this.operations.set(id, {
            ...op,
            startTime: new Date(op.startTime),
            endTime: op.endTime ? new Date(op.endTime) : undefined,
            logs: op.logs || []
          });
        });
      }
    } catch (error) {
      console.error('Failed to load persisted operations:', error);
    }
  }

  /**
   * Persist operations to storage
   */
  private async persistOperations() {
    try {
      const opsObject: Record<string, OperationLog> = {};
      this.operations.forEach((op, id) => {
        opsObject[id] = op;
      });
      await figma.clientStorage.setAsync(this.operationsKey, opsObject);
    } catch (error) {
      console.error('Failed to persist operations:', error);
    }
  }

  /**
   * Send log entry to UI
   */
  private sendToUI(type: MessageType, data: any) {
    figma.ui.postMessage({ type, data });
  }

  /**
   * Start tracking an operation
   */
  startOperation(id: string, name: string, metadata?: Record<string, any>): string {
    const operation: OperationLog = {
      id,
      name,
      status: 'running',
      startTime: new Date(),
      logs: [],
      progress: 0,
      metadata
    };

    this.operations.set(id, operation);
    serverLogger.info(`Started operation: ${name}`, { operationId: id, metadata });
    
    this.sendToUI(MessageType.OPERATION_STARTED, {
      operationId: id,
      name,
      status: 'running'
    });
    
    this.persistOperations();
    return id;
  }

  /**
   * Update operation progress
   */
  updateProgress(operationId: string, progress: number, message?: string) {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.progress = Math.min(100, Math.max(0, progress));
    
    if (message) {
      serverLogger.info(message, { operationId, progress });
    }

    this.sendToUI(MessageType.OPERATION_PROGRESS, {
      operationId,
      progress: operation.progress,
      status: operation.status,
      message
    });
  }

  /**
   * Pause an operation
   */
  pauseOperation(operationId: string) {
    const operation = this.operations.get(operationId);
    if (!operation || operation.status !== 'running') return;

    operation.status = 'paused';
    serverLogger.info(`Paused operation: ${operation.name}`, { operationId });
    
    this.sendToUI(MessageType.OPERATION_PAUSED, {
      operationId,
      name: operation.name
    });
    
    this.persistOperations();
  }

  /**
   * Resume an operation
   */
  resumeOperation(operationId: string) {
    const operation = this.operations.get(operationId);
    if (!operation || operation.status !== 'paused') return;

    operation.status = 'running';
    serverLogger.info(`Resumed operation: ${operation.name}`, { operationId });
    
    this.sendToUI(MessageType.OPERATION_RESUMED, {
      operationId,
      name: operation.name
    });
    
    this.persistOperations();
  }

  /**
   * Complete an operation
   */
  completeOperation(operationId: string, data?: any) {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.status = 'completed';
    operation.endTime = new Date();
    operation.progress = 100;
    
    const duration = operation.endTime.getTime() - operation.startTime.getTime();
    serverLogger.info(`Completed operation: ${operation.name}`, { 
      operationId, 
      duration, 
      ...data 
    });
    
    this.sendToUI(MessageType.OPERATION_COMPLETED, {
      operationId,
      name: operation.name,
      duration
    });
    
    this.persistOperations();
  }

  /**
   * Fail an operation
   */
  failOperation(operationId: string, error: Error | string) {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.status = 'failed';
    operation.endTime = new Date();
    
    const errorMessage = error instanceof Error ? error.message : error;
    serverLogger.error(`Failed operation: ${operation.name} - ${errorMessage}`, error);
    
    this.sendToUI(MessageType.OPERATION_FAILED, {
      operationId,
      name: operation.name,
      error: errorMessage
    });
    
    this.persistOperations();
  }

  /**
   * Get operation status
   */
  getOperation(operationId: string): OperationLog | undefined {
    return this.operations.get(operationId);
  }

  /**
   * Get all operations
   */
  getAllOperations(): OperationLog[] {
    return Array.from(this.operations.values());
  }

  /**
   * Get resumable operations
   */
  getResumableOperations(): OperationLog[] {
    return Array.from(this.operations.values()).filter(
      op => op.status === 'paused'
    );
  }

  /**
   * Performance tracking
   */
  async measurePerformance<T>(
    name: string,
    category: string,
    fn: () => T | Promise<T>,
    operationId?: string
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      serverLogger.info(`${name} completed in ${duration.toFixed(2)}ms`, { 
        duration, 
        category,
        operationId 
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      serverLogger.error(`${name} failed after ${duration.toFixed(2)}ms`, { 
        error,
        duration,
        category,
        operationId
      });
      throw error;
    }
  }

  /**
   * Clear completed operations
   */
  clearCompletedOperations() {
    const completed = Array.from(this.operations.entries())
      .filter(([_, op]) => op.status === 'completed' || op.status === 'failed');
    
    completed.forEach(([id]) => this.operations.delete(id));
    this.persistOperations();
  }
}

// Export singleton instance
export const figmaLogger = new FigmaLogger();

// Extended logger with Figma-specific categories
export const logger = {
  // Use existing server logger categories
  ...serverLogger,
  
  // Add Figma-specific categories
  sync: {
    info: (msg: string, data?: any) => serverLogger.info(msg, { category: 'SYNC', ...data }),
    error: (msg: string, error?: any) => serverLogger.error(msg, { category: 'SYNC', error }),
    warn: (msg: string, data?: any) => serverLogger.warn(msg, { category: 'SYNC', ...data }),
    debug: (msg: string, data?: any) => serverLogger.debug(msg, { category: 'SYNC', ...data }),
  },
  generation: {
    info: (msg: string, data?: any) => serverLogger.info(msg, { category: 'GENERATION', ...data }),
    error: (msg: string, error?: any) => serverLogger.error(msg, { category: 'GENERATION', error }),
    warn: (msg: string, data?: any) => serverLogger.warn(msg, { category: 'GENERATION', ...data }),
    debug: (msg: string, data?: any) => serverLogger.debug(msg, { category: 'GENERATION', ...data }),
  },
  extraction: {
    info: (msg: string, data?: any) => serverLogger.info(msg, { category: 'EXTRACTION', ...data }),
    error: (msg: string, error?: any) => serverLogger.error(msg, { category: 'EXTRACTION', error }),
    warn: (msg: string, data?: any) => serverLogger.warn(msg, { category: 'EXTRACTION', ...data }),
    debug: (msg: string, data?: any) => serverLogger.debug(msg, { category: 'EXTRACTION', ...data }),
  },
  mutation: {
    info: (msg: string, data?: any) => serverLogger.info(msg, { category: 'MUTATION', ...data }),
    error: (msg: string, error?: any) => serverLogger.error(msg, { category: 'MUTATION', error }),
    warn: (msg: string, data?: any) => serverLogger.warn(msg, { category: 'MUTATION', ...data }),
    debug: (msg: string, data?: any) => serverLogger.debug(msg, { category: 'MUTATION', ...data }),
  },
  token: {
    info: (msg: string, data?: any) => serverLogger.info(msg, { category: 'TOKEN', ...data }),
    error: (msg: string, error?: any) => serverLogger.error(msg, { category: 'TOKEN', error }),
    warn: (msg: string, data?: any) => serverLogger.warn(msg, { category: 'TOKEN', ...data }),
    debug: (msg: string, data?: any) => serverLogger.debug(msg, { category: 'TOKEN', ...data }),
  },
  component: {
    info: (msg: string, data?: any) => serverLogger.info(msg, { category: 'COMPONENT', ...data }),
    error: (msg: string, error?: any) => serverLogger.error(msg, { category: 'COMPONENT', error }),
    warn: (msg: string, data?: any) => serverLogger.warn(msg, { category: 'COMPONENT', ...data }),
    debug: (msg: string, data?: any) => serverLogger.debug(msg, { category: 'COMPONENT', ...data }),
  },
  agent: {
    info: (msg: string, data?: any) => serverLogger.info(msg, { category: 'AGENT', ...data }),
    error: (msg: string, error?: any) => serverLogger.error(msg, { category: 'AGENT', error }),
    warn: (msg: string, data?: any) => serverLogger.warn(msg, { category: 'AGENT', ...data }),
    debug: (msg: string, data?: any) => serverLogger.debug(msg, { category: 'AGENT', ...data }),
  }
};