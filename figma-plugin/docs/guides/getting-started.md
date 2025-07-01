# 🚀 Getting Started

Complete guide to setting up and using the Figma Universal Design System Plugin.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18+) or **Bun** (v1.0+)
- **Figma Desktop App** (required for local development)
- **Git** for version control
- **VS Code** or your preferred IDE

## 🛠 Installation

### 1. Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd figma-plugin

# Install dependencies
npm install
# or
bun install
```

### 2. Environment Setup

Create your environment configuration:

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# MCP Server Configuration
MCP_SERVER_URL=http://localhost:3456
MCP_SERVER_PORT=3456

# WebSocket Configuration
WEBSOCKET_URL=ws://localhost:3458
WEBSOCKET_PORT=3458

# Qdrant Configuration (optional)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key

# AI Configuration (optional)
OPENAI_API_KEY=your-openai-key
```

### 3. Start Development Servers

Start all necessary services:

```bash
# Start the plugin development server
npm run dev

# In another terminal, start the MCP server
npm run mcp:start

# Optional: Start Qdrant for semantic search
docker run -p 6333:6333 qdrant/qdrant
```

### 4. Load Plugin in Figma

1. Open **Figma Desktop App**
2. Go to **Plugins** → **Development** → **Import plugin from manifest...**
3. Select the `manifest.json` file from the plugin directory
4. The plugin should now appear in your plugins menu

## 🎯 First Steps

### 1. Open the Plugin

In Figma:
- Right-click on canvas → Plugins → Universal Design System Sync
- Or use the keyboard shortcut (configure in Figma settings)

### 2. Extract Your First Tokens

1. Create a simple design in Figma:
   ```
   - Rectangle with primary color (#007AFF)
   - Text with custom typography
   - Frame with spacing
   ```

2. Select the frame containing your design

3. In the plugin UI:
   - Click "Extract Tokens"
   - View the extracted design tokens
   - Tokens are automatically categorized

### 3. Generate Components

1. Select a component in your design
2. In the plugin, go to "Generate" tab
3. Choose your framework:
   - React
   - Vue
   - Angular
   - React Native
4. Click "Generate Component"
5. View and copy the generated code

### 4. Set Up Synchronization

1. Go to "Settings" tab in the plugin
2. Configure sync options:
   ```typescript
   {
     direction: 'bidirectional',
     autoSync: false,
     conflictResolution: 'manual'
   }
   ```
3. Click "Save Settings"
4. Test sync by clicking "Sync to Code"

## 🏗 Project Structure

Understanding the project structure:

```
figma-plugin/
├── src/
│   ├── code.ts          # Main plugin code
│   ├── ui/              # React UI components
│   │   ├── App.tsx      # Main app component
│   │   ├── routes/      # Page components
│   │   └── components/  # Reusable components
│   ├── handlers/        # Business logic
│   ├── lib/             # Utilities
│   └── types/           # TypeScript types
├── docs/                # Documentation
├── scripts/             # Build scripts
└── manifest.json        # Plugin manifest
```

## 💻 Development Workflow

### Making Changes

1. **Plugin Code** (`src/code.ts`):
   - Changes require rebuild
   - Use `npm run dev` for auto-rebuild
   - Reload plugin in Figma after changes

2. **UI Code** (`src/ui/`):
   - Hot module replacement enabled
   - Changes reflect immediately
   - No need to reload plugin

3. **Testing Changes**:
   ```bash
   # Run tests
   npm test
   
   # Run specific test
   npm test -- token-extractor
   
   # Watch mode
   npm test -- --watch
   ```

### Debugging

1. **Enable Debug Mode**:
   ```typescript
   // In console
   window.DEBUG = true;
   ```

2. **View Logs**:
   - Open Figma Developer Console: `Plugins → Development → Open Console`
   - Check browser console for UI logs

3. **Common Issues**:
   - Plugin not loading: Check manifest.json
   - UI not updating: Clear Figma cache
   - API errors: Check network permissions

## 🎨 Basic Usage Examples

### Extract Color Palette

```typescript
// Select frames with color swatches
const colorFrames = figma.currentPage.selection.filter(
  node => node.name.includes('color')
);

// Extract tokens
const colorTokens = await extractColorTokens(colorFrames);

// Result:
{
  colors: [
    { name: 'primary-500', value: '#007AFF', rgb: {...} },
    { name: 'secondary-500', value: '#5856D6', rgb: {...} }
  ]
}
```

### Create Typography Scale

```typescript
// Select text nodes
const textNodes = figma.currentPage.selection.filter(
  node => node.type === 'TEXT'
);

// Generate typography system
const typography = await generateTypographySystem(textNodes);

// Result:
{
  typography: {
    'heading-1': { fontSize: 32, lineHeight: 40, ... },
    'body-1': { fontSize: 16, lineHeight: 24, ... }
  }
}
```

## 🚦 Next Steps

Now that you have the basics working:

1. **Explore Advanced Features**:
   - [Real-time Synchronization](realtime-sync.md)
   - [AI-Powered Features](ai-integration.md)
   - [Component Library Generation](component-generation.md)

2. **Customize for Your Workflow**:
   - Configure token naming conventions
   - Set up custom templates
   - Create team presets

3. **Integrate with Your Stack**:
   - Connect to your design system repository
   - Set up CI/CD pipeline
   - Configure webhooks

## 🔧 Configuration Options

### Plugin Settings

```typescript
interface PluginSettings {
  // Token extraction
  tokenNaming: 'kebab-case' | 'camelCase' | 'snake_case';
  tokenPrefix: string;
  
  // Component generation
  defaultFramework: 'react' | 'vue' | 'angular';
  componentNaming: 'PascalCase' | 'kebab-case';
  
  // Sync settings
  autoSync: boolean;
  syncInterval: number; // minutes
  conflictResolution: 'manual' | 'prefer-figma' | 'prefer-code';
}
```

### Custom Templates

Create custom component templates:

```typescript
// templates/react-component.hbs
import React from 'react';
import styled from 'styled-components';

const {{componentName}} = styled.{{baseElement}}`
  {{#each styles}}
  {{property}}: {{value}};
  {{/each}}
`;

export default {{componentName}};
```

## 📚 Resources

- [Video Tutorial](https://youtube.com/watch?v=...)
- [Example Figma File](https://figma.com/file/...)
- [Discord Community](https://discord.gg/...)
- [GitHub Issues](https://github.com/.../issues)

## ❓ Troubleshooting

### Plugin Won't Load
1. Ensure you're using Figma Desktop
2. Check manifest.json is valid
3. Verify all dependencies are installed

### Tokens Not Extracting
1. Select valid nodes (not groups)
2. Ensure nodes have styles applied
3. Check console for errors

### Sync Not Working
1. Verify server is running
2. Check network permissions
3. Test WebSocket connection

Need more help? Check our [FAQ](faq.md) or [open an issue](https://github.com/.../issues).