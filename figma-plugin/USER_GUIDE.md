# Figma Plugin User Guide

## 🚀 Getting Started

This Figma plugin integrates AI-powered design analysis and automation directly into your workflow. All features are now fully functional!

## 📋 Features Overview

### 1. **Frame Inspector** (Main Tab)
- **Multi-frame selection**: Select up to 5 frames simultaneously
- **Real-time updates**: Selection changes reflect instantly
- **Detailed properties**: View dimensions, auto-layout, hierarchy
- **Search & filter**: Quickly find frames by name

### 2. **AI Agent** (Most Powerful Feature)
The AI Agent understands both commands and natural language:

#### Available Commands:

**`/analyze`** - Deep frame analysis
- Select frames first
- Provides insights on layout, typography, colors, accessibility
- Example: Select a card component → type `/analyze`

**`/optimize`** - Performance suggestions
- Checks for optimization opportunities
- Suggests improvements for accessibility and performance
- Example: Select complex layouts → type `/optimize`

**`/generate [description]`** - Create components
- Generates React Native/Web code from description
- Uses NativeWind styling
- Example: `/generate a modern card with avatar, title, and description`

**`/fix`** - Auto-fix issues
- Detects and fixes common problems:
  - Zero width/height frames
  - Missing fills
  - Layout issues
- Example: Select broken frames → type `/fix`

**`/responsive`** - Create responsive variants
- Generates mobile, tablet, and desktop versions
- Maintains design consistency

**`/theme`** - Apply design system
- Applies consistent theming to selection
- Uses your design tokens

**`/help`** - Show all commands

#### Natural Language Support:
- "analyze this card" → runs analysis
- "make this better" → suggests optimizations
- "create a button" → generates component
- "what's selected?" → shows current selection

#### Typo Tolerance:
Common misspellings are automatically corrected:
- `/analyse` → `/analyze`
- `/optimise` → `/optimize`
- `/gen` → `/generate`

### 3. **Memory** (Design Pattern Storage)
- **Store patterns**: Save well-designed components
- **Find similar**: Search by visual similarity
- **Learn from history**: Build a design knowledge base
- Uses Qdrant vector database

### 4. **Mutations** (Batch Operations)
- Edit multiple frames simultaneously
- Apply consistent changes across designs
- Preview changes before applying

### 5. **Settings**
- Configure AI behavior
- Manage connections
- Customize preferences

## 🎯 Common Workflows

### Quick Analysis Workflow:
1. Select frames in Figma
2. Open plugin → AI Agent tab
3. Type `/analyze`
4. Review insights and suggestions

### Component Generation:
1. Open AI Agent tab
2. Type `/generate a modern notification toast with icon and dismiss button`
3. Copy generated code
4. Component appears in Figma

### Batch Optimization:
1. Select multiple frames
2. Type `/optimize` in AI Agent
3. Review suggestions
4. Apply recommended changes

### Design System Compliance:
1. Select non-compliant components
2. Type `/theme` to apply design system
3. Or `/fix` to auto-correct issues

## 💡 Pro Tips

1. **Selection Status**: Always visible at the top of AI Agent tab
2. **Command Shortcuts**: Click command buttons instead of typing
3. **Multi-select**: Hold Shift/Cmd to select multiple frames
4. **Natural Language**: Just describe what you want
5. **Debug Console**: Click terminal icon for detailed logs

## 🔧 Troubleshooting

### "Please select frames" message:
- Ensure you've selected FRAME, COMPONENT, or INSTANCE types
- Text layers and groups won't work
- Check the selection status bar

### Commands not working:
1. Check if frames are selected
2. Verify WebSocket connection (port 3458)
3. Try refreshing the plugin

### Slow response:
- First analysis may take longer (caching)
- Complex frames need more processing
- Check network connection

## 🚨 Requirements

- Docker containers must be running
- Ports 3456 (HTTP) and 3458 (WebSocket) must be accessible
- Qdrant must be running for Memory features

## 📊 Performance Tips

1. **Batch operations**: Select multiple frames at once
2. **Use search**: Filter frames before inspecting
3. **Cache warmup**: First operations are slower
4. **Limit selection**: Max 5 frames for best performance

## 🎨 Example Use Cases

### 1. Design System Audit
```
Select all card components → /analyze
Review consistency issues → /fix
Apply theme → /theme
```

### 2. Component Library Creation
```
/generate a button component with primary, secondary, and ghost variants
/generate an input field with label and error state
/generate a modal dialog with header, content, and actions
```

### 3. Accessibility Check
```
Select UI components → /analyze
Review accessibility warnings
Apply fixes → /fix
```

### 4. Responsive Design
```
Select desktop frame → /responsive
Auto-generates mobile and tablet versions
Fine-tune with mutations
```

## 🛠️ Advanced Features

### Custom AI Prompts
Instead of commands, use natural language:
- "make this card more modern"
- "add proper spacing to this layout"
- "check if this follows iOS guidelines"

### Batch Processing
Select multiple similar components and apply operations to all:
- Standardize spacing
- Fix color inconsistencies
- Update typography

### Pattern Learning
The Memory feature learns from your designs:
- Stores successful patterns
- Suggests similar solutions
- Builds institutional knowledge

## 📱 Keyboard Shortcuts

- `Enter` - Send message in AI Agent
- `Tab` - Navigate between frames
- `Esc` - Clear selection

## 🔄 Real-time Features

- Selection sync between Figma and plugin
- Live preview of changes
- Instant command execution
- WebSocket for fast updates

---

**Need help?** Type `/help` in the AI Agent or check the Debug Console (terminal icon) for detailed logs.

## 🎯 Best Practices

### Token Organization
1. **Use semantic names**: `color-primary` not `blue-500`
2. **Group by function**: `spacing-card-padding`
3. **Include scale**: `font-size-sm`, `font-size-md`
4. **Document purpose**: Add descriptions to Variables

### Memory System
1. **Store successful patterns**: Save designs that work well
2. **Add descriptions**: Help future searches
3. **Review similar designs**: Before creating new ones
4. **Track mutations**: See what changes work

### Performance Tips
1. **Extract incrementally**: Work with sections, not entire files
2. **Use batch sync**: Group changes before syncing
3. **Enable caching**: Reuse extracted tokens
4. **Close unused panels**: Reduce memory usage

## 🚨 Troubleshooting

### Common Issues

#### "WebSocket connection failed"
- Check if services are running: `docker ps`
- Restart services: `docker-compose --profile figma restart`
- Check port 3458 is not blocked

#### "Failed to apply Variables"
- Check your Figma plan (Variables API requires paid plan)
- Try applying as styles instead
- Reduce the number of variables

#### "Sync failed"
- Check file permissions in your codebase
- Verify paths in Settings
- Check server logs in Debug Console

#### "Memory search returns no results"
- Ensure Qdrant is running: http://localhost:6333
- Store some patterns first
- Try broader search terms

### Getting Help
1. **Debug Console**: First place to check for errors
2. **Server Logs**: `docker logs myexpo-figma-plugin`
3. **Network Tab**: Check API requests in browser DevTools
4. **GitHub Issues**: Report bugs or request features

## 📚 API Reference

### Message Types
```typescript
enum MessageType {
  EXTRACT_TOKENS = 'EXTRACT_TOKENS',
  SYNC_TO_CODE = 'SYNC_TO_CODE',
  SYNC_FROM_CODE = 'SYNC_FROM_CODE',
  GENERATE_COMPONENT = 'GENERATE_COMPONENT',
  INSPECT_FRAME = 'INSPECT_FRAME',
  STORE_PATTERN = 'STORE_PATTERN',
  FIND_SIMILAR = 'FIND_SIMILAR'
}
```

### tRPC Endpoints
- `figma.sync.pushTokens` - Send tokens to code
- `figma.sync.pullTokens` - Get tokens from code
- `figma.memory.storePattern` - Save design pattern
- `figma.memory.findSimilar` - Search patterns
- `figma.generate.component` - Generate component code

### WebSocket Events
- `token-update` - Real-time token changes
- `sync-status` - Sync progress updates
- `frame-change` - Selection changes
- `error` - Error notifications

## 🎨 UI Customization

The plugin UI can be customized:
1. Edit `src/ui/styles/globals.css` for styling
2. Modify `tailwind.config.js` for Tailwind classes
3. Update `src/ui/components` for UI components
4. Change `src/ui/routes` for new pages

## 🔗 Integration Points

### With Universal App
- Tokens sync to `lib/theme/`
- Components use NativeWind classes
- Supports React Native and Web platforms
- Respects existing design system

### With MCP
- Can be used with Claude Desktop
- Provides tools for AI assistance
- Supports prompts for design tasks
- Enables automated workflows

## 🚀 Next Steps

1. **Start simple**: Extract and sync basic color tokens
2. **Build patterns**: Store successful component designs
3. **Iterate**: Use memory to improve designs
4. **Automate**: Enable real-time sync for your team
5. **Extend**: Add custom handlers for your needs

Happy designing! 🎨✨