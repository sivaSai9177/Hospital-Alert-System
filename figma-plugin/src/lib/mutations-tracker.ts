/**
 * Mutations Tracking System
 * Tracks all changes made to the Figma document for undo/redo and history
 */

import { figmaLogger, logger } from './figma-logger';

export interface Mutation {
  id: string;
  type: MutationType;
  timestamp: Date;
  nodeId?: string;
  nodeName?: string;
  parentId?: string;
  changes: MutationChange[];
  metadata?: Record<string, any>;
  operationId?: string;
  undoable: boolean;
}

export type MutationType = 
  | 'create'
  | 'delete'
  | 'update'
  | 'move'
  | 'resize'
  | 'style'
  | 'text'
  | 'component'
  | 'variant'
  | 'batch';

export interface MutationChange {
  property: string;
  oldValue: any;
  newValue: any;
  path?: string[];
}

export interface MutationBatch {
  id: string;
  name: string;
  mutations: Mutation[];
  timestamp: Date;
  completed: boolean;
}

interface UndoableAction {
  mutationId: string;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
}

class MutationsTracker {
  private mutations: Map<string, Mutation> = new Map();
  private mutationHistory: string[] = [];
  private undoStack: UndoableAction[] = [];
  private redoStack: UndoableAction[] = [];
  private activeBatch: MutationBatch | null = null;
  private maxHistorySize = 1000;
  private storageKey = 'figma-mutations-history';
  private isTracking = true;

  constructor() {
    this.loadHistory();
  }

  /**
   * Start tracking mutations
   */
  startTracking(): void {
    this.isTracking = true;
    logger.mutation.info('Started tracking mutations');
  }

  /**
   * Stop tracking mutations
   */
  stopTracking(): void {
    this.isTracking = false;
    logger.mutation.info('Stopped tracking mutations');
  }

  /**
   * Track a node creation
   */
  trackCreate(node: SceneNode, parentId?: string): string {
    if (!this.isTracking) return '';

    const mutation: Mutation = {
      id: this.generateMutationId(),
      type: 'create',
      timestamp: new Date(),
      nodeId: node.id,
      nodeName: node.name,
      parentId,
      changes: [{
        property: 'node',
        oldValue: null,
        newValue: this.serializeNode(node)
      }],
      undoable: true
    };

    this.addMutation(mutation);
    this.createUndoAction(mutation, async () => {
      // Undo: remove the node
      const targetNode = await figma.getNodeByIdAsync(node.id);
      targetNode?.remove();
    });

    return mutation.id;
  }

  /**
   * Track a node deletion
   */
  trackDelete(node: SceneNode): string {
    if (!this.isTracking) return '';

    const serializedNode = this.serializeNode(node);
    const parentId = node.parent?.id;

    const mutation: Mutation = {
      id: this.generateMutationId(),
      type: 'delete',
      timestamp: new Date(),
      nodeId: node.id,
      nodeName: node.name,
      parentId,
      changes: [{
        property: 'node',
        oldValue: serializedNode,
        newValue: null
      }],
      undoable: true
    };

    this.addMutation(mutation);
    
    // For delete, we can't easily undo without recreating the entire node
    // This would require a more complex restoration system
    
    return mutation.id;
  }

  /**
   * Track a property update
   */
  trackUpdate(
    node: SceneNode, 
    property: string, 
    oldValue: any, 
    newValue: any
  ): string {
    if (!this.isTracking) return '';

    const mutation: Mutation = {
      id: this.generateMutationId(),
      type: 'update',
      timestamp: new Date(),
      nodeId: node.id,
      nodeName: node.name,
      changes: [{
        property,
        oldValue: this.serializeValue(oldValue),
        newValue: this.serializeValue(newValue)
      }],
      undoable: true
    };

    this.addMutation(mutation);
    this.createUndoAction(mutation, async () => {
      // Undo: restore old value
      const targetNode = await figma.getNodeByIdAsync(node.id);
      if (targetNode && property in targetNode) {
        (targetNode as any)[property] = oldValue;
      }
    });

    return mutation.id;
  }

  /**
   * Track a batch of mutations
   */
  startBatch(name: string): string {
    if (!this.isTracking) return '';

    const batchId = this.generateMutationId();
    this.activeBatch = {
      id: batchId,
      name,
      mutations: [],
      timestamp: new Date(),
      completed: false
    };

    logger.mutation.info(`Started mutation batch: ${name}`, { batchId });
    return batchId;
  }

  /**
   * Complete a batch of mutations
   */
  completeBatch(): MutationBatch | null {
    if (!this.activeBatch) return null;

    this.activeBatch.completed = true;
    const batch = this.activeBatch;
    this.activeBatch = null;

    // Create a single undo action for the entire batch
    if (batch.mutations.length > 0) {
      const batchMutation: Mutation = {
        id: batch.id,
        type: 'batch',
        timestamp: batch.timestamp,
        changes: [],
        metadata: {
          batchName: batch.name,
          mutationCount: batch.mutations.length
        },
        undoable: true
      };

      this.addMutation(batchMutation);
      logger.mutation.info(`Completed mutation batch: ${batch.name}`, { 
        batchId: batch.id,
        mutationCount: batch.mutations.length
      });
    }

    return batch;
  }

  /**
   * Track style changes
   */
  trackStyleChange(
    node: SceneNode,
    styleType: 'fills' | 'strokes' | 'effects',
    oldValue: any,
    newValue: any
  ): string {
    if (!this.isTracking) return '';

    const mutation: Mutation = {
      id: this.generateMutationId(),
      type: 'style',
      timestamp: new Date(),
      nodeId: node.id,
      nodeName: node.name,
      changes: [{
        property: styleType,
        oldValue: this.serializeValue(oldValue),
        newValue: this.serializeValue(newValue)
      }],
      metadata: { styleType },
      undoable: true
    };

    this.addMutation(mutation);
    return mutation.id;
  }

  /**
   * Track text changes
   */
  trackTextChange(
    node: TextNode,
    oldText: string,
    newText: string,
    property: 'characters' | 'fontName' | 'fontSize' = 'characters'
  ): string {
    if (!this.isTracking) return '';

    const mutation: Mutation = {
      id: this.generateMutationId(),
      type: 'text',
      timestamp: new Date(),
      nodeId: node.id,
      nodeName: node.name,
      changes: [{
        property,
        oldValue: oldText,
        newValue: newText
      }],
      metadata: { textProperty: property },
      undoable: true
    };

    this.addMutation(mutation);
    return mutation.id;
  }

  /**
   * Track component/instance changes
   */
  trackComponentChange(
    node: ComponentNode | InstanceNode,
    changeType: 'create' | 'update' | 'detach',
    details?: any
  ): string {
    if (!this.isTracking) return '';

    const mutation: Mutation = {
      id: this.generateMutationId(),
      type: 'component',
      timestamp: new Date(),
      nodeId: node.id,
      nodeName: node.name,
      changes: [{
        property: 'componentChange',
        oldValue: null,
        newValue: { changeType, details }
      }],
      metadata: { 
        isInstance: node.type === 'INSTANCE',
        mainComponentId: node.type === 'INSTANCE' ? node.mainComponent?.id : undefined
      },
      undoable: changeType !== 'detach'
    };

    this.addMutation(mutation);
    return mutation.id;
  }

  /**
   * Get mutation history
   */
  getHistory(limit?: number): Mutation[] {
    const historyIds = limit 
      ? this.mutationHistory.slice(-limit)
      : this.mutationHistory;
    
    return historyIds
      .map(id => this.mutations.get(id))
      .filter((m): m is Mutation => m !== undefined);
  }

  /**
   * Get mutations by node
   */
  getMutationsByNode(nodeId: string): Mutation[] {
    return Array.from(this.mutations.values())
      .filter(m => m.nodeId === nodeId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get mutations by type
   */
  getMutationsByType(type: MutationType): Mutation[] {
    return Array.from(this.mutations.values())
      .filter(m => m.type === type)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get mutations in time range
   */
  getMutationsInRange(startTime: Date, endTime: Date): Mutation[] {
    return Array.from(this.mutations.values())
      .filter(m => m.timestamp >= startTime && m.timestamp <= endTime)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Undo last mutation
   */
  async undo(): Promise<boolean> {
    const action = this.undoStack.pop();
    if (!action) return false;

    try {
      await action.undo();
      this.redoStack.push(action);
      logger.mutation.info('Undid mutation', { mutationId: action.mutationId });
      return true;
    } catch (error) {
      logger.mutation.error('Failed to undo mutation', error);
      return false;
    }
  }

  /**
   * Redo last undone mutation
   */
  async redo(): Promise<boolean> {
    const action = this.redoStack.pop();
    if (!action) return false;

    try {
      await action.execute();
      this.undoStack.push(action);
      logger.mutation.info('Redid mutation', { mutationId: action.mutationId });
      return true;
    } catch (error) {
      logger.mutation.error('Failed to redo mutation', error);
      return false;
    }
  }

  /**
   * Clear mutation history
   */
  clearHistory(): void {
    this.mutations.clear();
    this.mutationHistory = [];
    this.undoStack = [];
    this.redoStack = [];
    this.saveHistory();
    logger.mutation.info('Cleared mutation history');
  }

  /**
   * Export mutation history
   */
  exportHistory(): string {
    const history = this.getHistory();
    return JSON.stringify(history, null, 2);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalMutations: number;
    mutationsByType: Record<MutationType, number>;
    recentActivity: { time: string; count: number }[];
  } {
    const mutations = Array.from(this.mutations.values());
    const byType: Record<MutationType, number> = {} as any;
    
    // Count by type
    mutations.forEach(m => {
      byType[m.type] = (byType[m.type] || 0) + 1;
    });

    // Recent activity (last 24 hours, hourly buckets)
    const now = new Date();
    const recentActivity = [];
    
    for (let i = 0; i < 24; i++) {
      const hourStart = new Date(now);
      hourStart.setHours(now.getHours() - i, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(hourStart.getHours() + 1);
      
      const count = mutations.filter(m => 
        m.timestamp >= hourStart && m.timestamp < hourEnd
      ).length;
      
      if (count > 0) {
        recentActivity.push({
          time: hourStart.toISOString(),
          count
        });
      }
    }

    return {
      totalMutations: mutations.length,
      mutationsByType: byType,
      recentActivity: recentActivity.reverse()
    };
  }

  /**
   * Private helper methods
   */
  private generateMutationId(): string {
    return `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addMutation(mutation: Mutation): void {
    // Add to current batch if active
    if (this.activeBatch) {
      this.activeBatch.mutations.push(mutation);
    }

    // Add to main storage
    this.mutations.set(mutation.id, mutation);
    this.mutationHistory.push(mutation.id);

    // Trim history if needed
    if (this.mutationHistory.length > this.maxHistorySize) {
      const removed = this.mutationHistory.shift();
      if (removed) {
        this.mutations.delete(removed);
      }
    }

    // Save to storage periodically
    if (this.mutationHistory.length % 10 === 0) {
      this.saveHistory();
    }

    logger.mutation.debug('Added mutation', { 
      id: mutation.id, 
      type: mutation.type,
      nodeId: mutation.nodeId 
    });
  }

  private createUndoAction(
    mutation: Mutation, 
    undoFn: () => Promise<void>
  ): void {
    if (!mutation.undoable) return;

    const action: UndoableAction = {
      mutationId: mutation.id,
      execute: async () => {
        // Re-apply the mutation
        logger.mutation.debug('Re-applying mutation', { id: mutation.id });
      },
      undo: undoFn
    };

    this.undoStack.push(action);
    
    // Limit undo stack size
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  private serializeNode(node: SceneNode): any {
    // Simplified node serialization
    const serialized: any = {
      id: node.id,
      type: node.type,
      name: node.name,
      visible: node.visible,
      locked: node.locked
    };

    if ('x' in node) serialized.x = node.x;
    if ('y' in node) serialized.y = node.y;
    if ('width' in node) serialized.width = node.width;
    if ('height' in node) serialized.height = node.height;
    if ('fills' in node) serialized.fills = node.fills;
    if ('strokes' in node) serialized.strokes = node.strokes;

    return serialized;
  }

  private serializeValue(value: any): any {
    // Handle special Figma types
    if (value && typeof value === 'object') {
      if ('r' in value && 'g' in value && 'b' in value) {
        // Color
        return { ...value };
      }
      if (Array.isArray(value)) {
        return value.map(v => this.serializeValue(v));
      }
      // Generic object
      return { ...value };
    }
    return value;
  }

  private async loadHistory(): Promise<void> {
    try {
      const saved = await figma.clientStorage.getAsync(this.storageKey);
      if (saved && typeof saved === 'object') {
        // Restore mutations (simplified - full restoration would need more work)
        logger.mutation.info('Loaded mutation history from storage');
      }
    } catch (error) {
      logger.mutation.error('Failed to load mutation history', error);
    }
  }

  private async saveHistory(): Promise<void> {
    try {
      // Save a summary of mutations (not full data due to storage limits)
      const summary = {
        count: this.mutations.size,
        lastUpdate: new Date().toISOString(),
        types: this.getStatistics().mutationsByType
      };
      
      await figma.clientStorage.setAsync(this.storageKey, summary);
    } catch (error) {
      logger.mutation.error('Failed to save mutation history', error);
    }
  }
}

// Export singleton instance
export const mutationsTracker = new MutationsTracker();