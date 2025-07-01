# Figma Plugin Implementation Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Implementation Journey](#implementation-journey)
4. [Key Features](#key-features)
5. [Technical Details](#technical-details)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)
8. [Future Improvements](#future-improvements)

## Project Overview

The Universal Design System Sync plugin bridges the gap between design and development by enabling seamless synchronization of design tokens between Figma and your codebase. Built with modern web technologies and the Figma Variables API, it provides a robust solution for maintaining design consistency across platforms.

### Core Objectives
- Extract real design tokens from existing codebases
- Apply tokens to Figma using the Variables API
- Enable bidirectional synchronization
- Generate production-ready code from Figma designs
- Provide error recovery and retry mechanisms
- Support multiple file formats for different frameworks

## Architecture

### Plugin Structure
```
figma-plugin/
├── src/
│   ├── code.ts                      # Main plugin controller
│   ├── ui/
│   │   └── simple.tsx              # UI without React (for compatibility)
│   ├── handlers/
│   │   ├── token-applier-atomic.ts # Figma Variables API implementation
│   │   ├── token-extractor.ts      # Legacy token extraction
│   │   ├── token-extractor-variables.ts # Variables API extraction
│   │   ├── mcp-sync.ts            # MCP server communication
│   │   └── code-generator.ts      # Code generation from tokens
│   ├── extractors/
│   │   ├── unified-token-mapper.ts # Combines all extractors
│   │   ├── css-variable-extractor.ts
│   │   ├── theme-extractor.ts
│   │   ├── spacing-extractor.ts
│   │   ├── typography-extractor.ts
│   │   ├── animation-extractor.ts  # Animation tokens
│   │   ├── effect-extractor.ts     # Filter and effect tokens
│   │   ├── layout-extractor.ts     # Layout system tokens
│   │   └── component-extractor.ts  # Component-specific tokens
│   ├── utils/
│   │   ├── spacing-normalizer.ts   # Spacing validation
│   │   ├── typography-normalizer.ts # Typography validation
│   │   └── tailwind-converter.ts   # Tailwind compatibility
│   ├── validators/
│   │   └── token-validator.ts      # Token validation system
│   └── types/
│       └── messages.ts             # TypeScript interfaces
├── scripts/
│   └── build-html.ts              # Inlines JS into HTML
├── mcp-server/                    # Optional MCP integration
└── dist/                          # Built plugin files
```

### Data Flow
1. **Code → Figma**: Extract tokens → Map to Figma format → Apply via Variables API
2. **Figma → Code**: Extract variables/styles → Generate code files → Copy to project
3. **Error Recovery**: Track failures → Display retry options → Reapply specific tokens

## Implementation Journey

### Phase 1: Foundation
- Set up TypeScript plugin structure
- Implement basic UI with message passing
- Create initial token extraction logic
- Handle Figma's data URL loading constraints

### Phase 2: Token Extraction
- Built CSS variable extractor with HSL→RGB conversion
- Created theme extractor for 6 themes (default, glass, bubblegum, ocean, forest, sunset)
- Implemented spacing extractor with density awareness
- Added typography extractor with responsive scaling

### Phase 3: Figma Integration
- Migrated to Figma Variables API for atomic design
- Implemented proper scope validation
- Added font loading and validation
- Fixed naming conventions for Figma compliance

### Phase 4: Advanced Features
- Added bidirectional sync capability
- Implemented token extraction from Figma
- Created export/import functionality
- Built error recovery and retry system
- Added code generation for multiple formats

### Phase 5: Compatibility Fixes
- Replaced spread operators with Object.assign()
- Removed optional chaining for older environments
- Inlined JavaScript to handle data URL loading
- Fixed all Figma API compatibility issues

### Phase 6: Enhanced Token System
- Added gradient token support with direction mapping
- Implemented layout tokens (flex, grid, containers)
- Created filter and effect tokens
- Added animation and transition tokens
- Improved spacing with Tailwind half-step values
- Enhanced typography validation with better line height handling

### Phase 7: Component-Specific Tokens
- Created centralized component token system
- Implemented component token extraction from Figma
- Added support for density modes per component
- Integrated with existing spacing and color systems
- Created component-specific variants and states

## Key Features

### 1. Token Extraction from Code
Extracts design tokens from multiple sources:
- **CSS Variables**: Parses `app/global.css` for custom properties
- **Theme Registry**: Extracts from `lib/theme/index.ts`
- **Spacing System**: Reads density-aware spacing from `lib/design/spacing.ts`
- **Typography**: Extracts responsive typography scales

### 2. Token Application to Figma
Uses the modern Variables API to create:
- **Variable Collections**: Organized by token type
- **Modes**: Support for themes and densities (limited by plan)
- **Proper Scoping**: Correct scopes for each variable type
- **Text Styles**: Typography with proper font loading
- **Effect Styles**: Shadows with multiple layers

### 3. Token Extraction from Figma
Analyzes current Figma file to extract:
- Color variables from fills and strokes
- Typography from text styles
- Spacing from gaps and padding
- Effects from applied shadows
- Border radius from corner radius

### 4. Code Generation
Generates multiple file formats:
```typescript
// TypeScript Theme
export const theme = {
  colors: { background_default_light: 'rgb(255, 255, 255)' },
  spacing: { spacing_0: 0, spacing_1: 4 },
  typography: { display_large: { fontSize: 48, fontWeight: 700 } }
};

// CSS Variables
:root {
  --background-default-light: rgb(255, 255, 255);
  --spacing-0: 0px;
}

// Tailwind Config
module.exports = {
  theme: {
    extend: {
      colors: { 'background': { 'default-light': 'rgb(255, 255, 255)' } }
    }
  }
};
```

### 5. Error Recovery
Comprehensive error handling:
- Tracks failed tokens with error messages
- Provides retry options (all, by category, individual)
- Saves tokens for retry functionality
- Clear error reporting in UI

### 6. Export/Import
Token backup and sharing:
- Export current tokens as timestamped JSON
- Import tokens with preview before applying
- Validates token structure before import
- Maintains token metadata

## Technical Details

### Figma API Constraints
1. **Variables API**:
   - Async methods required (getVariableCollectionByIdAsync)
   - Incremental mode requires collection objects, not IDs
   - Proper scope validation (STROKE_COLOR, not STROKE)

2. **Naming Conventions**:
   - No dots allowed (spacing-0.5 → spacing/0_5)
   - Forward slashes for hierarchy
   - Underscores for invalid characters

3. **Font Handling**:
   - Must load fonts before use
   - Inter font variations: "Semi Bold" (with space)
   - Fallback to Regular if weight unavailable

4. **Unit Conversions**:
   - HSL to RGB for colors
   - EM to pixels for letter spacing
   - Figma uses 0-1 for RGB, CSS uses 0-255

### JavaScript Environment
Figma's environment has limitations:
- No spread operator (...) support
- No optional chaining (?.) support
- No WebSocket support
- Runs in sandboxed environment

### Build Process
1. TypeScript compilation with Bun
2. JavaScript inlining into HTML
3. No external script loading allowed
4. Data URL format for plugin UI

## Troubleshooting

### Common Issues and Solutions

1. **"Syntax error: Unexpected token ..."**
   - Replace spread operators with Object.assign()
   - Use traditional null checks instead of optional chaining

2. **"Failed to load minimal.js"**
   - JavaScript must be inlined in HTML
   - Run build script to inline properly

3. **"Cannot use unloaded font"**
   - Ensure Inter font is available
   - Check font weight naming (spaces matter)

4. **"Invalid variable name"**
   - Replace dots with underscores
   - Use forward slashes for hierarchy

5. **"Limited to 1 modes only"**
   - Figma free plan limitation
   - Create separate collections for themes

### Debug Tips
- Check browser console for errors
- Use console.log liberally (appears in Figma console)
- Test with minimal token sets first
- Verify font availability in Figma

## Best Practices

### Token Organization
1. Use consistent naming conventions
2. Group related tokens in collections
3. Document token purposes
4. Maintain token hierarchy

### Performance
1. Batch variable creation when possible
2. Load fonts once before applying styles
3. Use async methods properly
4. Minimize UI updates during sync

### Error Handling
1. Always provide retry options
2. Save state for recovery
3. Clear error messages
4. Log errors for debugging

### Code Generation
1. Generate idiomatic code for each format
2. Include comments for clarity
3. Maintain consistent formatting
4. Validate output before saving

## Future Improvements

### Technical Enhancements
- WebSocket support when available
- Streaming token updates
- Differential sync (only changed tokens)
- Token validation before apply

### Feature Additions
- ✅ Custom font support beyond Inter
- ✅ Gradient token support
- ✅ Animation tokens
- ✅ Component-specific tokens
- ✅ Advanced layout tokens (flex, grid)
- ✅ Filter and effect tokens
- ✅ Enhanced validation system
- Token documentation generation
- Component variant management
- Design system auditing

### Integration Improvements
- Git integration for version control
- CI/CD pipeline support
- Team collaboration features
- Design system documentation

### Performance Optimizations
- Lazy loading for large token sets
- Incremental updates
- Background processing
- Caching mechanisms

## Conclusion

This plugin demonstrates the power of modern design token management, bridging the gap between design and development. By leveraging the Figma Variables API and careful implementation of compatibility fixes, we've created a robust tool that handles real-world design systems with grace.

The implementation journey highlighted the importance of understanding platform constraints, proper error handling, and user experience design. The result is a production-ready plugin that significantly improves the design-to-development workflow.