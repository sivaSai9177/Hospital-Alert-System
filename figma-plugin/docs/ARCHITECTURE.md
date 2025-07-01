# Architecture Overview

## System Design

The Design System Agent is built with a modern, modular architecture that separates concerns and enables real-time collaboration between Figma, the plugin UI, and external services.

## Components

### 1. Figma Plugin Layer (`src/code.ts`)
- **Purpose**: Interface with Figma's API
- **Responsibilities**:
  - Handle Figma selection events
  - Execute frame mutations
  - Extract design tokens
  - Manage plugin lifecycle
- **Key APIs**:
  - `figma.currentPage.selection` - Track selected elements
  - `figma.variables` - Manage design variables
  - `figma.ui.postMessage()` - Communicate with UI

### 2. React UI Layer (`src/ui/`)
- **Framework**: React 18 + TypeScript
- **Routing**: TanStack Router (file-based)
- **State Management**: React Query + Local state
- **Styling**: Tailwind CSS with Figma theme
- **Key Components**:
  - `__root.tsx` - Main layout with navigation
  - `index.tsx` - Multi-frame inspector
  - `mutations.tsx` - Frame mutation panel
  - `agent.tsx` - AI assistant interface
  - `settings.tsx` - Configuration

### 3. Communication Bridge (`src/ui/lib/figma-bridge.tsx`)
- **Purpose**: Bidirectional communication between Figma and UI
- **Features**:
  - Type-safe message passing
  - Promise-based API for async operations
  - Event subscription system
  - Error handling and timeouts
- **Message Types**:
  - `SELECTION_CHANGED` - Figma selection updates
  - `INSPECT_FRAME` - Request frame inspection
  - `MUTATE_FRAME` - Apply frame changes
  - `BATCH_MUTATE_FRAMES` - Bulk operations

### 4. MCP Server (`mcp-server/`)
- **Purpose**: Bridge between Figma plugin and AI services
- **Technologies**:
  - Model Context Protocol (MCP)
  - tRPC for type-safe APIs
  - WebSocket for real-time updates
- **Endpoints**:
  - `/trpc/figma.mutateFrame` - Single frame mutations
  - `/trpc/figma.batchMutateFrames` - Batch operations
  - `/trpc/figma.analyzeFrame` - AI analysis
  - `/trpc/figma.generateComponent` - Code generation

## Data Flow

### Selection Change Flow
```
1. User selects frames in Figma
2. Figma fires 'selectionchange' event
3. Plugin sends SELECTION_CHANGED message to UI
4. UI updates selection state
5. Inspector automatically fetches frame data
6. Results displayed in real-time
```

### Frame Mutation Flow
```
1. User configures mutations in UI
2. UI sends MUTATE_FRAME message
3. Plugin receives message with frame ID and changes
4. Plugin applies changes using Figma API
5. Plugin sends success/error response
6. UI updates to reflect changes
```

### AI Analysis Flow
```
1. User triggers AI analysis
2. UI sends request to MCP server via tRPC
3. MCP server processes with AI model
4. Results returned through tRPC
5. UI displays analysis/suggestions
6. User can apply suggested changes
```

## Key Design Patterns

### 1. Message-Based Architecture
All communication between Figma and the UI uses a message-passing system with:
- Typed message schemas (Zod)
- Request/response correlation
- Timeout handling
- Error boundaries

### 2. Optimistic Updates
Frame mutations use optimistic updates:
- UI shows changes immediately
- Rollback on error
- Batch operations for performance

### 3. Plugin Context Isolation
The plugin runs in two contexts:
- **Main thread**: Figma API access
- **UI iframe**: React application

Communication between contexts is restricted to postMessage.

### 4. Type Safety
End-to-end type safety using:
- TypeScript throughout
- Zod schemas for validation
- tRPC for API contracts
- Shared types between layers

## Performance Considerations

### 1. Frame Inspection
- Limit to 5 frames for optimal performance
- Lazy load hierarchy data
- Cache inspection results

### 2. Batch Operations
- Group mutations into transactions
- Use requestIdleCallback for large operations
- Debounce rapid changes

### 3. UI Responsiveness
- Virtual scrolling for large lists
- React.memo for expensive components
- Debounced search inputs

## Security

### 1. Sandboxed Environment
- Plugin runs in Figma's sandbox
- No direct file system access
- Limited network requests

### 2. Message Validation
- All messages validated with Zod
- Sanitize user inputs
- Rate limiting on operations

### 3. MCP Server Security
- Optional API key authentication
- CORS configuration
- Input validation

## Extensibility

### Adding New Features

1. **New Route**: Create file in `src/ui/routes/`
2. **New Message Type**: Add to bridge and handler
3. **New tRPC Endpoint**: Add to `figma.ts` router
4. **New Token Type**: Extend extractors

### Plugin API Extensions
The architecture supports:
- Custom token extractors
- Additional frame properties
- New mutation types
- External service integrations

## Testing Strategy

### Unit Tests
- Component logic
- Message handlers
- Token extractors

### Integration Tests
- Message flow
- API endpoints
- Frame mutations

### E2E Tests
- Full user workflows
- Cross-context communication
- Error scenarios