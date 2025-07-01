// Import our WebSocket manager
import { initializeWebSocket, getWebSocketManager, disconnectWebSocket } from '../../lib/websocket-manager';

interface MCPRequest {
  action: string;
  [key: string]: any;
}

interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
  tokens?: any; // For sync-from-code responses
}

// MCP Server configuration
const MCP_SERVER_URL = 'http://localhost:3456'; // Default MCP server URL
const WS_SERVER_URL = 'ws://localhost:8080'; // Default WebSocket server URL

// Sync mode
type SyncMode = 'http' | 'websocket';

// Get current sync mode from settings
async function getSyncMode(): Promise<SyncMode> {
  const settings = await figma.clientStorage.getAsync('settings');
  // Default to HTTP since WebSocket is not available in Figma
  return (settings && settings.syncMode) || 'http';
}

export async function syncWithMCPServer(request: MCPRequest): Promise<MCPResponse> {
  const syncMode = await getSyncMode();
  
  if (syncMode === 'websocket') {
    return syncWithWebSocket(request);
  }
  
  return syncWithHTTP(request);
}

// WebSocket-based sync
async function syncWithWebSocket(request: MCPRequest): Promise<MCPResponse> {
  return new Promise((resolve, reject) => {
    const wsManager = getWebSocketManager();
    
    if (!wsManager) {
      // Initialize WebSocket if not already done
      const settings = figma.clientStorage.getAsync('settings');
      settings.then(s => {
        const wsUrl = (s && s.wsServerUrl) || WS_SERVER_URL;
        const manager = initializeWebSocket({
          url: wsUrl,
          enableConflictResolution: true
        });
        
        manager.connect();
        
        // Set up conflict resolution
        manager.setConflictResolution({
          strategy: 'merge',
          onConflict: (local, remote) => {
            // Custom merge logic for design tokens
            return mergeTokenConflicts(local, remote);
          }
        });
        
        // Wait for connection then send
        setTimeout(() => {
          manager.send({
            type: 'sync',
            data: request
          });
        }, 1000);
      });
    } else {
      // Use existing connection
      wsManager.send({
        type: 'sync',
        data: request
      });
    }
    
    // Set up one-time response handler
    const handleResponse = (event: MessageEvent) => {
      const message = event.data.pluginMessage;
      if (message && message.type === 'WEBSOCKET_MESSAGE') {
        window.removeEventListener('message', handleResponse);
        resolve({
          success: true,
          data: message.data
        });
      } else if (message && message.type === 'WEBSOCKET_ERROR') {
        window.removeEventListener('message', handleResponse);
        reject(new Error(message.error));
      }
    };
    
    window.addEventListener('message', handleResponse);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      window.removeEventListener('message', handleResponse);
      reject(new Error('WebSocket sync timeout'));
    }, 30000);
  });
}

// HTTP-based sync (fallback)
async function syncWithHTTP(request: MCPRequest): Promise<MCPResponse> {
  try {
    // Get saved settings for MCP server URL
    const settings = await figma.clientStorage.getAsync('settings');
    const serverUrl = (settings && settings.mcpServerUrl) || MCP_SERVER_URL;

    const response = await fetch(`${serverUrl}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`MCP server responded with ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('MCP sync error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Specific sync operations
export async function syncTokensToCode(tokens: any, config: any): Promise<MCPResponse> {
  return syncWithMCPServer({
    action: 'sync-tokens-to-code',
    tokens,
    config,
    timestamp: new Date().toISOString()
  });
}

export async function syncTokensFromCode(): Promise<MCPResponse> {
  return syncWithMCPServer({
    action: 'sync-tokens-from-code',
    timestamp: new Date().toISOString()
  });
}

export async function generateComponentCode(components: any[], options: any): Promise<MCPResponse> {
  return syncWithMCPServer({
    action: 'generate-component',
    components,
    options,
    timestamp: new Date().toISOString()
  });
}

export async function checkMCPConnection(): Promise<boolean> {
  // Always use HTTP connection check in Figma environment
  return checkHTTPConnection();
}

async function checkHTTPConnection(): Promise<boolean> {
  try {
    const settings = await figma.clientStorage.getAsync('settings');
    const serverUrl = (settings && settings.mcpServerUrl) || MCP_SERVER_URL;

    const response = await fetch(`${serverUrl}/health`, {
      method: 'GET'
    });

    return response.ok;
  } catch (error) {
    console.error('MCP connection check failed:', error);
    return false;
  }
}

// Merge token conflicts
function mergeTokenConflicts(local: any, remote: any): any {
  // Deep merge strategy for design tokens
  const merged: any = { ...local };
  
  // Merge colors
  if (remote.colors) {
    merged.colors = mergeColorTokens(local.colors || {}, remote.colors);
  }
  
  // Merge typography
  if (remote.typography) {
    merged.typography = mergeTypographyTokens(local.typography || [], remote.typography);
  }
  
  // Merge spacing
  if (remote.spacing) {
    merged.spacing = mergeSpacingTokens(local.spacing || {}, remote.spacing);
  }
  
  // Merge other properties
  for (const key in remote) {
    if (!['colors', 'typography', 'spacing'].includes(key)) {
      merged[key] = remote[key]; // Last-write-wins for other properties
    }
  }
  
  return merged;
}

function mergeColorTokens(local: any, remote: any): any {
  const merged = { ...local };
  
  // Merge variables array
  if (remote.variables && Array.isArray(remote.variables)) {
    const localVars = new Map(
      (local.variables || []).map((v: any) => [v.name, v])
    );
    
    remote.variables.forEach((remoteVar: any) => {
      const localVar = localVars.get(remoteVar.name);
      if (localVar) {
        // Conflict: prefer remote if it's newer
        if (remoteVar.updatedAt > localVar.updatedAt) {
          localVars.set(remoteVar.name, remoteVar);
        }
      } else {
        // New variable from remote
        localVars.set(remoteVar.name, remoteVar);
      }
    });
    
    merged.variables = Array.from(localVars.values());
  }
  
  return merged;
}

function mergeTypographyTokens(local: any[], remote: any[]): any[] {
  const localMap = new Map(local.map(t => [t.name, t]));
  const merged = new Map(localMap);
  
  remote.forEach(remoteToken => {
    const localToken = localMap.get(remoteToken.name);
    if (!localToken || remoteToken.updatedAt > localToken.updatedAt) {
      merged.set(remoteToken.name, remoteToken);
    }
  });
  
  return Array.from(merged.values());
}

function mergeSpacingTokens(local: any, remote: any): any {
  return mergeColorTokens(local, remote); // Similar merge strategy
}

// Setup real-time sync with WebSocket
export function setupRealtimeSync(onTokenUpdate: (tokens: any) => void) {
  const settings = figma.clientStorage.getAsync('settings');
  settings.then(s => {
    if (s && s.syncMode === 'websocket') {
      const wsUrl = (s && s.wsServerUrl) || WS_SERVER_URL;
      const manager = initializeWebSocket({
        url: wsUrl,
        enableConflictResolution: true,
        reconnectInterval: 5000,
        maxReconnectAttempts: 10
      });
      
      manager.connect();
      
      // Set up conflict resolution
      manager.setConflictResolution({
        strategy: 'merge',
        onConflict: mergeTokenConflicts
      });
      
      // Listen for token updates
      window.addEventListener('message', (event) => {
        const message = event.data.pluginMessage;
        if (message && message.type === 'WEBSOCKET_UPDATE' && message.data.tokens) {
          onTokenUpdate(message.data.tokens);
        }
      });
    } else {
      console.warn('Real-time sync requires WebSocket mode');
    }
  });
}

// Cleanup real-time sync
export function cleanupRealtimeSync() {
  disconnectWebSocket();
}