#!/bin/bash

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Native Expo with Docker Services${NC}"
echo -e "${BLUE}=========================================${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}⏹  Shutting down services...${NC}"
    docker-compose -f docker-compose.local.yml stop postgres-local redis-local logging-local
    docker stop myexpo-websocket-local 2>/dev/null || true
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup INT TERM

# Check for running services from main docker-compose
if docker ps --format "{{.Names}}" | grep -E "^myexpo-postgres$" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Found myexpo-postgres running, may conflict with local services${NC}"
fi
if docker ps --format "{{.Names}}" | grep -E "^myexpo-redis$" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Found myexpo-redis running, may conflict with local services${NC}"
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running! Please start Docker Desktop.${NC}"
    exit 1
fi

# Stop any existing Expo container to avoid conflicts
echo -e "${YELLOW}🧹 Cleaning up any existing Expo containers...${NC}"
docker stop myexpo-expo-local 2>/dev/null || true
docker rm myexpo-expo-local 2>/dev/null || true

# Stop and remove old WebSocket container if exists
docker stop myexpo-websocket-local 2>/dev/null || true
docker rm myexpo-websocket-local 2>/dev/null || true

# Check if services are already running from native:full
POSTGRES_RUNNING=$(docker ps --format "{{.Names}}" | grep -E "^myexpo-postgres-local$" || true)
REDIS_RUNNING=$(docker ps --format "{{.Names}}" | grep -E "^myexpo-redis-local$" || true)

if [[ -z "$POSTGRES_RUNNING" ]] || [[ -z "$REDIS_RUNNING" ]]; then
    # Start only the required services (not Expo)
    echo -e "\n${YELLOW}🐳 Starting Docker services (without Expo)...${NC}"
    docker-compose -f docker-compose.local.yml up -d postgres-local redis-local logging-local
else
    echo -e "\n${GREEN}✅ Database services already running${NC}"
    # Ensure logging is running
    docker-compose -f docker-compose.local.yml up -d logging-local
fi

# Check if WebSocket is already running from docker-compose
WS_RUNNING=$(docker ps --format "{{.Names}}" | grep -E "^myexpo-websocket-local$" || true)

if [[ -z "$WS_RUNNING" ]]; then
    # Build and start the new WebSocket server
    echo -e "\n${YELLOW}🔌 Starting WebSocket server...${NC}"
    docker-compose -f docker-compose.local.yml up -d websocket-local
else
    echo -e "\n${GREEN}✅ WebSocket server already running${NC}"
fi

# Wait for services to be healthy
echo -e "\n${YELLOW}⏳ Waiting for services to be ready...${NC}"

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

# Wait for WebSocket (check if container is running and responding)
echo -n "WebSocket"
for i in {1..10}; do
    if docker ps | grep -q myexpo-websocket-local && curl -s http://localhost:3002/api/trpc > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

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

# Run database migrations
echo -e "\n${YELLOW}🗄  Running database migrations...${NC}"
DATABASE_URL="postgresql://myexpo:myexpo123@localhost:5432/myexpo_dev" \
APP_ENV=local \
bunx drizzle-kit push

# Get local IP for mobile access
# First check if user provided a manual IP
if [[ ! -z "$EXPO_LOCAL_IP" ]]; then
    LOCAL_IP=$EXPO_LOCAL_IP
    echo -e "${YELLOW}📍 Using manual IP address: $LOCAL_IP${NC}"
else
    # Use our network detection utility (capture only the IP)
    LOCAL_IP=$("$SCRIPT_DIR/utils/detect-network.sh" --export 2>/dev/null)
    
    # Clean up any whitespace
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
# Don't override BETTER_AUTH_SECRET - use the one from .env
export APP_ENV="local"
export NODE_ENV="development"
export EXPO_DEVTOOLS_LISTEN_ADDRESS="0.0.0.0"
export REACT_NATIVE_PACKAGER_HOSTNAME="${LOCAL_IP}"
export LOCAL_IP="${LOCAL_IP}"

# Logging service configuration
export LOGGING_SERVICE_URL="http://localhost:3003"
export EXPO_PUBLIC_LOGGING_SERVICE_URL="http://${LOCAL_IP}:3003"

# Debug: Show the actual API URL being used
echo -e "${YELLOW}🔧 API Configuration:${NC}"
echo -e "   EXPO_PUBLIC_API_URL: ${EXPO_PUBLIC_API_URL}"
echo -e "   EXPO_PUBLIC_WS_URL: ${EXPO_PUBLIC_WS_URL}"

echo -e "\n${GREEN}✅ All services are running!${NC}"

# Run network detection to show all interfaces
echo -e "\n${BLUE}🌐 Network Configuration:${NC}"
"$SCRIPT_DIR/utils/detect-network.sh" 2>/dev/null | grep -E "(Active Network|en[0-9]|WiFi|Primary IP)" | head -n 6

echo -e "\n${BLUE}📱 Access Points:${NC}"
echo -e "┌─────────────────────────────────────────────────┐"
echo -e "│ ${GREEN}Local Development:${NC}                              │"
echo -e "│   Web Browser: http://localhost:8081            │"
echo -e "│   Metro Bundler: http://localhost:8081          │"
echo -e "│                                                 │"
echo -e "│ ${GREEN}Mobile Device (Same WiFi):${NC}                     │"
echo -e "│   Expo Go App: http://${LOCAL_IP}:8081        │"
echo -e "│   API Server: http://${LOCAL_IP}:8081         │"
echo -e "│   WebSocket: ws://${LOCAL_IP}:3002            │"
echo -e "│                                                 │"
echo -e "│ ${GREEN}Backend Services:${NC}                              │"
echo -e "│   Database: postgresql://localhost:5432         │"
echo -e "│   Redis: redis://localhost:6379                 │"
echo -e "│   Logging: http://localhost:3003                │"
echo -e "└─────────────────────────────────────────────────┘"

echo -e "\n${BLUE}📱 Expo Go Commands:${NC}"
echo -e "┌─────────────────────────────────────────┐"
echo -e "│ ${GREEN}i${NC} → Open iOS Simulator                 │"
echo -e "│ ${GREEN}a${NC} → Open Android Emulator              │"
echo -e "│ ${GREEN}w${NC} → Open Web Browser                   │"
echo -e "│ ${GREEN}r${NC} → Reload app                         │"
echo -e "│ ${GREEN}m${NC} → Toggle menu                        │"
echo -e "│ ${GREEN}d${NC} → Show developer tools               │"
echo -e "│ ${GREEN}shift+d${NC} → Show development menu       │"
echo -e "└─────────────────────────────────────────┘"

echo -e "\n${BLUE}📲 Test Credentials:${NC}"
echo -e "┌─────────────────────────────────────────┐"
echo -e "│ Operator: operator@test.com             │"
echo -e "│ Doctor:   doctor@test.com               │"
echo -e "│ Admin:    admin@test.com                │"
echo -e "│ Password: [Role]123! (e.g. Doctor123!)  │"
echo -e "└─────────────────────────────────────────┘"

echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"
echo -e "${BLUE}=========================================${NC}\n"

# Clear Expo cache first
echo -e "${YELLOW}🧹 Clearing Expo cache...${NC}"
rm -rf .expo
rm -rf node_modules/.cache

# Start Expo natively with increased memory limit
echo -e "${YELLOW}🎯 Starting Expo with increased memory limit...${NC}\n"
echo -e "${BLUE}📱 Scan the QR code with Expo Go app on your phone${NC}\n"

# Use --lan option and set the hostname environment variable
# Make sure we're in the right directory
cd "$(dirname "$0")/.."
REACT_NATIVE_PACKAGER_HOSTNAME="$LOCAL_IP" NODE_OPTIONS="--max-old-space-size=8192" EXPO_GO=1 expo start --lan --go --clear

# Cleanup will be called when Expo exits
cleanup