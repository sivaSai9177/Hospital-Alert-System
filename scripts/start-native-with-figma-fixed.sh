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
    # Stop local services
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

# First, check if main postgres/redis are running and stop them
echo -e "${YELLOW}🧹 Checking for conflicting services...${NC}"
if docker ps | grep -q "myexpo-postgres" && ! docker ps | grep -q "myexpo-postgres-local"; then
    echo -e "${YELLOW}⚠️  Found main postgres running, stopping it...${NC}"
    docker stop myexpo-postgres 2>/dev/null || true
fi

if docker ps | grep -q "myexpo-redis" && ! docker ps | grep -q "myexpo-redis-local"; then
    echo -e "${YELLOW}⚠️  Found main redis running, stopping it...${NC}"
    docker stop myexpo-redis 2>/dev/null || true
fi

# Stop any existing Expo container to avoid conflicts
echo -e "${YELLOW}🧹 Cleaning up any existing Expo containers...${NC}"
docker stop myexpo-expo-local 2>/dev/null || true
docker rm myexpo-expo-local 2>/dev/null || true

# Start PostgreSQL and Redis from local compose file
echo -e "\n${YELLOW}🐳 Starting database services...${NC}"
docker-compose -f docker-compose.local.yml up -d postgres-local redis-local

# Wait for services to be healthy
echo -e "\n${YELLOW}⏳ Waiting for database services...${NC}"

# Wait for PostgreSQL
echo -n "PostgreSQL"
until docker exec myexpo-postgres-local pg_isready -U myexpo > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✅${NC}"

# Wait for Redis
echo -n "Redis"
until docker exec myexpo-redis-local redis-cli ping > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✅${NC}"

# Start Figma plugin and Qdrant
echo -e "\n${PURPLE}🎨 Starting Figma Plugin with Memory Service...${NC}"
docker-compose --profile figma up -d figma-plugin qdrant --remove-orphans

# Wait for Figma services
echo -e "\n${YELLOW}⏳ Waiting for Figma services...${NC}"

# Wait for Qdrant
echo -n "Qdrant"
for i in {1..30}; do
    if curl -s http://localhost:6333/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for Figma plugin
echo -n "Figma Plugin"
for i in {1..30}; do
    if curl -s http://localhost:3457 > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Start logging service
echo -e "\n${YELLOW}📊 Starting logging service...${NC}"
docker-compose -f docker-compose.local.yml up -d logging-local

# Build and start WebSocket server
echo -e "\n${YELLOW}🔌 Starting WebSocket server...${NC}"
docker-compose -f docker-compose.local.yml up -d websocket-local

# Wait for remaining services
echo -e "\n${YELLOW}⏳ Waiting for remaining services...${NC}"

# Wait for Logging service
echo -n "Logging Service"
for i in {1..10}; do
    if curl -s http://localhost:3003/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for WebSocket
echo -n "WebSocket"
for i in {1..10}; do
    if docker ps | grep -q myexpo-websocket-local; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Run database migrations
echo -e "\n${YELLOW}🗄  Running database migrations...${NC}"
DATABASE_URL="postgresql://myexpo:myexpo123@localhost:5432/myexpo_dev" \
APP_ENV=local \
bunx drizzle-kit push

# Get local IP for mobile access
if [[ ! -z "$EXPO_LOCAL_IP" ]]; then
    LOCAL_IP=$EXPO_LOCAL_IP
    echo -e "${YELLOW}📍 Using manual IP address: $LOCAL_IP${NC}"
else
    # Use network detection utility
    LOCAL_IP=$("$SCRIPT_DIR/utils/detect-network.sh" --export 2>/dev/null)
    LOCAL_IP=$(echo "$LOCAL_IP" | tr -d '\n' | tr -d ' ')
    
    # Fallback to old method if detection fails
    if [[ -z "$LOCAL_IP" ]] || [[ "$LOCAL_IP" == *"Network"* ]]; then
        LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
    fi
fi

# Validate IP
if [[ -z "$LOCAL_IP" ]]; then
    echo -e "${RED}❌ Could not detect local IP address!${NC}"
    echo -e "${YELLOW}💡 You can manually set it with: export EXPO_LOCAL_IP=your.ip.address${NC}"
    exit 1
fi

echo -e "${GREEN}📱 Using IP address: $LOCAL_IP${NC}"

# Export environment variables for Expo
export DATABASE_URL="postgresql://myexpo:myexpo123@localhost:5432/myexpo_dev"
export REDIS_URL="redis://localhost:6379"
export EXPO_PUBLIC_API_URL="http://${LOCAL_IP}:8081"
export EXPO_PUBLIC_WS_URL="ws://${LOCAL_IP}:3002/api/trpc"
export BETTER_AUTH_URL="http://${LOCAL_IP}:8081"
export BETTER_AUTH_BASE_URL="http://${LOCAL_IP}:8081"
export APP_ENV="local"
export NODE_ENV="development"
export EXPO_DEVTOOLS_LISTEN_ADDRESS="0.0.0.0"
export REACT_NATIVE_PACKAGER_HOSTNAME="${LOCAL_IP}"
export LOCAL_IP="${LOCAL_IP}"
export LOGGING_SERVICE_URL="http://localhost:3003"
export EXPO_PUBLIC_LOGGING_SERVICE_URL="http://${LOCAL_IP}:3003"

echo -e "\n${GREEN}✅ All services are running!${NC}"

# Display service status
echo -e "\n${BLUE}🌐 Active Services:${NC}"
echo -e "┌─────────────────────────────────────────────────┐"
echo -e "│ ${GREEN}Database Services:${NC}                             │"
echo -e "│   PostgreSQL: localhost:5432                    │"
echo -e "│   Redis: localhost:6379                         │"
echo -e "│                                                 │"
echo -e "│ ${GREEN}Application Services:${NC}                          │"
echo -e "│   WebSocket: localhost:3002                     │"
echo -e "│   Logging: localhost:3003                       │"
echo -e "│                                                 │"
echo -e "│ ${PURPLE}Figma Plugin Services:${NC}                         │"
echo -e "│   MCP Server: localhost:3456                    │"
echo -e "│   Vite Dev Server: localhost:3457               │"
echo -e "│   WebSocket: localhost:3458                     │"
echo -e "│   Qdrant: localhost:6333                        │"
echo -e "└─────────────────────────────────────────────────┘"

echo -e "\n${BLUE}📱 Access Points:${NC}"
echo -e "┌─────────────────────────────────────────────────┐"
echo -e "│ ${GREEN}Mobile Device (Same WiFi):${NC}                     │"
echo -e "│   Expo Go App: http://${LOCAL_IP}:8081        │"
echo -e "│   API Server: http://${LOCAL_IP}:8081         │"
echo -e "│   WebSocket: ws://${LOCAL_IP}:3002            │"
echo -e "│                                                 │"
echo -e "│ ${PURPLE}Figma Plugin:${NC}                                  │"
echo -e "│   Open in browser: http://localhost:3457        │"
echo -e "└─────────────────────────────────────────────────┘"

echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${PURPLE}===========================================${NC}\n"

# Clear Expo cache
echo -e "${YELLOW}🧹 Clearing Expo cache...${NC}"
rm -rf .expo
rm -rf node_modules/.cache

# Start Expo natively
echo -e "${YELLOW}🎯 Starting Expo...${NC}\n"
echo -e "${BLUE}📱 Scan the QR code with Expo Go app on your phone${NC}\n"

# Change to project root and start Expo
cd "$(dirname "$0")/.."
REACT_NATIVE_PACKAGER_HOSTNAME="$LOCAL_IP" NODE_OPTIONS="--max-old-space-size=8192" EXPO_GO=1 expo start --lan --go --clear

# Cleanup will be called when Expo exits
cleanup