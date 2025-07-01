#!/bin/bash

echo "🚀 Starting Universal Design System Figma Plugin"
echo ""

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it first:"
    echo "curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    bun install
fi

# Build the plugin
echo "🔨 Building plugin..."
bun run build

# Start the MCP server
echo ""
echo "🌐 Starting MCP server on http://localhost:3456"
cd mcp-server && bun run dev &
MCP_PID=$!

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Open Figma Desktop App"
echo "2. Go to Plugins → Development → Import plugin from manifest"
echo "3. Select the manifest.json file in this directory"
echo "4. Run the plugin: Plugins → Development → Universal Design System Sync"
echo ""
echo "Press Ctrl+C to stop the MCP server"

# Wait for Ctrl+C
trap "kill $MCP_PID; exit" INT
wait