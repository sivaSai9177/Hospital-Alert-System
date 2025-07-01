#!/usr/bin/env node
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Token file paths
const TOKEN_PATHS = {
  colors: path.resolve(__dirname, '../../../lib/design/colors.ts'),
  typography: path.resolve(__dirname, '../../../lib/design/typography.ts'),
  spacing: path.resolve(__dirname, '../../../lib/design/spacing.ts'),
  shadows: path.resolve(__dirname, '../../../lib/design/shadows.ts'),
  borderRadius: path.resolve(__dirname, '../../../lib/design/border-radius.ts'),
  combined: path.resolve(__dirname, '../../../lib/design/tokens.json'),
};

// Message types
enum MessageType {
  SUBSCRIBE = 'SUBSCRIBE',
  UNSUBSCRIBE = 'UNSUBSCRIBE',
  TOKEN_UPDATE = 'TOKEN_UPDATE',
  TOKEN_REQUEST = 'TOKEN_REQUEST',
  TOKEN_RESPONSE = 'TOKEN_RESPONSE',
  SYNC_REQUEST = 'SYNC_REQUEST',
  SYNC_RESPONSE = 'SYNC_RESPONSE',
  ERROR = 'ERROR',
  HEARTBEAT = 'HEARTBEAT',
  PONG = 'PONG',
}

// Message schemas
const BaseMessageSchema = z.object({
  type: z.nativeEnum(MessageType),
  timestamp: z.string(),
  id: z.string().optional(),
});

const TokenUpdateMessageSchema = BaseMessageSchema.extend({
  type: z.literal(MessageType.TOKEN_UPDATE),
  data: z.object({
    tokens: z.any(),
    source: z.enum(['figma', 'code', 'external']),
    changedTokenTypes: z.array(z.string()).optional(),
  }),
});

const SyncRequestMessageSchema = BaseMessageSchema.extend({
  type: z.literal(MessageType.SYNC_REQUEST),
  data: z.object({
    direction: z.enum(['figma-to-code', 'code-to-figma']),
    tokenTypes: z.array(z.string()).optional(),
    tokens: z.any().optional(),
  }),
});

// WebSocket server class
class TokenSyncWebSocketServer extends EventEmitter {
  private server: WebSocketServer;
  private httpServer: ReturnType<typeof createServer>;
  private clients: Map<string, any> = new Map();
  private fileWatchers: Map<string, any> = new Map();
  
  constructor(port: number = 8080) {
    super();
    
    // Create HTTP server
    this.httpServer = createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', clients: this.clients.size }));
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    
    // Create WebSocket server
    this.server = new WebSocketServer({ 
      server: this.httpServer,
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
      }
    });
    
    this.setupEventHandlers();
    this.startFileWatching();
    
    // Start server
    this.httpServer.listen(port, () => {
      console.log(`🚀 WebSocket server running on ws://localhost:${port}`);
      console.log(`📊 Health check available at http://localhost:${port}/health`);
    });
  }
  
  private setupEventHandlers() {
    this.server.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      const clientIp = req.socket.remoteAddress;
      
      console.log(`🔗 New client connected: ${clientId} from ${clientIp}`);
      
      // Store client info
      this.clients.set(clientId, {
        ws,
        id: clientId,
        ip: clientIp,
        connectedAt: new Date(),
        subscriptions: new Set(),
      });
      
      // Send welcome message
      this.sendMessage(ws, {
        type: MessageType.TOKEN_RESPONSE,
        timestamp: new Date().toISOString(),
        data: {
          clientId,
          message: 'Connected to Token Sync WebSocket Server',
        },
      });
      
      // Setup message handler
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(clientId, message);
        } catch (error) {
          console.error('Error parsing message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });
      
      // Setup close handler
      ws.on('close', () => {
        console.log(`🔌 Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });
      
      // Setup error handler
      ws.on('error', (error) => {
        console.error(`Client ${clientId} error:`, error);
      });
      
      // Setup heartbeat
      const heartbeatInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          this.sendMessage(ws, {
            type: MessageType.HEARTBEAT,
            timestamp: new Date().toISOString(),
          });
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // 30 seconds
    });
  }
  
  private async handleMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    console.log(`📨 Message from ${clientId}:`, message.type);
    
    try {
      switch (message.type) {
        case MessageType.SUBSCRIBE:
          await this.handleSubscribe(clientId, message.data);
          break;
          
        case MessageType.UNSUBSCRIBE:
          await this.handleUnsubscribe(clientId, message.data);
          break;
          
        case MessageType.TOKEN_REQUEST:
          await this.handleTokenRequest(clientId, message.data);
          break;
          
        case MessageType.SYNC_REQUEST:
          await this.handleSyncRequest(clientId, message);
          break;
          
        case MessageType.TOKEN_UPDATE:
          await this.handleTokenUpdate(clientId, message);
          break;
          
        case MessageType.HEARTBEAT:
          this.sendMessage(client.ws, {
            type: MessageType.PONG,
            timestamp: new Date().toISOString(),
          });
          break;
          
        default:
          this.sendError(client.ws, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling message from ${clientId}:`, error);
      this.sendError(client.ws, error instanceof Error ? error.message : 'Internal server error');
    }
  }
  
  private async handleSubscribe(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    const { tokenTypes = ['all'] } = data;
    
    tokenTypes.forEach((type: string) => {
      client.subscriptions.add(type);
    });
    
    console.log(`✅ Client ${clientId} subscribed to:`, tokenTypes);
    
    // Send current tokens
    const tokens = await this.readAllTokens();
    this.sendMessage(client.ws, {
      type: MessageType.TOKEN_RESPONSE,
      timestamp: new Date().toISOString(),
      data: { tokens, subscribed: true },
    });
  }
  
  private async handleUnsubscribe(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    const { tokenTypes = [] } = data;
    
    if (tokenTypes.length === 0) {
      client.subscriptions.clear();
    } else {
      tokenTypes.forEach((type: string) => {
        client.subscriptions.delete(type);
      });
    }
    
    console.log(`🚫 Client ${clientId} unsubscribed from:`, tokenTypes);
  }
  
  private async handleTokenRequest(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    const { tokenTypes = ['all'] } = data;
    const tokens = await this.readAllTokens(tokenTypes);
    
    this.sendMessage(client.ws, {
      type: MessageType.TOKEN_RESPONSE,
      timestamp: new Date().toISOString(),
      data: { tokens },
    });
  }
  
  private async handleSyncRequest(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    try {
      const validatedMessage = SyncRequestMessageSchema.parse(message);
      const { direction, tokens, tokenTypes } = validatedMessage.data;
      
      if (direction === 'figma-to-code') {
        if (!tokens) {
          throw new Error('Tokens required for figma-to-code sync');
        }
        
        // Write tokens to codebase
        await this.writeTokens(tokens, tokenTypes);
        
        // Broadcast update to all subscribed clients
        this.broadcastTokenUpdate(tokens, 'figma', clientId);
        
        this.sendMessage(client.ws, {
          type: MessageType.SYNC_RESPONSE,
          timestamp: new Date().toISOString(),
          data: {
            success: true,
            message: 'Tokens synced to codebase',
            direction,
          },
        });
      } else if (direction === 'code-to-figma') {
        // Read tokens from codebase
        const tokens = await this.readAllTokens(tokenTypes);
        
        this.sendMessage(client.ws, {
          type: MessageType.SYNC_RESPONSE,
          timestamp: new Date().toISOString(),
          data: {
            success: true,
            tokens,
            direction,
          },
        });
      }
    } catch (error) {
      throw error;
    }
  }
  
  private async handleTokenUpdate(clientId: string, message: any) {
    try {
      const validatedMessage = TokenUpdateMessageSchema.parse(message);
      const { tokens, source } = validatedMessage.data;
      
      // Write tokens to codebase if from Figma
      if (source === 'figma') {
        await this.writeTokens(tokens);
      }
      
      // Broadcast to other clients
      this.broadcastTokenUpdate(tokens, source, clientId);
    } catch (error) {
      throw error;
    }
  }
  
  private broadcastTokenUpdate(tokens: any, source: string, excludeClientId?: string) {
    const message = {
      type: MessageType.TOKEN_UPDATE,
      timestamp: new Date().toISOString(),
      data: { tokens, source },
    };
    
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId && client.ws.readyState === client.ws.OPEN) {
        // Check if client is subscribed to any of the token types
        const hasSubscription = client.subscriptions.has('all') || 
          Object.keys(tokens).some(type => client.subscriptions.has(type));
        
        if (hasSubscription) {
          this.sendMessage(client.ws, message);
        }
      }
    });
  }
  
  private async readAllTokens(tokenTypes?: string[]): Promise<any> {
    const tokens: any = {};
    
    // Try combined file first
    if (await this.fileExists(TOKEN_PATHS.combined)) {
      const content = await fs.readFile(TOKEN_PATHS.combined, 'utf-8');
      const allTokens = JSON.parse(content);
      
      if (!tokenTypes || tokenTypes.includes('all')) {
        return allTokens;
      }
      
      // Filter by token types
      tokenTypes.forEach(type => {
        if (allTokens[type]) {
          tokens[type] = allTokens[type];
        }
      });
      
      return tokens;
    }
    
    // Read individual files
    const types = tokenTypes?.includes('all') || !tokenTypes 
      ? ['colors', 'typography', 'spacing', 'shadows', 'borderRadius']
      : tokenTypes;
    
    for (const type of types) {
      if (TOKEN_PATHS[type as keyof typeof TOKEN_PATHS]) {
        tokens[type] = await this.readTokenFile(
          TOKEN_PATHS[type as keyof typeof TOKEN_PATHS],
          type
        );
      }
    }
    
    return tokens;
  }
  
  private async writeTokens(tokens: any, tokenTypes?: string[]) {
    // Write to combined file if it exists
    if (await this.fileExists(TOKEN_PATHS.combined)) {
      let existingTokens = {};
      try {
        const content = await fs.readFile(TOKEN_PATHS.combined, 'utf-8');
        existingTokens = JSON.parse(content);
      } catch (e) {
        // File might be empty or invalid
      }
      
      const updatedTokens = {
        ...existingTokens,
        ...tokens,
        lastUpdated: new Date().toISOString(),
      };
      
      await fs.writeFile(
        TOKEN_PATHS.combined,
        JSON.stringify(updatedTokens, null, 2)
      );
    }
    
    // Write to individual files
    const types = tokenTypes?.includes('all') || !tokenTypes
      ? Object.keys(tokens)
      : tokenTypes;
    
    for (const type of types) {
      if (tokens[type] && TOKEN_PATHS[type as keyof typeof TOKEN_PATHS]) {
        await this.writeTokenFile(
          TOKEN_PATHS[type as keyof typeof TOKEN_PATHS],
          tokens[type],
          type
        );
      }
    }
  }
  
  private async readTokenFile(filePath: string, tokenType: string): Promise<any> {
    if (!await this.fileExists(filePath)) {
      return [];
    }
    
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Handle TypeScript files
    if (filePath.endsWith('.ts')) {
      const jsonMatch = content.match(/export\s+(?:const|default)\s+\w*\s*=\s*([\s\S]*)/);
      if (jsonMatch) {
        try {
          // Simple eval for JSON-like content
          return eval(`(${jsonMatch[1]})`);
        } catch (e) {
          console.error(`Failed to parse TypeScript file ${filePath}:`, e);
          return [];
        }
      }
    }
    
    // Handle JSON files
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error(`Failed to parse JSON file ${filePath}:`, e);
      return [];
    }
  }
  
  private async writeTokenFile(filePath: string, tokens: any, tokenType: string): Promise<void> {
    if (!await this.fileExists(filePath)) {
      console.warn(`Token file not found, skipping: ${filePath}`);
      return;
    }
    
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    if (filePath.endsWith('.ts')) {
      const content = `// Auto-generated by Figma Token Sync
// Last updated: ${new Date().toISOString()}

export const ${tokenType} = ${JSON.stringify(tokens, null, 2)};

export default ${tokenType};
`;
      await fs.writeFile(filePath, content);
    } else {
      await fs.writeFile(filePath, JSON.stringify(tokens, null, 2));
    }
  }
  
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  private startFileWatching() {
    // Watch token files for changes
    Object.entries(TOKEN_PATHS).forEach(([type, filePath]) => {
      fs.watch(filePath, { persistent: false }, async (eventType) => {
        if (eventType === 'change') {
          console.log(`📝 Token file changed: ${type}`);
          
          // Read updated tokens
          const tokens = await this.readTokenFile(filePath, type);
          
          // Broadcast update to all clients
          this.broadcastTokenUpdate({ [type]: tokens }, 'code');
        }
      }).on('error', (err) => {
        console.warn(`Could not watch ${filePath}:`, err.message);
      });
    });
  }
  
  private sendMessage(ws: any, message: any) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  private sendError(ws: any, error: string) {
    this.sendMessage(ws, {
      type: MessageType.ERROR,
      timestamp: new Date().toISOString(),
      data: { error },
    });
  }
  
  private generateClientId(): string {
    return `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  public async shutdown() {
    console.log('🛑 Shutting down WebSocket server...');
    
    // Close all client connections
    this.clients.forEach((client) => {
      client.ws.close();
    });
    
    // Close server
    this.server.close();
    this.httpServer.close();
    
    // Clear watchers
    this.fileWatchers.forEach(watcher => watcher.close());
  }
}

// Start server
const port = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 8080;
const server = new TokenSyncWebSocketServer(port);

// Graceful shutdown
process.on('SIGINT', async () => {
  await server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.shutdown();
  process.exit(0);
});

export { TokenSyncWebSocketServer };