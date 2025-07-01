# 🎨 Figma Universal Design System Plugin

A powerful Figma plugin that bridges design and code, featuring AI-powered assistance, real-time synchronization, and comprehensive design system management.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📚 Documentation Hub

### Core Documentation
- [**Architecture Overview**](docs/architecture/README.md) - System design and technical architecture
- [**API Reference**](docs/api/README.md) - Complete API documentation
- [**Developer Guides**](docs/guides/README.md) - Step-by-step tutorials
- [**Examples**](docs/examples/README.md) - Code snippets and recipes

### Quick Links
- [Getting Started Guide](docs/guides/getting-started.md)
- [Design Token Extraction](docs/guides/design-tokens.md)
- [Component Library Generation](docs/guides/component-generation.md)
- [Real-time Sync Setup](docs/guides/realtime-sync.md)

## 🔍 Intelligent Search (Powered by Qdrant)

Our plugin features semantic search capabilities:
- **Natural Language Queries**: Find documentation using plain English
- **Code Discovery**: Search for code examples and implementations
- **API Pattern Matching**: Find the right Figma API for your use case
- **Error Solutions**: Quick fixes for common issues

## 🛠 Features

### Design System Management
| Feature | Description | Status |
|---------|-------------|---------|
| **Token Extraction** | Extract colors, typography, spacing, effects | ✅ Production |
| **Variable Support** | Figma variables and local styles | ✅ Production |
| **Component Analysis** | Analyze and document components | ✅ Production |
| **Design Documentation** | Export comprehensive docs (MD, HTML, PDF) | ✅ Production |

### Code Generation
| Feature | Description | Status |
|---------|-------------|---------|
| **React Components** | Generate React/React Native components | ✅ Production |
| **Vue Components** | Generate Vue 3 components | ✅ Production |
| **Angular Components** | Generate Angular components | ✅ Production |
| **Tailwind Tokens** | Generate Tailwind config | ✅ Production |
| **CSS Variables** | Generate CSS custom properties | ✅ Production |

### Synchronization
| Feature | Description | Status |
|---------|-------------|---------|
| **Real-time Sync** | WebSocket-based live updates | ✅ Production |
| **Bidirectional Sync** | Figma ↔ Code synchronization | ✅ Production |
| **Conflict Resolution** | Smart merge strategies | ✅ Production |
| **Operation Queue** | Pause/resume with checkpoints | ✅ Production |

### AI-Powered Features
| Feature | Description | Status |
|---------|-------------|---------|
| **AI Assistant** | Natural language commands | ✅ Production |
| **Smart Suggestions** | Context-aware recommendations | ✅ Production |
| **Code Generation** | AI-powered component creation | ✅ Production |
| **Design Analysis** | Automated design reviews | ✅ Production |

## 📖 Figma API Integration

### Node Manipulation
```typescript
// Access current selection
const nodes = figma.currentPage.selection;

// Create new elements
const rect = figma.createRectangle();
rect.x = 100;
rect.y = 100;
rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
```

### Style Management
```typescript
// Create paint style
const style = figma.createPaintStyle();
style.name = "Primary/500";
style.paints = [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 1 } }];
```

### Event Handling
```typescript
// Listen for selection changes
figma.on('selectionchange', () => {
  const selected = figma.currentPage.selection;
  figma.ui.postMessage({ type: 'selection-changed', nodes: selected });
});
```

### Plugin Communication
```typescript
// Send message to UI
figma.ui.postMessage({ type: 'tokens-extracted', data: tokens });

// Receive message from UI
figma.ui.onmessage = (msg) => {
  if (msg.type === 'create-component') {
    // Handle component creation
  }
};
```

## 🏗 Architecture

### Plugin Structure
```
figma-plugin/
├── src/
│   ├── code.ts           # Main plugin code (runs in Figma)
│   ├── ui/               # React UI (runs in iframe)
│   ├── handlers/         # Business logic handlers
│   ├── lib/              # Core libraries
│   ├── services/         # External services
│   └── types/            # TypeScript definitions
├── docs/                 # Comprehensive documentation
├── scripts/              # Build and utility scripts
└── mcp-server/          # Model Context Protocol server
```

### Key Technologies
- **Frontend**: React, TanStack Router, Zustand, Tailwind CSS
- **Backend**: TypeScript, MCP Protocol, WebSocket
- **AI/ML**: Qdrant Vector DB, OpenAI Embeddings
- **Build**: Vite, Bun, Custom transpilation

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ or Bun 1.0+
- Figma Desktop App
- Git

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd figma-plugin
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development:
```bash
npm run dev
```

5. Load in Figma:
   - Open Figma Desktop
   - Go to Plugins → Development → Import plugin from manifest
   - Select `manifest.json` from this directory

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Figma Plugin API team for excellent documentation
- Model Context Protocol for standardized AI integration
- Qdrant for powerful vector search capabilities

---

For more detailed information, explore our [comprehensive documentation](docs/).