# Feature Comparison: dist/index.html vs src/ui/routes

This document compares the features implemented in the current `dist/index.html` with the planned routes in the `src/ui/routes` directory.

## Current Implementation (dist/index.html)

The current HTML implementation includes these tabs/features:

1. **Dashboard** ✅
   - Active operations queue with pause/resume/cancel controls
   - Recent activity feed
   - Design system stats (tokens, components, spacing, effects)
   - Connection status indicator

2. **Tokens** ✅
   - Extract all tokens
   - Import tokens
   - Validate tokens
   - Token preview
   - Sync to code

3. **Sync** ✅
   - Realtime sync toggle
   - Sync to/from code
   - Connection status
   - WebSocket configuration

4. **Mutations** ✅
   - Mutation presets (Card Layout, List Layout, Grid Layout, Hero Section)
   - Batch operations on frames
   - Progress tracking
   - Operation controls (pause/resume/cancel)

5. **Agent** ✅
   - AI chat interface
   - Message history
   - Quick actions (Analyze, Optimize, Fix Issues)

6. **Memory** ✅
   - Store current pattern
   - Find similar patterns
   - Export memory
   - Memory stats (patterns, mutations, success rate, preferences)

7. **Inspect** ✅
   - Inspect selected elements
   - Get all frames
   - Find issues
   - Create preset frames

8. **Components** ✅
   - Analyze components
   - Generate components
   - Component stats

9. **Colors** ✅
   - Extract all colors
   - Sync extracted colors
   - Apply extracted theme
   - Color palette display

10. **Pages** ✅
    - Create new pages
    - List all pages
    - Navigate to pages

11. **Generation** ✅
    - Generate design system pages
    - Generate typography system
    - Generate spacing system
    - Generate component library

12. **Settings** ✅
    - MCP Server URL configuration
    - WebSocket Server URL configuration

## Planned Routes (src/ui/routes)

The React/TypeScript implementation includes these routes:

1. **Dashboard** (`/`) ✅
   - Quick actions (Extract Colors, Typography, Spacing, Sync Tokens)
   - Active operations with detailed progress
   - Navigation cards to other tools
   - Recent activity feed
   - Selection info

2. **Search** (`/search`) ❌ **MISSING IN DIST**
   - Smart search functionality
   - Search documentation, code examples, patterns
   - Popular searches
   - Search tips

3. **Inspector** (`/inspector`) ✅
   - Deep dive into element properties
   - Selection-based inspection

4. **Mutations** (`/mutations`) ✅
   - Frame mutations with property editor
   - Mutation presets
   - Active mutations tracking
   - Undo functionality
   - Property panel for detailed editing

5. **Design System** (`/design-system`) ✅
   - Token management
   - Component management

6. **Agent** (`/agent`) ✅
   - AI assistance

7. **Memory** (`/memory`) ✅
   - Pattern storage

8. **Settings** (`/settings`) ✅
   - Configuration

## Missing Features/Tabs

### In dist/index.html but not in routes:
- **Tokens** tab (separate from Design System)
- **Sync** tab (separate functionality)
- **Components** tab (merged into Design System in routes)
- **Colors** tab (likely part of Design System)
- **Pages** tab
- **Generation** tab

### In routes but not in dist/index.html:
- **Search** tab/functionality

## Key Differences

1. **Architecture**:
   - `dist/index.html`: Monolithic HTML/CSS/JS file with inline scripts
   - `src/ui/routes`: Modern React with TypeScript, routing, and component architecture

2. **State Management**:
   - `dist/index.html`: Global variables and DOM manipulation
   - `src/ui/routes`: React hooks, context providers, and proper state management

3. **UI Framework**:
   - `dist/index.html`: Custom CSS with Figma design tokens
   - `src/ui/routes`: Tailwind CSS with custom Figma utilities

4. **Navigation**:
   - `dist/index.html`: Tab-based with onclick handlers
   - `src/ui/routes`: Proper routing with TanStack Router

5. **Features Organization**:
   - `dist/index.html`: More granular tabs (12 total)
   - `src/ui/routes`: More consolidated (8 routes)

## Recommendations

1. **Add Search Route**: The Search functionality from the routes should be added to the dist implementation
2. **Consolidate Features**: Consider whether all 12 tabs are necessary or if some can be merged
3. **Maintain Feature Parity**: Ensure all functionality from dist/index.html is preserved when migrating to the React implementation
4. **Progressive Migration**: Consider migrating one tab at a time to the new architecture