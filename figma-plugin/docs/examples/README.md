# 💡 Code Examples

Practical code examples and recipes for common tasks with the Figma Universal Design System Plugin.

## 📋 Quick Examples

### Basic Token Extraction
```typescript
// Extract all design tokens from current page
async function extractAllTokens() {
  const tokens = await extractDesignTokens();
  
  // Process tokens
  const processed = {
    colors: tokens.colors.filter(c => c.name.includes('primary')),
    typography: tokens.typography.filter(t => t.name.includes('heading')),
    spacing: tokens.spacing
  };
  
  return processed;
}
```

### Component Generation
```typescript
// Generate React component from selected node
async function generateReactComponent(node: SceneNode) {
  const componentDef = {
    name: node.name,
    type: node.type,
    properties: extractProperties(node),
    styles: extractStyles(node)
  };
  
  const generated = await componentLibraryGenerator.generate({
    framework: 'react',
    components: [componentDef],
    options: {
      typescript: true,
      styling: 'styled-components',
      includeTests: true
    }
  });
  
  return generated;
}
```

## 🎨 Design Token Examples

### Color Token Extraction
```typescript
// Extract color tokens with semantic naming
function extractColorTokens(node: SceneNode): ColorToken[] {
  const colors: ColorToken[] = [];
  
  if ('fills' in node && node.fills !== figma.mixed) {
    node.fills.forEach((fill, index) => {
      if (fill.type === 'SOLID') {
        colors.push({
          name: generateColorName(node.name, index),
          value: rgbToHex(fill.color),
          rgb: fill.color,
          opacity: fill.opacity || 1,
          description: `Color from ${node.name}`
        });
      }
    });
  }
  
  return colors;
}

function generateColorName(nodeName: string, index: number): string {
  // Convert "Primary Button" to "primary-button-0"
  return `${nodeName.toLowerCase().replace(/\s+/g, '-')}-${index}`;
}
```

### Typography Token Extraction
```typescript
// Extract typography tokens with complete properties
async function extractTypographyTokens(textNode: TextNode): Promise<TypographyToken[]> {
  const tokens: TypographyToken[] = [];
  
  // Load fonts first
  await figma.loadFontAsync(textNode.fontName as FontName);
  
  const token: TypographyToken = {
    name: generateTypographyName(textNode.name),
    fontFamily: textNode.fontName.family,
    fontSize: textNode.fontSize,
    fontWeight: getFontWeight(textNode.fontName.style),
    lineHeight: textNode.lineHeight,
    letterSpacing: textNode.letterSpacing,
    textTransform: textNode.textCase,
    textDecoration: textNode.textDecoration
  };
  
  tokens.push(token);
  return tokens;
}
```

## 🔄 Synchronization Examples

### Real-time Sync Setup
```typescript
// Set up bidirectional real-time sync
class RealtimeSync {
  private ws: WebSocketManager;
  private syncState: SyncStateManager;
  
  constructor() {
    this.ws = new WebSocketManager({
      url: process.env.WEBSOCKET_URL,
      reconnect: true,
      reconnectInterval: 5000
    });
    
    this.syncState = new SyncStateManager();
  }
  
  async initialize() {
    // Connect to WebSocket
    await this.ws.connect();
    
    // Set up event handlers
    this.ws.on('design-update', this.handleDesignUpdate.bind(this));
    this.ws.on('conflict', this.handleConflict.bind(this));
    
    // Listen for Figma changes
    figma.on('documentchange', this.handleDocumentChange.bind(this));
  }
  
  private async handleDocumentChange(event: DocumentChangeEvent) {
    // Create change payload
    const changes = {
      type: 'design-change',
      timestamp: Date.now(),
      changes: event.documentChanges,
      user: figma.currentUser
    };
    
    // Send to server
    this.ws.send(changes);
    
    // Save checkpoint
    this.syncState.saveCheckpoint({
      id: generateId(),
      timestamp: Date.now(),
      changes
    });
  }
  
  private async handleDesignUpdate(update: any) {
    // Apply remote changes to Figma
    for (const change of update.changes) {
      await this.applyChange(change);
    }
  }
  
  private async handleConflict(conflict: any) {
    // Resolve conflict based on strategy
    const resolution = this.syncState.resolveConflict(
      conflict.local,
      conflict.remote
    );
    
    // Apply resolution
    await this.applyChange(resolution);
  }
}
```

### Batch Token Sync
```typescript
// Sync tokens in batches for better performance
async function batchSyncTokens(tokens: DesignTokens) {
  const batchProcessor = new BatchProcessor({
    batchSize: 50,
    delay: 100
  });
  
  // Add color tokens
  tokens.colors.forEach(color => {
    batchProcessor.add(async () => {
      await syncColorToken(color);
    });
  });
  
  // Add typography tokens
  tokens.typography.forEach(typo => {
    batchProcessor.add(async () => {
      await syncTypographyToken(typo);
    });
  });
  
  // Process all batches
  await batchProcessor.processAll();
}
```

## 🤖 AI Integration Examples

### Semantic Search with Qdrant
```typescript
// Search for similar design patterns
class DesignPatternSearch {
  private qdrant: QdrantClient;
  private embedder: EmbeddingService;
  
  async searchSimilarPatterns(query: string): Promise<DesignPattern[]> {
    // Generate embedding for query
    const queryEmbedding = await this.embedder.generateEmbedding(query);
    
    // Search in Qdrant
    const results = await this.qdrant.search({
      collection: 'design-patterns',
      vector: queryEmbedding,
      limit: 10,
      withPayload: true
    });
    
    // Transform results
    return results.map(result => ({
      id: result.id,
      name: result.payload.name,
      description: result.payload.description,
      code: result.payload.code,
      score: result.score
    }));
  }
  
  async indexPattern(pattern: DesignPattern) {
    // Generate embedding
    const embedding = await this.embedder.generateEmbedding(
      `${pattern.name} ${pattern.description}`
    );
    
    // Store in Qdrant
    await this.qdrant.upsert({
      collection: 'design-patterns',
      points: [{
        id: pattern.id,
        vector: embedding,
        payload: pattern
      }]
    });
  }
}
```

### AI-Powered Code Generation
```typescript
// Generate code using AI suggestions
async function generateWithAI(node: SceneNode, prompt: string) {
  // Extract node properties
  const nodeData = {
    type: node.type,
    name: node.name,
    properties: extractAllProperties(node),
    children: 'children' in node ? node.children.length : 0
  };
  
  // Get AI suggestions
  const suggestions = await aiService.generateCode({
    context: nodeData,
    prompt: prompt,
    framework: 'react',
    examples: await findSimilarExamples(nodeData)
  });
  
  // Apply best suggestion
  const bestSuggestion = suggestions[0];
  return formatCode(bestSuggestion.code);
}
```

## 🛠 Utility Examples

### Error Handling Pattern
```typescript
// Comprehensive error handling
class OperationHandler {
  async execute<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<Result<T>> {
    const startTime = Date.now();
    
    try {
      // Log operation start
      logger.info(`Starting ${context}`, {
        timestamp: startTime
      });
      
      // Execute operation
      const result = await operation();
      
      // Log success
      logger.info(`Completed ${context}`, {
        duration: Date.now() - startTime
      });
      
      return {
        success: true,
        data: result
      };
    } catch (error) {
      // Log error
      logger.error(`Failed ${context}`, {
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });
      
      // Send error to UI
      figma.ui.postMessage({
        type: MessageType.ERROR,
        data: {
          message: `Operation failed: ${context}`,
          error: error.message
        }
      });
      
      return {
        success: false,
        error: error
      };
    }
  }
}
```

### Performance Monitoring
```typescript
// Monitor operation performance
class PerformanceMonitor {
  private metrics: Map<string, Metric[]> = new Map();
  
  async measure<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await operation();
      this.recordMetric(name, performance.now() - start, true);
      return result;
    } catch (error) {
      this.recordMetric(name, performance.now() - start, false);
      throw error;
    }
  }
  
  private recordMetric(name: string, duration: number, success: boolean) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push({
      duration,
      success,
      timestamp: Date.now()
    });
    
    // Clean old metrics (keep last 100)
    const metrics = this.metrics.get(name)!;
    if (metrics.length > 100) {
      metrics.shift();
    }
  }
  
  getStats(name: string): Stats {
    const metrics = this.metrics.get(name) || [];
    
    return {
      count: metrics.length,
      avgDuration: avg(metrics.map(m => m.duration)),
      successRate: metrics.filter(m => m.success).length / metrics.length,
      p95Duration: percentile(metrics.map(m => m.duration), 0.95)
    };
  }
}
```

## 📦 Complete Workflows

### Design System Export Workflow
```typescript
// Complete workflow for exporting design system
async function exportDesignSystem() {
  const monitor = new PerformanceMonitor();
  const operations: Operation[] = [];
  
  // Step 1: Extract all tokens
  const tokens = await monitor.measure('extract-tokens', async () => {
    return await extractDesignTokens();
  });
  
  operations.push({
    id: 'extract',
    name: 'Token Extraction',
    status: 'completed',
    duration: monitor.getStats('extract-tokens').avgDuration
  });
  
  // Step 2: Validate tokens
  const validation = await monitor.measure('validate-tokens', async () => {
    return validateTokens(tokens);
  });
  
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Step 3: Generate components
  const components = await monitor.measure('generate-components', async () => {
    return await componentLibraryGenerator.generate({
      framework: 'react',
      components: tokens.components,
      options: {
        typescript: true,
        styling: 'styled-components',
        includeTests: true,
        includeStorybook: true
      }
    });
  });
  
  // Step 4: Export documentation
  const docs = await monitor.measure('export-docs', async () => {
    return await designDocumentationExporter.export({
      format: 'markdown',
      tokens,
      components,
      includeImages: true,
      includeInteractive: true
    });
  });
  
  // Step 5: Sync to code repository
  const syncResult = await monitor.measure('sync-to-code', async () => {
    return await syncToCode({
      tokens,
      components,
      documentation: docs
    });
  });
  
  // Return complete result
  return {
    tokens,
    components,
    documentation: docs,
    syncResult,
    performance: {
      totalDuration: operations.reduce((sum, op) => sum + op.duration, 0),
      operations
    }
  };
}
```

## 🔗 More Examples

- [Component Patterns](component-patterns.md)
- [Token Transformations](token-transformations.md)
- [Advanced Sync Patterns](advanced-sync.md)
- [Testing Examples](testing-examples.md)
- [Plugin UI Examples](ui-examples.md)