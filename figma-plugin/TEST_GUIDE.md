# Figma Plugin Testing Guide

## ✅ Fixed Issues

1. **Message Handling**
   - Added handlers for `GET_SELECTION` and `UI_READY` messages
   - Added `CONNECTED` status message
   - Fixed frame mutation handlers

2. **tRPC Endpoints**
   - `analyzeFrame` - Analyzes frame properties and provides suggestions
   - `suggestOptimizations` - Suggests performance and accessibility improvements
   - `generateComponent` - Generates React Native/Web components from description

3. **Figma Bridge**
   - Fixed frame inspection result handling
   - Added proper request/response pattern for mutations
   - Fixed message type handling

4. **Package Updates**
   - Updated to `@tanstack/react-router-devtools`

## 🧪 Testing Multi-Frame Selection

### 1. Basic Multi-Frame Selection
1. Open Figma with the plugin loaded
2. Select 2-5 frames (hold Shift or Cmd/Ctrl)
3. Go to the **Inspector** tab in the plugin
4. You should see all selected frames in the left panel
5. Click on each frame to inspect its properties

### 2. Batch Inspection
1. Select multiple frames
2. The plugin automatically inspects all frames (up to 5)
3. Results appear in the right panel
4. Each frame shows:
   - Dimensions and position
   - Auto-layout settings
   - Element hierarchy

### 3. Search and Filter
1. With multiple frames selected
2. Use the search box to filter frames by name
3. The list updates in real-time

## 🤖 Testing AI Agent Features

### 1. Frame Analysis
```
/analyze
```
- Select frames first
- Provides detailed analysis of layout, typography, colors, accessibility

### 2. Optimization Suggestions
```
/optimize
```
- Select multiple frames
- Get suggestions for performance, accessibility, and responsive design

### 3. Component Generation
```
/generate a modern card with title and description
```
- Generates React Native/Web component code
- Uses NativeWind for styling
- Includes TypeScript interfaces

### 4. Fix Issues
```
/fix
```
- Automatically detects and fixes common issues:
  - Zero width/height frames
  - Missing fills
  - Auto-layout problems

## 🔄 Testing Real-time Features

### 1. Selection Sync
1. Change selection in Figma
2. Plugin UI updates immediately
3. Inspector shows new selection

### 2. Frame Mutations
1. Select a frame in Inspector
2. Use the Agent to suggest changes
3. Apply mutations through the UI
4. Frame updates in Figma

### 3. WebSocket Connection
1. Check the console for "WebSocket connected"
2. Real-time updates should work
3. No more "Upgrade Required" errors

## 📊 Testing Memory Features

### 1. Store Design Pattern
1. Select a well-designed frame
2. Go to **Memory** tab
3. Click "Store Pattern"
4. Add a description
5. Pattern is saved to Qdrant

### 2. Find Similar Designs
1. Select any frame
2. Click "Find Similar"
3. View similar designs based on:
   - Layout structure
   - Color schemes
   - Typography
   - Spacing

## 🎯 Expected Behavior

### ✅ Working Features:
- Multi-frame selection (up to 5 frames)
- Real-time selection updates
- Frame inspection with hierarchy
- AI-powered analysis and suggestions
- Component generation from description
- Design pattern memory with Qdrant
- WebSocket for real-time updates

### 🚀 Performance:
- Instant selection updates
- Parallel frame inspection
- Cached inspection results
- Efficient WebSocket communication

### 🛡️ Error Handling:
- Graceful fallbacks for missing frames
- Clear error messages
- Retry mechanisms for failed operations
- Timeout handling for async operations

## 🐛 Troubleshooting

### If frames don't appear:
1. Check console for errors
2. Ensure frames are actual FRAME/COMPONENT types
3. Refresh the plugin UI

### If Agent commands don't work:
1. Ensure frames are selected first
2. Check tRPC connection in Network tab
3. Look for errors in Debug Console

### If WebSocket fails:
1. Check port 3458 is accessible
2. Restart the plugin container
3. Check Docker logs: `docker logs myexpo-figma-plugin`

## 📝 Debug Commands

```bash
# Check running services
docker ps | grep figma

# View logs
docker logs myexpo-figma-plugin --tail 50

# Test endpoints
curl http://localhost:3456/health
curl http://localhost:3458  # Should fail with "Upgrade Required" - that's correct for WebSocket

# Restart if needed
docker-compose --profile figma restart figma-plugin
```