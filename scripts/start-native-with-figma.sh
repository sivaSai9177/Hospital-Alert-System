#!/bin/bash

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 Starting Native Expo with Figma Plugin${NC}"
echo -e "${PURPLE}===========================================${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}⏹  Shutting down services...${NC}"
    # Stop Figma plugin and Qdrant
    docker-compose --profile figma stop figma-plugin qdrant
    # Stop other services
    docker-compose -f docker-compose.local.yml stop postgres-local redis-local logging-local websocket-local
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup INT TERM

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running! Please start Docker Desktop.${NC}"
    exit 1
fi

# Check for port conflicts with main docker-compose services
echo -e "${YELLOW}🔍 Checking for service conflicts...${NC}"
CONFLICTS=0

# Check if main postgres is running (different from postgres-local)
if docker ps --format "{{.Names}}" | grep -E "^myexpo-postgres$" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Found myexpo-postgres running on port 5432${NC}"
    echo -e "   Stopping it to avoid conflicts..."
    docker stop myexpo-postgres
    ((CONFLICTS++))
fi

# Check if main redis is running (different from redis-local)
if docker ps --format "{{.Names}}" | grep -E "^myexpo-redis$" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Found myexpo-redis running on port 6379${NC}"
    echo -e "   Stopping it to avoid conflicts..."
    docker stop myexpo-redis
    ((CONFLICTS++))
fi

if [ $CONFLICTS -gt 0 ]; then
    echo -e "${GREEN}✅ Resolved $CONFLICTS conflicts${NC}"
    sleep 2
fi

# Start Figma plugin and Qdrant in the background
echo -e "\n${PURPLE}🎨 Starting Figma Plugin with Memory Service...${NC}"
docker-compose --profile figma up -d figma-plugin qdrant --remove-orphans

# Wait for services to be ready
echo -n "Waiting for services"
FIGMA_READY=false
QDRANT_READY=false

for i in {1..30}; do
    # Check Figma plugin
    if ! $FIGMA_READY && curl -s http://localhost:3457 > /dev/null 2>&1; then
        FIGMA_READY=true
    fi
    
    # Check Qdrant
    if ! $QDRANT_READY && curl -s http://localhost:6333/health > /dev/null 2>&1; then
        QDRANT_READY=true
    fi
    
    # If both ready, break
    if $FIGMA_READY && $QDRANT_READY; then
        echo -e " ${GREEN}✅${NC}"
        echo -e "   MCP Server: http://localhost:3456"
        echo -e "   Vite Dev Server: http://localhost:3457"
        echo -e "   WebSocket: ws://localhost:3458"
        echo -e "   Qdrant: http://localhost:6333"
        break
    fi
    
    echo -n "."
    sleep 1
done

if ! $FIGMA_READY; then
    echo -e " ${RED}❌ Figma Plugin failed to start${NC}"
    echo -e "   Check logs with: docker-compose logs figma-plugin"
fi
if ! $QDRANT_READY; then
    echo -e " ${RED}❌ Qdrant failed to start${NC}"
    echo -e "   Check logs with: docker-compose logs qdrant"
fi

# Now start the regular native expo script
echo -e "\n${BLUE}🚀 Starting Native Expo...${NC}"
exec "$SCRIPT_DIR/start-native-expo.sh"