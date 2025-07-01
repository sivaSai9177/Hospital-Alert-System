#!/bin/bash
# Start mobile app with all required services

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Hospital Alert System - Mobile Development${NC}"
echo "=================================================="

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓ $service_name is running on port $port${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ $service_name is not running on port $port${NC}"
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local port=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}Waiting for $service_name to start...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo -e "${GREEN}✓ $service_name is ready${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗ $service_name failed to start${NC}"
    return 1
}

# 1. Check Docker
echo -e "\n${BLUE}1. Checking Docker...${NC}"
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# 2. Start Docker services
echo -e "\n${BLUE}2. Starting Docker services...${NC}"

# Check which docker-compose file to use
if [ -f "docker-compose.local.yml" ]; then
    COMPOSE_FILE="docker-compose.local.yml"
else
    COMPOSE_FILE="docker-compose.yml"
fi

echo "Using compose file: $COMPOSE_FILE"

# Start essential services
echo -e "${BLUE}Starting essential services (postgres, redis, mailhog)...${NC}"
docker-compose -f $COMPOSE_FILE up -d postgres-local redis-local mailhog 2>/dev/null || \
docker-compose -f $COMPOSE_FILE up -d postgres redis mailhog 2>/dev/null

# Wait for database
wait_for_service "PostgreSQL" 5432
wait_for_service "Redis" 6379
wait_for_service "Mailhog SMTP" 1025

# Start email service with profile
echo -e "\n${BLUE}Starting email service...${NC}"
docker-compose -f $COMPOSE_FILE --profile services up -d email-local 2>/dev/null || true

# 3. Check required environment variables
echo -e "\n${BLUE}3. Checking environment variables...${NC}"

# Source environment file
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Loaded .env.local${NC}"
else
    echo -e "${YELLOW}⚠ .env.local not found, using defaults${NC}"
fi

# Check critical variables
MISSING_VARS=()
[ -z "$DATABASE_URL" ] && MISSING_VARS+=("DATABASE_URL")
[ -z "$BETTER_AUTH_SECRET" ] && MISSING_VARS+=("BETTER_AUTH_SECRET")
[ -z "$EMAIL_HOST" ] && MISSING_VARS+=("EMAIL_HOST")

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠ Missing environment variables: ${MISSING_VARS[*]}${NC}"
    echo "Please check your .env.local file"
fi

# 4. Run database migrations
echo -e "\n${BLUE}4. Running database migrations...${NC}"
if command -v bunx &> /dev/null; then
    bunx drizzle-kit push 2>/dev/null && echo -e "${GREEN}✓ Database migrations completed${NC}" || \
    echo -e "${YELLOW}⚠ Database migrations skipped or already up to date${NC}"
else
    echo -e "${YELLOW}⚠ Bun not found, skipping migrations${NC}"
fi

# 5. Start the mobile app
echo -e "\n${BLUE}5. Starting Expo mobile app...${NC}"

# Set mobile-specific environment variables
export EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL:-"http://localhost:8081"}
export EXPO_PUBLIC_WS_URL=${EXPO_PUBLIC_WS_URL:-"ws://localhost:3002"}
export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
export REACT_NATIVE_PACKAGER_HOSTNAME=${LOCAL_IP:-"localhost"}

# Clear metro cache to avoid issues
echo -e "${BLUE}Clearing Metro cache...${NC}"
npx expo start --clear 2>/dev/null || true

# Display service URLs
echo -e "\n${GREEN}🎉 Services are ready!${NC}"
echo "=================================================="
echo -e "${BLUE}Service URLs:${NC}"
echo "  • Mobile App: http://localhost:8081"
echo "  • Mailhog UI: http://localhost:8025"
echo "  • Database: postgresql://localhost:5432/myexpo_dev"
echo "  • Redis: redis://localhost:6379"
if check_service "Email Service" 3001 >/dev/null 2>&1; then
    echo "  • Email Service: http://localhost:3001"
fi
echo ""
echo -e "${BLUE}Mobile Development Tips:${NC}"
echo "  • Press 'i' for iOS simulator"
echo "  • Press 'a' for Android emulator"
echo "  • Press 'w' for web browser"
echo "  • Press 'r' to reload the app"
echo "  • Press 'm' to toggle menu"
echo ""
echo -e "${YELLOW}Testing Onboarding:${NC}"
echo "  1. Open the app on your device/simulator"
echo "  2. If logged in, sign out to see onboarding"
echo "  3. Check Mailhog for verification emails"
echo "=================================================="

# Start Expo with proper flags
echo -e "\n${BLUE}Starting Expo...${NC}"
bun expo start --lan --go