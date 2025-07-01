#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Checking Port Availability for MyExpo Services${NC}"
echo -e "${BLUE}================================================${NC}\n"

# Define all ports used by the application
declare -A PORTS=(
    # Core Services
    ["5432"]="PostgreSQL"
    ["6379"]="Redis"
    ["8081"]="Expo Dev Server"
    ["19000"]="Expo Go"
    ["19001"]="Expo Go"
    ["19002"]="Expo Go"
    
    # API & WebSocket
    ["3000"]="API Server"
    ["3001"]="Email Service"
    ["3002"]="WebSocket Server"
    ["3003"]="Logging Service"
    
    # Figma Plugin
    ["3456"]="Figma MCP Server"
    ["3457"]="Figma Vite Dev Server"
    ["3458"]="Figma WebSocket"
    
    # Qdrant Vector DB
    ["6333"]="Qdrant REST API"
    
    # Development Tools
    ["4983"]="Drizzle Studio"
    ["5050"]="pgAdmin"
    ["5173"]="Vite (if running separately)"
    
    # Analytics & Storage
    ["8000"]="PostHog"
    ["8123"]="ClickHouse HTTP"
    ["9000"]="MinIO API / ClickHouse Native"
    ["9001"]="MinIO Console"
    
    # Proxy
    ["80"]="Nginx HTTP"
    ["443"]="Nginx HTTPS"
)

# Function to check if port is in use
check_port() {
    local port=$1
    local service=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${RED}❌ Port $port ($service) is already in use${NC}"
        # Try to identify what's using it
        echo -e "   Used by: $(lsof -i :$port | grep LISTEN | awk '{print $1}' | uniq | tr '\n' ', ' | sed 's/,$//')"
        return 1
    else
        echo -e "${GREEN}✅ Port $port ($service) is available${NC}"
        return 0
    fi
}

# Check all ports
CONFLICTS=0
echo -e "${YELLOW}Checking ports...${NC}\n"

# Sort ports numerically
for port in $(echo "${!PORTS[@]}" | tr ' ' '\n' | sort -n); do
    if ! check_port "$port" "${PORTS[$port]}"; then
        ((CONFLICTS++))
    fi
done

echo -e "\n${YELLOW}Summary:${NC}"
if [ $CONFLICTS -eq 0 ]; then
    echo -e "${GREEN}✅ All ports are available!${NC}"
    echo -e "\nYou can safely run:"
    echo -e "  ${BLUE}bun run native:full${NC} - Start Expo with Figma plugin"
    echo -e "  ${BLUE}bun run native${NC} - Start Expo without Figma"
else
    echo -e "${RED}❌ Found $CONFLICTS port conflicts!${NC}"
    echo -e "\nTo resolve conflicts:"
    echo -e "1. Stop conflicting services"
    echo -e "2. Or change ports in .env files"
    echo -e "\nTo stop all Docker containers:"
    echo -e "  ${BLUE}docker stop \$(docker ps -q)${NC}"
    echo -e "\nTo stop specific services:"
    echo -e "  ${BLUE}docker-compose -f docker-compose.local.yml down${NC}"
    echo -e "  ${BLUE}docker-compose --profile figma down${NC}"
fi

# Check Docker status
echo -e "\n${YELLOW}Docker Status:${NC}"
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker is running${NC}"
    
    # Show running containers
    RUNNING_CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Ports}}" | tail -n +2)
    if [ ! -z "$RUNNING_CONTAINERS" ]; then
        echo -e "\n${YELLOW}Running containers:${NC}"
        echo "$RUNNING_CONTAINERS"
    else
        echo -e "${BLUE}ℹ️  No containers currently running${NC}"
    fi
else
    echo -e "${RED}❌ Docker is not running${NC}"
fi