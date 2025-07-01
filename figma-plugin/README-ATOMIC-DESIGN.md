# Atomic Design System Integration for Figma

This Figma plugin implements a comprehensive atomic design system that syncs bidirectionally between your React Native/Web codebase and Figma using the Variables API.

## 🎯 Overview

The plugin extracts and syncs real design tokens from your codebase:

- **27 Color Variables** across 6 themes (default, glass, bubblegum, ocean, forest, sunset)
- **51 Spacing Variables** with 3 density modes (compact, medium, large)
- **33 Typography Styles** with responsive sizing
- **7 Shadow Effects** for elevation
- **9 Border Radius Tokens** for consistent rounding

## 🚀 Getting Started

### 1. Build and Run the Plugin

```bash
# Install dependencies
bun install

# Build the plugin
bun run build

# Watch mode for development
bun run dev
```

### 2. Load in Figma

1. Open Figma Desktop
2. Go to Plugins → Development → Import plugin from manifest
3. Select the `manifest.json` file from this directory
4. The plugin will appear in your plugins menu

### 3. Start the Sync Servers

```bash
# Start the token sync server (for HTTP sync)
bun run token:server

# Or start the MCP server (for Model Context Protocol)
bun run mcp:server

# For WebSocket real-time sync
bun run websocket:server
```

## 📦 Token Structure

### Color Variables

Colors are organized with multiple modes for theming:

```typescript
{
  name: "Colors",
  modes: [
    "default/light", "default/dark",
    "glass/light", "glass/dark",
    "bubblegum/light", "bubblegum/dark",
    "ocean/light", "ocean/dark",
    "forest/light", "forest/dark",
    "sunset/light", "sunset/dark"
  ],
  variables: [
    "background", "foreground", "card", "primary", 
    "secondary", "accent", "destructive", "border", etc.
  ]
}
```

### Spacing Variables

Spacing tokens adapt to screen density:

```typescript
{
  name: "Spacing",
  modes: ["Compact", "Medium", "Large"],
  variables: [
    "spacing-0" → "spacing-96",     // 0px to 384px
    "button/paddingX",              // Component-specific
    "card/padding",
    "modal/gap"
  ]
}
```

### Typography Styles

Responsive typography with density modes:

```typescript
[
  "display-large/compact",    // 54px
  "display-large/medium",     // 60px
  "display-large/large",      // 66px
  "heading-1/compact",        // 32px
  "body/medium",              // 16px
  "caption/compact"           // 11px
]
```

## 🔄 Bidirectional Sync

### Sync FROM Code → Figma

1. Click "← Sync from Code" in the plugin
2. The plugin will:
   - Extract tokens from your codebase using the unified token mapper
   - Create/update Figma Variables and Styles
   - Apply proper scopes (fill, stroke, text, etc.)

### Sync TO Figma → Code

1. Make changes to Variables/Styles in Figma
2. Click "Sync to Code →" in the plugin
3. The plugin will:
   - Extract current Figma variables
   - Generate TypeScript types
   - Create CSS variables file
   - Save timestamped JSON backup

Generated files:
```
token-storage/
├── design-tokens-latest.json
├── design-tokens-2024-01-15T10-30-00.json
├── design-tokens.types.ts
└── design-tokens.css
```

## 🎨 Using Variables in Figma

### Apply to Layers

1. Select a layer
2. Click the "Apply Variable" button (🔗) in properties
3. Choose from categorized variables:
   - **Colors**: Fill, Stroke, Text
   - **Spacing**: Padding, Gap, Width/Height
   - **Effects**: Corner Radius

### Switch Themes

1. Use the Variables panel (right sidebar)
2. Switch between modes:
   - Color themes (light/dark variants)
   - Density modes (compact/medium/large)

### Create Components

1. Build components using variables
2. They'll automatically adapt to:
   - Theme changes
   - Density modes
   - Platform variations

## 🧩 Component Generation

The plugin can generate React Native/Web components from Figma designs:

1. Select a component in Figma
2. Click "Generate Component" in the plugin
3. Choose options:
   - Platform: Universal, React Native, or Web
   - Use NativeWind for styling
   - Include TypeScript types
   - Add animations

Generated component example:
```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';

const StyledButton = styled(TouchableOpacity);

export const Button: React.FC<ButtonProps> = ({ 
  onPress, 
  disabled = false,
  children 
}) => {
  return (
    <StyledButton
      className="bg-primary px-4 py-2 rounded-lg"
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {children}
    </StyledButton>
  );
};
```

## 🔧 Configuration

### Server Settings

Configure in the plugin settings panel:

- **MCP Server URL**: Default `http://localhost:3456`
- **Token Sync URL**: Default `http://localhost:3457`
- **WebSocket URL**: Default `ws://localhost:8080`

### Token Mapping

The plugin uses these mappings:

1. **CSS Variables** → Figma Color Variables
2. **Theme Registry** → Variable Modes
3. **Spacing System** → Number Variables
4. **Typography Scale** → Text Styles
5. **Shadow Tokens** → Effect Styles

## 📚 Architecture

```
figma-plugin/
├── src/
│   ├── extractors/           # Token extraction logic
│   │   ├── unified-token-mapper.ts
│   │   ├── theme-extractor.ts
│   │   ├── spacing-extractor.ts
│   │   └── typography-extractor.ts
│   ├── handlers/
│   │   ├── token-applier-atomic.ts  # Figma Variables API
│   │   └── mcp-sync.ts              # Server communication
│   └── code.ts                      # Main plugin logic
├── mcp-server/               # MCP & sync servers
└── token-storage/            # Generated token files
```

## 🛠️ Development

### Testing Token Extraction

```bash
# Run token extraction test
bun run test:sync

# This will show:
# - Extracted token counts
# - Sample token values
# - Server connection status
```

### Debug Mode

Enable debug logging in the plugin:
1. Open Figma Developer Console
2. Check console for detailed logs
3. Each operation is prefixed with emojis for clarity

## 🚨 Troubleshooting

### "Server not responding"
- Ensure token sync server is running: `bun run token:server`
- Check server URL in plugin settings
- Verify CORS is enabled

### "Variables not updating"
- Check Figma Variables panel for errors
- Ensure you have edit permissions
- Try refreshing the plugin

### "Sync failed"
- Check console for detailed error messages
- Verify token structure matches expected format
- Ensure write permissions for token-storage directory

## 🔗 Integration with Codebase

The extracted tokens integrate with:

- **Tailwind Config**: Uses CSS variables
- **NativeWind**: Responsive utilities
- **Theme Provider**: Runtime theme switching
- **Component Library**: Consistent styling

Example usage in code:
```tsx
// Using design tokens
<View className="bg-background p-4 rounded-lg shadow-md">
  <Text className="text-foreground text-heading-1">
    Hello Atomic Design
  </Text>
</View>
```

## 🎯 Best Practices

1. **Always sync before major changes** to ensure consistency
2. **Use semantic color names** (primary, secondary) not literal (blue, red)
3. **Test across all density modes** for responsive design
4. **Version control token files** for design system history
5. **Document token changes** in commit messages

## 🚀 Future Enhancements

- [ ] AI-powered component suggestions
- [ ] Automatic style guide generation
- [ ] Token validation and linting
- [ ] Design system analytics
- [ ] Multi-brand token management

---

For more information, see the [main README](README.md) or check the [MCP integration docs](mcp-server/README.md).