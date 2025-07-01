# Quick Start Guide

## Running the Figma Plugin

### 1. Start the Services
```bash
bun run native:figma
```
This starts the Docker containers and builds the plugin.

### 2. Load Plugin in Figma Desktop

1. Open **Figma Desktop App** (not the web version)
2. Go to **Plugins → Development → Import plugin from manifest**
3. Navigate to `/Users/sirigiri/Documents/coding-projects/my-expo/figma-plugin`
4. Select `manifest.json`
5. The plugin will be imported

### 3. Run the Plugin

1. In Figma, go to **Plugins → Development → Universal Design System Sync**
2. The plugin UI will open inside Figma
3. You should see "Connected to Figma" status

### Important Notes

- The web UI at http://localhost:3457 is just for development preview
- The actual plugin must be run from within Figma Desktop
- Messages between UI and plugin only work inside Figma context
- Check the Figma console (Plugins → Development → Show/Hide Console) for debug logs

### Testing the Connection

1. Select some frames in Figma
2. The plugin should show the selection in real-time
3. Try the AI Agent commands like `/analyze`

### Troubleshooting

If the plugin doesn't load:
- Make sure Docker containers are running: `docker ps`
- Check that ports 3456 and 3458 are accessible
- Reload the plugin in Figma: Right-click → Reload
- Check Figma console for errors

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Extract Tokens | `Cmd/Ctrl + E` |
| Sync to Code | `Cmd/Ctrl + S` |
| Refresh | `Cmd/Ctrl + R` |
| Inspect Selected | `Cmd/Ctrl + I` |

## 📁 Output Files

| File | Purpose |
|------|---------|
| `app/global-generated.css` | CSS Variables |
| `lib/theme/generated-tokens.ts` | TypeScript theme |
| `tailwind-tokens.config.js` | Tailwind config |
| `design-tokens.json` | JSON backup |

## 🔌 Service Endpoints

| Service | URL |
|---------|-----|
| Plugin UI | http://localhost:3457 |
| tRPC API | http://localhost:3456/trpc |
| WebSocket | ws://localhost:3458 |
| Qdrant | http://localhost:6333/dashboard |

## 🚨 Quick Fixes

**WebSocket Error?**
```bash
docker-compose --profile figma restart figma-plugin
```

**Tokens Not Applying?**
- Check Figma plan (Variables need paid plan)
- Use "Apply as Styles" instead

**Memory Not Working?**
```bash
# Check Qdrant
curl http://localhost:6333/readyz
```

## 📊 Status Indicators

- 🟢 Connected & Syncing
- 🟡 Connecting
- 🔴 Disconnected
- ⚡ Real-time sync active
- 🔄 Sync in progress

## 🎨 Token Categories

1. **Colors** - Fills, strokes, text colors
2. **Typography** - Font styles, sizes, weights
3. **Spacing** - Gaps, padding, margins
4. **Effects** - Shadows, borders, radius
5. **Layout** - Grids, containers, sections

---

Need help? Check the [Full User Guide](./USER_GUIDE.md) or open Debug Console (🖥️)