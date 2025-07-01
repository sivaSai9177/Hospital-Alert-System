# Figma Token Sync MCP Server

This MCP (Model Context Protocol) server enables bidirectional synchronization of design tokens between Figma and your codebase, with support for both HTTP-based and WebSocket real-time streaming.

## Features

- **Bidirectional Sync**: Sync tokens from Figma to code and vice versa
- **Real-time Updates**: WebSocket support for instant token updates
- **Multiple Token Types**: Colors, typography, spacing, shadows, and border radius
- **Color Extraction**: Extract colors from Figma frames and generate themes
- **Smart Categorization**: Automatic color categorization and theme generation
- **File Watching**: Automatic detection of token file changes
- **TypeScript Support**: Works with both TypeScript and JSON token files

## Installation

```bash
cd figma-plugin/mcp-server
npm install
```

## Usage

### Starting the Servers

1. **MCP Server Only** (HTTP-based sync):
```bash
npm start
```

2. **WebSocket Server Only** (Real-time sync):
```bash
npm run start:ws
```

3. **Both Servers** (Recommended):
```bash
npm run start:all
```

### Configuration

The servers expect token files to be located at:
- `../../../lib/design/colors.ts`
- `../../../lib/design/typography.ts`
- `../../../lib/design/spacing.ts`
- `../../../lib/design/shadows.ts`
- `../../../lib/design/border-radius.ts`
- `../../../lib/design/tokens.json` (combined file)

Update the `TOKEN_PATHS` in the server files if your project structure differs.

### Environment Variables

- `WS_PORT`: WebSocket server port (default: 8080)
- `MCP_PORT`: MCP server port (default: 3456)

## Figma Plugin Configuration

In the Figma plugin settings, configure:
- **MCP Server URL**: `http://localhost:3456`
- **WebSocket Server URL**: `ws://localhost:8080`
- **Sync Mode**: Choose between `http` or `websocket`
- **Enable Real-time Sync**: Toggle for automatic updates

## API Reference

### MCP Server Tools

1. **read-tokens**
   - Read design tokens from the codebase
   - Parameters: `tokenType` (optional): 'all' | 'colors' | 'typography' | 'spacing' | 'shadows' | 'borderRadius'

2. **write-tokens**
   - Write design tokens to the codebase
   - Parameters: `tokens` (required), `tokenType` (optional)

3. **sync-tokens**
   - Sync tokens between Figma and codebase
   - Parameters: `direction` (required): 'figma-to-code' | 'code-to-figma', `tokens` (required for figma-to-code)

4. **extract-colors**
   - Extract colors from Figma selection and generate theme
   - Parameters: `colors` (required): array of extracted colors with usage data
   - Returns: categorized colors and generated theme

5. **apply-theme**
   - Apply extracted theme to Figma or codebase
   - Parameters: `theme` (required), `target` (required): 'figma' | 'code'

### WebSocket Messages

#### Client to Server
- `SUBSCRIBE`: Subscribe to token updates
- `UNSUBSCRIBE`: Unsubscribe from updates
- `TOKEN_REQUEST`: Request current tokens
- `SYNC_REQUEST`: Sync tokens
- `TOKEN_UPDATE`: Send token updates
- `COLOR_EXTRACTION`: Send extracted colors for processing
- `THEME_UPDATE`: Send theme updates
- `HEARTBEAT`: Keep connection alive

#### Server to Client
- `TOKEN_RESPONSE`: Token data response
- `TOKEN_UPDATE`: Real-time token updates
- `SYNC_RESPONSE`: Sync operation result
- `COLOR_EXTRACTION_RESPONSE`: Processed colors and theme
- `THEME_UPDATE_RESPONSE`: Theme application result
- `ERROR`: Error messages
- `PONG`: Heartbeat response

## Example Token File (TypeScript)

```typescript
// lib/design/colors.ts
export const colors = [
  {
    name: "Primary/Blue",
    value: "#0066ff",
    description: "Main brand color",
    category: "primary"
  },
  // ... more colors
];

export default colors;
```

## Example Token File (JSON)

```json
{
  "colors": [
    {
      "name": "Primary/Blue",
      "value": "#0066ff",
      "description": "Main brand color",
      "category": "primary"
    }
  ],
  "typography": [...],
  "spacing": [...],
  "shadows": [...],
  "borderRadius": [...],
  "version": "1.0.0",
  "lastUpdated": "2024-01-15T10:00:00Z"
}
```

## Troubleshooting

### WebSocket Connection Issues
- Ensure the WebSocket server is running on the correct port
- Check firewall settings
- Verify the WebSocket URL in Figma plugin settings

### Token File Not Found
- Verify file paths in `TOKEN_PATHS`
- Ensure token files exist and are readable
- Check file permissions

### Real-time Updates Not Working
- Enable real-time sync in Figma plugin
- Check WebSocket connection status
- Verify file watching permissions

## Development

### Running in Development Mode

```bash
npm run dev      # MCP server with hot reload
npm run dev:ws   # WebSocket server with hot reload
```

### Building

```bash
npm run build
```

## Security Considerations

- The servers run locally by default
- Configure appropriate CORS settings for production
- Use authentication for remote deployments
- Validate all token data before writing to files

## License

MIT