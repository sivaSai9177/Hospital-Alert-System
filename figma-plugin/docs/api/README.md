# 📖 API Reference

Complete API documentation for the Figma Universal Design System Plugin.

## 🎯 Core APIs

### Plugin APIs
- [Message API](message-api.md) - Communication between plugin and UI
- [Handler API](handler-api.md) - Business logic handlers
- [Service API](service-api.md) - External service integrations

### Figma APIs Used
- [Node API](figma-node-api.md) - Working with Figma nodes
- [Style API](figma-style-api.md) - Managing styles and variables
- [Plugin API](figma-plugin-api.md) - Core plugin functionality

## 🔌 Plugin Message Types

### UI → Plugin Messages
```typescript
enum MessageType {
  // Token Operations
  EXTRACT_TOKENS = 'EXTRACT_TOKENS',
  IMPORT_TOKENS = 'IMPORT_TOKENS',
  VALIDATE_TOKENS = 'VALIDATE_TOKENS',
  
  // Sync Operations
  SYNC_TO_CODE = 'SYNC_TO_CODE',
  SYNC_FROM_CODE = 'SYNC_FROM_CODE',
  ENABLE_REALTIME_SYNC = 'ENABLE_REALTIME_SYNC',
  
  // Generation Operations
  GENERATE_COMPONENT_LIBRARY = 'GENERATE_COMPONENT_LIBRARY',
  EXPORT_DESIGN_DOCUMENTATION = 'EXPORT_DESIGN_DOCUMENTATION',
  GENERATE_TYPOGRAPHY_SYSTEM = 'GENERATE_TYPOGRAPHY_SYSTEM',
  
  // Operation Control
  PAUSE_OPERATION = 'PAUSE_OPERATION',
  RESUME_OPERATION = 'RESUME_OPERATION',
  CANCEL_OPERATION = 'CANCEL_OPERATION',
}
```

### Plugin → UI Messages
```typescript
enum MessageType {
  // Status Updates
  OPERATION_STARTED = 'OPERATION_STARTED',
  OPERATION_PROGRESS = 'OPERATION_PROGRESS',
  OPERATION_COMPLETED = 'OPERATION_COMPLETED',
  
  // Results
  TOKENS_EXTRACTED = 'TOKENS_EXTRACTED',
  COMPONENT_LIBRARY_GENERATED = 'COMPONENT_LIBRARY_GENERATED',
  DOCUMENTATION_EXPORTED = 'DOCUMENTATION_EXPORTED',
  
  // Errors
  ERROR = 'ERROR',
  OPERATION_FAILED = 'OPERATION_FAILED',
}
```

## 🛠 Handler APIs

### Token Extraction
```typescript
interface TokenExtractor {
  extractDesignTokens(): Promise<DesignTokens>;
  extractWithVariables(): Promise<DesignTokensWithVariables>;
  validateTokens(tokens: DesignTokens): ValidationResult;
}
```

### Component Generation
```typescript
interface ComponentGenerator {
  generate(options: ComponentGenerationOptions): Promise<GeneratedComponent>;
  generateLibrary(options: ComponentLibraryOptions): Promise<ComponentLibrary>;
}

interface ComponentGenerationOptions {
  framework: 'react' | 'vue' | 'angular' | 'react-native';
  typescript: boolean;
  styling: 'css' | 'styled-components' | 'tailwind';
  includeTests: boolean;
  includeStorybook: boolean;
}
```

### Synchronization
```typescript
interface SyncManager {
  syncToCode(tokens: DesignTokens, config: SyncConfig): Promise<SyncResult>;
  syncFromCode(): Promise<DesignTokens>;
  enableRealtimeSync(config: RealtimeSyncConfig): void;
  pauseSync(): void;
  resumeSync(): void;
}
```

## 🔍 Service APIs

### Qdrant Integration
```typescript
interface QdrantService {
  // Document Management
  indexDocument(doc: Document): Promise<void>;
  searchDocuments(query: string, limit?: number): Promise<SearchResult[]>;
  
  // Code Search
  indexCode(code: CodeSnippet): Promise<void>;
  findSimilarCode(query: string): Promise<CodeSnippet[]>;
  
  // API Patterns
  indexAPIPattern(pattern: APIPattern): Promise<void>;
  suggestAPI(description: string): Promise<APIPattern[]>;
}
```

### WebSocket Manager
```typescript
interface WebSocketManager {
  connect(): void;
  disconnect(): void;
  send(message: WebSocketMessage): void;
  on(event: string, handler: (data: any) => void): void;
  setConflictResolution(strategy: ConflictResolution): void;
}
```

## 📊 Data Types

### Design Tokens
```typescript
interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingToken[];
  effects: EffectToken[];
  animations: AnimationToken[];
}

interface ColorToken {
  name: string;
  value: string;
  rgb: RGB;
  hsl: HSL;
  opacity?: number;
  description?: string;
}

interface TypographyToken {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
}
```

### Operation Management
```typescript
interface Operation {
  id: string;
  type: OperationType;
  status: OperationStatus;
  progress: number;
  data?: any;
  error?: Error;
  startedAt: Date;
  completedAt?: Date;
}

type OperationStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
```

## 🔧 Configuration

### Plugin Configuration
```typescript
interface PluginConfig {
  // Sync Settings
  syncMode: 'manual' | 'auto' | 'realtime';
  conflictResolution: 'manual' | 'prefer-figma' | 'prefer-code';
  
  // Generation Settings
  defaultFramework: string;
  defaultStyling: string;
  includeTests: boolean;
  
  // Server Settings
  mcpServerUrl: string;
  wsServerUrl: string;
  qdrantUrl?: string;
}
```

## 📚 Examples

### Extract and Sync Tokens
```typescript
// Extract tokens from current page
const tokens = await extractDesignTokens();

// Validate tokens
const validation = validateTokens(tokens);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}

// Sync to code
const syncResult = await syncToCode(tokens, {
  direction: 'figma-to-code',
  conflictResolution: 'prefer-figma'
});
```

### Generate Component Library
```typescript
// Generate React components
const library = await generateComponentLibrary({
  framework: 'react',
  typescript: true,
  styling: 'styled-components',
  includeTests: true,
  includeStorybook: true,
  components: selectedComponents
});

// Export documentation
await exportDesignDocumentation({
  format: 'markdown',
  includeImages: true,
  sections: ['colors', 'typography', 'components']
});
```

### Real-time Sync with WebSocket
```typescript
// Initialize WebSocket connection
wsManager.connect();

// Set up conflict resolution
wsManager.setConflictResolution({
  strategy: 'prefer-latest',
  autoResolve: true
});

// Handle updates
wsManager.on('design-update', (update) => {
  applyUpdate(update);
});
```

## 🔗 Related Documentation

- [Handler Implementation Guide](../guides/implementing-handlers.md)
- [Plugin Architecture](../architecture/plugin-architecture.md)
- [Figma API Best Practices](../guides/figma-api-best-practices.md)
- [Testing Guide](../guides/testing.md)