# Design System Agent - Figma Plugin

A powerful AI-driven Figma plugin that enables real-time design system synchronization, multi-frame inspection, and intelligent design mutations using Model Context Protocol (MCP) and modern React architecture.

## Features

### 🔍 Multi-Frame Inspector
- Select and inspect multiple frames simultaneously
- Deep property analysis with visual hierarchy
- Real-time selection sync with Figma
- Compare properties across frames

### 🛠️ Frame Mutations
- Real-time frame property editing
- Batch mutations with transaction support
- Preset layouts (Card, List, Responsive Grid)
- Undo/redo functionality
- Visual preview of changes

### 🤖 AI Design Agent
- Natural language design commands
- Auto-optimize layouts and performance
- Generate components from descriptions
- Smart issue detection and auto-fix
- Design pattern analysis

### 🔄 Token Synchronization
- Extract design tokens from Figma
- Two-way sync with codebase
- Real-time updates via WebSocket
- TypeScript-first token management

### 🏗️ Modern Architecture
- Built with Vite + React + TypeScript
- TanStack Router for file-based routing
- tRPC for type-safe API calls
- Tailwind CSS with Figma-themed design
- MCP server integration

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Start development mode:
   ```bash
   bun run dev
   ```
   This will:
   - Start Vite dev server for the UI (http://localhost:3457)
   - Watch and rebuild plugin code
   - Start MCP server (http://localhost:3456)

4. In Figma:
   - Go to Plugins → Development → Import plugin from manifest
   - Select the `manifest.json` file from this directory
   - Run the plugin from Plugins → Development → Design System Agent

## Development

### Project Structure
```
figma-plugin/
├── src/
│   ├── code.ts              # Figma plugin API
│   ├── ui/                  # React UI application
│   │   ├── routes/          # TanStack Router pages
│   │   │   ├── __root.tsx   # Layout with navigation
│   │   │   ├── index.tsx    # Multi-frame inspector
│   │   │   ├── mutations.tsx # Frame mutation panel
│   │   │   ├── agent.tsx    # AI assistant
│   │   │   └── settings.tsx # Plugin settings
│   │   ├── lib/             # Core utilities
│   │   │   ├── trpc.tsx     # tRPC client setup
│   │   │   ├── figma-bridge.tsx # Figma API bridge
│   │   │   └── utils.ts     # Helper functions
│   │   ├── styles/          # Global styles
│   │   └── main.tsx         # App entry point
│   ├── handlers/            # Figma API handlers
│   └── extractors/          # Token extraction
├── mcp-server/              # MCP + tRPC server
│   └── src/
│       ├── routers/         # tRPC routers
│       │   └── figma.ts     # Figma operations
│       └── server.ts        # MCP server
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind setup
└── manifest.json            # Figma manifest
```

### Running in Development

```bash
# Start everything (recommended)
bun run dev

# Or run services individually:
bun run ui:dev          # Vite dev server
bun run build:plugin:watch  # Plugin code watcher
bun run mcp:server      # MCP server

# Build for production
bun run build
```

### UI Development

The UI is built with:
- **Vite**: Fast HMR and builds
- **React 18**: Modern React with hooks
- **TanStack Router**: File-based routing
- **tRPC**: Type-safe API calls
- **Tailwind CSS**: Figma-themed styling

Access the UI dev server at http://localhost:3457 (but it needs to run inside Figma to function properly).

## Usage

### Multi-Frame Inspector
1. Select frames in Figma (up to 5 for best performance)
2. Navigate to the Inspector tab
3. View detailed properties, dimensions, and hierarchy
4. Compare properties across multiple frames

### Frame Mutations
1. Select frames to modify
2. Go to Mutations tab
3. Use presets or custom properties
4. Preview changes in real-time
5. Apply mutations with one click

### AI Design Agent
1. Open the AI Agent tab
2. Use natural language or commands:
   - `/analyze` - Deep frame analysis
   - `/optimize` - Auto-optimize layouts
   - `/generate [description]` - Create components
   - `/fix` - Auto-fix common issues
3. Chat naturally for design assistance

### Token Sync
1. Extract tokens: Click "Extract Design Tokens"
2. Sync to code: "Sync to Code →"
3. Import from code: "← Sync from Code"
4. Manage tokens in Settings

## MCP Server Integration

The plugin includes an enhanced MCP server with tRPC support:

### Features
- tRPC router for type-safe communication
- WebSocket support for real-time updates
- Frame mutation endpoints
- AI-powered analysis and suggestions

### Claude Desktop Integration
```json
// Add to Claude Desktop config
{
  "mcpServers": {
    "design-system-agent": {
      "command": "bun",
      "args": ["run", "/path/to/figma-plugin/mcp-server/src/server.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### API Endpoints
- `POST /trpc/figma.mutateFrame` - Mutate single frame
- `POST /trpc/figma.batchMutateFrames` - Batch mutations
- `POST /trpc/figma.analyzeFrame` - AI frame analysis
- `POST /trpc/figma.generateComponent` - Component generation
- `WS /trpc` - WebSocket subscriptions

## Architecture

### Frontend (Figma Plugin UI)
- **React 18** with TypeScript
- **TanStack Router** for file-based routing
- **tRPC** client for type-safe API calls
- **Tailwind CSS** with custom Figma theme
- **Zustand** for local state management

### Backend (MCP Server)
- **MCP SDK** for Claude integration
- **tRPC** server for API endpoints
- **WebSocket** for real-time updates
- **Zod** for schema validation

### Communication Flow
```
Figma Plugin ←→ React UI ←→ tRPC Client ←→ MCP Server ←→ Claude Desktop
                    ↓
                WebSocket
                    ↓
              Real-time Updates
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details