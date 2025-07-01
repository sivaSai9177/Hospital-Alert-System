# Changelog

All notable changes to the Figma Universal Design System Plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Qdrant vector database integration for semantic search
- Smart search functionality across documentation, code, patterns, and errors
- Comprehensive test infrastructure with Jest
- Organized handler structure with subdirectories
- Enhanced documentation structure (API, guides, architecture, examples)
- Development infrastructure files (.env.example, CHANGELOG.md)

### Changed
- Reorganized handlers into functional subdirectories (tokens, sync, generation, analysis)
- Updated imports to use new handler structure
- Improved main README with comprehensive feature matrix

## [1.0.0] - 2024-06-30

### Added
- Design token extraction from Figma designs
- Bidirectional synchronization with MCP server
- Real-time sync via WebSocket
- Component library generation (React, Vue, Angular, React Native)
- Design documentation export (Markdown, HTML, PDF, JSON)
- AI-powered assistant for natural language commands
- Operation queue with pause/resume functionality
- Comprehensive error handling and logging
- Frame inspection and editing capabilities
- Typography and spacing system generators
- Color extraction and theme application
- WebSocket manager with automatic reconnection
- Conflict resolution strategies

### Features
- **Token Extraction**: Extract colors, typography, spacing, effects, and animations
- **Component Generation**: Generate production-ready components in multiple frameworks
- **Real-time Sync**: Live synchronization between Figma and code
- **AI Assistant**: Natural language interface for plugin operations
- **Smart Operations**: Pause, resume, and manage long-running operations
- **Design Analysis**: Inspect and analyze design properties
- **Documentation Export**: Generate comprehensive design system documentation

### Technical
- TypeScript support throughout
- React-based UI with TanStack Router
- Zustand for state management
- Custom transpilation for Figma compatibility
- Comprehensive type definitions
- Modular architecture

## [0.9.0] - 2024-06-28 (Beta)

### Added
- Initial plugin structure
- Basic token extraction
- MCP server integration
- Simple UI with Tailwind CSS

### Known Issues
- ES2022 syntax compatibility issues (fixed in 1.0.0)
- Limited error handling (improved in 1.0.0)

---

For detailed migration guides between versions, see [docs/guides/migration.md](docs/guides/migration.md)