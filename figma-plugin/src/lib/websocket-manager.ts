/**
 * WebSocket Manager
 * Handles WebSocket connections with automatic reconnection and conflict resolution
 */

import { logger } from './figma-logger';
import { MessageType } from '../types/messages';

interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enableConflictResolution?: boolean;
}

interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: number;
  version?: number;
  clientId?: string;
}

interface ConflictResolution {
  strategy: 'last-write-wins' | 'merge' | 'manual';
  onConflict?: (local: any, remote: any) => any;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isConnected = false;
  private clientId: string;
  private lastMessageVersion = 0;
  private conflictResolution: ConflictResolution = {
    strategy: 'last-write-wins'
  };

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      enableConflictResolution: true,
      ...config
    };
    
    this.clientId = this.generateClientId();
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    try {
      logger.info('Connecting to WebSocket server', { url: this.config.url });
      
      this.ws = new WebSocket(this.config.url);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      logger.error('Failed to create WebSocket connection', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    logger.info('Disconnecting from WebSocket server');
    
    this.isConnected = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send message through WebSocket
   */
  send(message: WebSocketMessage): void {
    const enrichedMessage: WebSocketMessage = {
      ...message,
      timestamp: Date.now(),
      version: ++this.lastMessageVersion,
      clientId: this.clientId
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(enrichedMessage));
        logger.debug('WebSocket message sent', { type: message.type });
      } catch (error) {
        logger.error('Failed to send WebSocket message', error);
        this.queueMessage(enrichedMessage);
      }
    } else {
      logger.warn('WebSocket not connected, queueing message');
      this.queueMessage(enrichedMessage);
    }
  }

  /**
   * Set conflict resolution strategy
   */
  setConflictResolution(resolution: ConflictResolution): void {
    this.conflictResolution = resolution;
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(event: Event): void {
    logger.success('WebSocket connected');
    
    this.isConnected = true;
    this.reconnectAttempts = 0;
    
    // Send identification message
    this.send({
      type: 'identify',
      data: {
        clientId: this.clientId,
        clientType: 'figma-plugin',
        version: '1.0.0'
      }
    });
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Flush message queue
    this.flushMessageQueue();
    
    // Notify UI
    figma.ui.postMessage({
      type: MessageType.WEBSOCKET_CONNECTED
    });
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      logger.debug('WebSocket message received', { type: message.type });
      
      // Handle conflict detection
      if (this.config.enableConflictResolution && message.version) {
        this.handleConflictDetection(message);
      }
      
      // Handle different message types
      switch (message.type) {
        case 'pong':
          // Heartbeat response
          break;
          
        case 'sync':
          this.handleSyncMessage(message);
          break;
          
        case 'conflict':
          this.handleConflictMessage(message);
          break;
          
        case 'update':
          this.handleUpdateMessage(message);
          break;
          
        default:
          // Forward to UI
          figma.ui.postMessage({
            type: MessageType.WEBSOCKET_MESSAGE,
            data: message
          });
      }
    } catch (error) {
      logger.error('Failed to handle WebSocket message', error);
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    logger.error('WebSocket error occurred');
    
    figma.ui.postMessage({
      type: MessageType.WEBSOCKET_ERROR,
      error: 'WebSocket connection error'
    });
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    logger.warn('WebSocket disconnected', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });
    
    this.isConnected = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Notify UI
    figma.ui.postMessage({
      type: MessageType.WEBSOCKET_DISCONNECTED,
      data: {
        code: event.code,
        reason: event.reason
      }
    });
    
    // Schedule reconnection if not manually disconnected
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      figma.ui.postMessage({
        type: MessageType.WEBSOCKET_ERROR,
        error: 'Failed to reconnect after maximum attempts'
      });
      return;
    }
    
    const delay = this.getReconnectDelay();
    logger.info(`Scheduling reconnection in ${delay}ms`, {
      attempt: this.reconnectAttempts + 1,
      maxAttempts: this.config.maxReconnectAttempts
    });
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay) as unknown as number;
  }

  /**
   * Get reconnect delay with exponential backoff
   */
  private getReconnectDelay(): number {
    const baseDelay = this.config.reconnectInterval;
    const exponentialDelay = baseDelay * Math.pow(2, this.reconnectAttempts);
    const maxDelay = 60000; // 1 minute max
    return Math.min(exponentialDelay, maxDelay);
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval) as unknown as number;
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);
    
    // Limit queue size
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;
    
    logger.info(`Flushing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Handle conflict detection
   */
  private handleConflictDetection(message: WebSocketMessage): void {
    if (!message.version || !message.clientId) return;
    
    // Check if this is our own message echoed back
    if (message.clientId === this.clientId) {
      return;
    }
    
    // Check for version conflict
    if (message.version <= this.lastMessageVersion) {
      logger.warn('Potential conflict detected', {
        localVersion: this.lastMessageVersion,
        remoteVersion: message.version,
        remoteClient: message.clientId
      });
      
      // Trigger conflict resolution
      this.resolveConflict(message);
    }
  }

  /**
   * Resolve conflicts based on strategy
   */
  private resolveConflict(remoteMessage: WebSocketMessage): void {
    switch (this.conflictResolution.strategy) {
      case 'last-write-wins':
        // Accept remote changes based on timestamp
        if (remoteMessage.timestamp && remoteMessage.timestamp > Date.now() - 1000) {
          this.applyRemoteChanges(remoteMessage);
        }
        break;
        
      case 'merge':
        // Attempt to merge changes
        this.mergeChanges(remoteMessage);
        break;
        
      case 'manual':
        // Notify UI for manual resolution
        figma.ui.postMessage({
          type: MessageType.WEBSOCKET_CONFLICT,
          data: {
            local: { version: this.lastMessageVersion },
            remote: remoteMessage
          }
        });
        break;
    }
  }

  /**
   * Apply remote changes
   */
  private applyRemoteChanges(message: WebSocketMessage): void {
    logger.info('Applying remote changes', { type: message.type });
    
    // Update version
    this.lastMessageVersion = message.version || this.lastMessageVersion;
    
    // Forward to UI for processing
    figma.ui.postMessage({
      type: MessageType.WEBSOCKET_UPDATE,
      data: message.data,
      source: 'remote'
    });
  }

  /**
   * Merge changes
   */
  private mergeChanges(remoteMessage: WebSocketMessage): void {
    if (this.conflictResolution.onConflict) {
      try {
        const merged = this.conflictResolution.onConflict(
          { version: this.lastMessageVersion },
          remoteMessage
        );
        
        // Apply merged changes
        figma.ui.postMessage({
          type: MessageType.WEBSOCKET_UPDATE,
          data: merged,
          source: 'merged'
        });
      } catch (error) {
        logger.error('Failed to merge changes', error);
        
        // Fall back to last-write-wins
        this.applyRemoteChanges(remoteMessage);
      }
    }
  }

  /**
   * Handle sync message
   */
  private handleSyncMessage(message: WebSocketMessage): void {
    logger.info('Handling sync message');
    
    // Request current state from Figma
    figma.ui.postMessage({
      type: MessageType.WEBSOCKET_SYNC_REQUEST,
      data: message.data
    });
  }

  /**
   * Handle conflict message
   */
  private handleConflictMessage(message: WebSocketMessage): void {
    logger.warn('Server reported conflict', message.data);
    
    // Notify UI
    figma.ui.postMessage({
      type: MessageType.WEBSOCKET_CONFLICT,
      data: message.data
    });
  }

  /**
   * Handle update message
   */
  private handleUpdateMessage(message: WebSocketMessage): void {
    // Apply update
    this.applyRemoteChanges(message);
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `figma-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    isConnected: boolean;
    reconnectAttempts: number;
    queuedMessages: number;
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length
    };
  }
}

// Export singleton instance
let webSocketManager: WebSocketManager | null = null;

export function initializeWebSocket(config: WebSocketConfig): WebSocketManager {
  if (!webSocketManager) {
    webSocketManager = new WebSocketManager(config);
  }
  return webSocketManager;
}

export function getWebSocketManager(): WebSocketManager | null {
  return webSocketManager;
}

export function disconnectWebSocket(): void {
  if (webSocketManager) {
    webSocketManager.disconnect();
    webSocketManager = null;
  }
}