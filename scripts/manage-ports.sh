#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
}

# Function to stop service using a port
stop_port() {
    local port=$1
    local service=$2
    
    if check_port $port; then
        echo -e "${YELLOW}Stopping process on port $port ($service)...${NC}"
        
        # Try to stop gracefully first
        PID=$(lsof -ti:$port -sTCP:LISTEN)
        if [ ! -z "$PID" ]; then
            # Check if it's a Docker container
            CONTAINER=$(docker ps --format "table {{.Names}}\t{{.Ports}}" | grep ":$port->" | awk '{print $1}')
            if [ ! -z "$CONTAINER" ]; then
                echo -e "  Stopping Docker container: $CONTAINER"
                docker stop $CONTAINER
            else
                echo -e "  Killing process PID: $PID"
                kill -TERM $PID 2>/dev/null || kill -KILL $PID 2>/dev/null
            fi
        fi
        
        # Wait a moment
        sleep 1
        
        # Check if stopped
        if check_port $port; then
            echo -e "${RED}  ❌ Failed to stop service on port $port${NC}"
            return 1
        else
            echo -e "${GREEN}  ✅ Port $port is now free${NC}"
            return 0
        fi
    else
        return 0
    fi
}

# Function to ensure required ports are free
ensure_ports_free() {
    local PORTS=("$@")
    local FAILED=0
    
    echo -e "${BLUE}🔍 Checking required ports...${NC}"
    
    for port_info in "${PORTS[@]}"; do
        IFS=':' read -r port service <<< "$port_info"
        
        if check_port $port; then
            echo -e "${RED}❌ Port $port ($service) is in use${NC}"
            
            # Show what's using it
            echo -e "   Used by: $(lsof -i :$port | grep LISTEN | awk '{print $1}' | uniq | tr '\n' ', ' | sed 's/,$//')"
            
            # Ask user if they want to stop it
            read -p "   Stop this service? (y/n) " -n 1 -r
            echo
            
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                if ! stop_port $port "$service"; then
                    ((FAILED++))
                fi
            else
                ((FAILED++))
            fi
        else
            echo -e "${GREEN}✅ Port $port ($service) is available${NC}"
        fi
    done
    
    return $FAILED
}

# Function to stop all MyExpo containers
stop_all_myexpo() {
    echo -e "${YELLOW}🐳 Stopping all MyExpo containers...${NC}"
    
    # Get all containers with myexpo in the name
    CONTAINERS=$(docker ps --format "{{.Names}}" | grep myexpo || true)
    
    if [ ! -z "$CONTAINERS" ]; then
        echo "$CONTAINERS" | while read container; do
            echo -e "  Stopping $container..."
            docker stop $container
        done
        echo -e "${GREEN}✅ All MyExpo containers stopped${NC}"
    else
        echo -e "${BLUE}ℹ️  No MyExpo containers running${NC}"
    fi
}

# Function to show port usage
show_port_usage() {
    echo -e "${BLUE}📊 Current Port Usage:${NC}"
    echo -e "┌────────┬─────────────────────────┬────────────────┐"
    echo -e "│ Port   │ Service                 │ Status         │"
    echo -e "├────────┼─────────────────────────┼────────────────┤"
    
    declare -A PORTS=(
        ["5432"]="PostgreSQL"
        ["6379"]="Redis"
        ["3002"]="WebSocket Server"
        ["3003"]="Logging Service"
        ["3456"]="Figma MCP Server"
        ["3457"]="Figma Vite Dev"
        ["3458"]="Figma WebSocket"
        ["6333"]="Qdrant Vector DB"
        ["8081"]="Expo Dev Server"
    )
    
    for port in $(echo "${!PORTS[@]}" | tr ' ' '\n' | sort -n); do
        service="${PORTS[$port]}"
        if check_port $port; then
            status="${RED}In Use${NC}"
            process=$(lsof -i :$port | grep LISTEN | awk '{print $1}' | uniq | head -1)
            printf "│ %-6s │ %-23s │ %-14s │\n" "$port" "$service" "$status ($process)"
        else
            status="${GREEN}Free${NC}"
            printf "│ %-6s │ %-23s │ %-14s │\n" "$port" "$service" "$status"
        fi
    done
    
    echo -e "└────────┴─────────────────────────┴────────────────┘"
}

# Main menu
case "${1:-menu}" in
    check)
        show_port_usage
        ;;
    
    free)
        # Free ports for native:full
        REQUIRED_PORTS=(
            "5432:PostgreSQL"
            "6379:Redis"
            "3002:WebSocket"
            "3003:Logging"
            "3456:Figma MCP"
            "3457:Figma Vite"
            "3458:Figma WS"
            "6333:Qdrant"
        )
        
        ensure_ports_free "${REQUIRED_PORTS[@]}"
        
        if [ $? -eq 0 ]; then
            echo -e "\n${GREEN}✅ All required ports are free!${NC}"
            echo -e "You can now run: ${BLUE}bun run native:full${NC}"
        else
            echo -e "\n${RED}❌ Some ports could not be freed${NC}"
            echo -e "You may need to manually stop the services"
        fi
        ;;
    
    stop-all)
        stop_all_myexpo
        ;;
    
    menu|*)
        echo -e "${BLUE}🛠  MyExpo Port Manager${NC}"
        echo -e "${BLUE}=====================${NC}"
        echo
        echo -e "${YELLOW}Usage:${NC}"
        echo -e "  $0 check      - Check port usage"
        echo -e "  $0 free       - Free required ports for native:full"
        echo -e "  $0 stop-all   - Stop all MyExpo containers"
        echo
        echo -e "${YELLOW}Quick commands:${NC}"
        echo -e "  ${BLUE}./scripts/manage-ports.sh check${NC}"
        echo -e "  ${BLUE}./scripts/manage-ports.sh free && bun run native:full${NC}"
        ;;
esac