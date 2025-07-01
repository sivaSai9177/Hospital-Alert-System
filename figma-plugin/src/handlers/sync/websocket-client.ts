// WebSocket client for real-time token syncing
export class TokenSyncWebSocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private messageQueue: any[] = [];
  private isConnected: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();
  
  constructor(url: string = 'ws://localhost:8080') {
    this.url = url;
    this.connect();
  }
  
  private connect() {
    try {
      console.log('🔌 Connecting to WebSocket server...');
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          this.send(message);
        }
        
        // Subscribe to all token updates
        this.send({
          type: 'SUBSCRIBE',
          timestamp: new Date().toISOString(),
          data: { tokenTypes: ['all'] }
        });
        
        this.emit('connected', {});
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Received message:', message.type);
          
          switch (message.type) {
            case 'TOKEN_UPDATE':
              this.emit('tokenUpdate', message.data);
              break;
              
            case 'TOKEN_RESPONSE':
              this.emit('tokenResponse', message.data);
              break;
              
            case 'SYNC_RESPONSE':
              this.emit('syncResponse', message.data);
              break;
              
            case 'ERROR':
              this.emit('error', message.data);
              break;
              
            case 'HEARTBEAT':
              this.send({ type: 'PONG', timestamp: new Date().toISOString() });
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.emit('error', { error });
      };
      
      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.isConnected = false;
        this.emit('disconnected', {});
        
        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
          setTimeout(() => this.connect(), delay);
        } else {
          console.error('❌ Max reconnection attempts reached');
          this.emit('maxReconnectAttemptsReached', {});
        }
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error);
      this.emit('error', { error });
    }
  }
  
  send(message: any) {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }
  
  // Request current tokens
  requestTokens(tokenTypes?: string[]) {
    this.send({
      type: 'TOKEN_REQUEST',
      timestamp: new Date().toISOString(),
      data: { tokenTypes: tokenTypes || ['all'] }
    });
  }
  
  // Sync tokens to code
  syncToCode(tokens: any) {
    this.send({
      type: 'SYNC_REQUEST',
      timestamp: new Date().toISOString(),
      data: {
        direction: 'figma-to-code',
        tokens
      }
    });
  }
  
  // Sync tokens from code
  syncFromCode(tokenTypes?: string[]) {
    this.send({
      type: 'SYNC_REQUEST',
      timestamp: new Date().toISOString(),
      data: {
        direction: 'code-to-figma',
        tokenTypes: tokenTypes || ['all']
      }
    });
  }
  
  // Send token update
  updateTokens(tokens: any, source: 'figma' | 'code' | 'external' = 'figma') {
    this.send({
      type: 'TOKEN_UPDATE',
      timestamp: new Date().toISOString(),
      data: { tokens, source }
    });
  }
  
  // Event handling
  on(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }
  
  off(event: string, listener: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }
  
  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }
  
  // Cleanup
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton instance
let wsClient: TokenSyncWebSocketClient | null = null;

export function getWebSocketClient(): TokenSyncWebSocketClient {
  if (!wsClient) {
    wsClient = new TokenSyncWebSocketClient();
  }
  return wsClient;
}

export function disconnectWebSocketClient() {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
}