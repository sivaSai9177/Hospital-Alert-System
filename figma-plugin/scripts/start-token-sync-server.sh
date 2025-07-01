#!/bin/bash

# Start Token Sync Server
echo "🚀 Starting Token Sync Server..."

cd "$(dirname "$0")/.."

# Run the token sync server with Bun
bun run mcp-server/token-sync-server.ts