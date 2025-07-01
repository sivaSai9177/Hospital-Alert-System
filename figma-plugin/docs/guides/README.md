# 📚 Developer Guides

Step-by-step guides for working with the Figma Universal Design System Plugin.

## 🚀 Getting Started

### Essential Guides
1. [**Getting Started**](getting-started.md) - Initial setup and first steps
2. [**Design Token Extraction**](design-tokens.md) - Extract and manage design tokens
3. [**Component Generation**](component-generation.md) - Generate framework components
4. [**Real-time Sync**](realtime-sync.md) - Set up bidirectional synchronization

## 💻 Development Guides

### Plugin Development
- [Plugin Development Basics](plugin-development.md)
- [Implementing Handlers](implementing-handlers.md)
- [Working with Figma API](figma-api-best-practices.md)
- [Testing Your Code](testing.md)

### Advanced Features
- [AI Integration](ai-integration.md)
- [Qdrant Vector Search](qdrant-integration.md)
- [WebSocket Communication](websocket-guide.md)
- [Operation Queue Management](operation-queue.md)

## 🎨 Design System Guides

### Token Management
- [Color System Setup](color-system.md)
- [Typography Configuration](typography-system.md)
- [Spacing and Layout](spacing-system.md)
- [Animation Tokens](animation-tokens.md)

### Component Library
- [Component Architecture](component-architecture.md)
- [Variant Management](variant-management.md)
- [Documentation Generation](documentation-generation.md)

## 🔧 Configuration & Deployment

### Setup Guides
- [Environment Configuration](environment-setup.md)
- [MCP Server Setup](mcp-server-setup.md)
- [Production Deployment](deployment.md)
- [CI/CD Pipeline](ci-cd-setup.md)

### Integration Guides
- [Git Integration](git-integration.md)
- [Design System Workflow](design-system-workflow.md)
- [Team Collaboration](team-collaboration.md)

## 📖 Quick Start Examples

### Extract Design Tokens
```typescript
// In your plugin code
const tokens = await extractDesignTokens();
console.log('Extracted tokens:', tokens);

// Send to UI
figma.ui.postMessage({
  type: MessageType.TOKENS_EXTRACTED,
  data: tokens
});
```

### Generate React Component
```typescript
// From UI
parent.postMessage({
  pluginMessage: {
    type: MessageType.GENERATE_COMPONENT_LIBRARY,
    data: {
      framework: 'react',
      components: selectedNodes,
      options: {
        typescript: true,
        styling: 'styled-components'
      }
    }
  }
}, '*');
```

### Enable Real-time Sync
```typescript
// Initialize WebSocket connection
const wsManager = new WebSocketManager({
  url: 'ws://localhost:3458',
  reconnect: true
});

// Start syncing
wsManager.on('connect', () => {
  console.log('Real-time sync enabled');
});
```

## 🏗 Architecture Patterns

### Handler Pattern
```typescript
export class MyHandler {
  async handle(data: any): Promise<Result> {
    // Validate input
    const validation = this.validate(data);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    // Process operation
    const result = await this.process(data);
    
    // Return result
    return result;
  }
}
```

### Store Pattern (Zustand)
```typescript
interface StoreState {
  items: Item[];
  loading: boolean;
  error: Error | null;
  
  // Actions
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

const useStore = create<StoreState>((set) => ({
  items: [],
  loading: false,
  error: null,
  
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
  
  removeItem: (id) => set((state) => ({
    items: state.items.filter(item => item.id !== id)
  })),
  
  setLoading: (loading) => set({ loading })
}));
```

## 🐛 Troubleshooting

### Common Issues
- [Plugin Not Loading](troubleshooting/plugin-not-loading.md)
- [Token Extraction Errors](troubleshooting/token-errors.md)
- [Sync Issues](troubleshooting/sync-issues.md)
- [Build Problems](troubleshooting/build-problems.md)

### Debug Tools
```typescript
// Enable debug logging
window.DEBUG = true;

// Use debug logger
import { logger } from './lib/debug/client-logger';
logger.debug('Component rendered', { props });

// Monitor operations
operationQueue.on('operation:start', (op) => {
  console.log('Operation started:', op);
});
```

## 📚 Best Practices

### Code Organization
1. Keep handlers focused and single-purpose
2. Use TypeScript for type safety
3. Implement proper error boundaries
4. Write tests for critical paths

### Performance
1. Batch operations when possible
2. Use lazy loading for heavy components
3. Implement proper caching strategies
4. Monitor memory usage

### Security
1. Validate all inputs
2. Sanitize user-generated content
3. Use secure communication channels
4. Follow least-privilege principle

## 🔗 Additional Resources

### External Links
- [Figma Plugin API Docs](https://www.figma.com/plugin-docs/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)

### Community
- [GitHub Discussions](https://github.com/your-repo/discussions)
- [Discord Community](https://discord.gg/your-invite)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/figma-plugin)

---

Need help? Check our [FAQ](faq.md) or [open an issue](https://github.com/your-repo/issues).