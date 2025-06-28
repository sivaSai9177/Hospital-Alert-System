#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌐 Expo Manual IP Configuration${NC}"
echo -e "${BLUE}================================${NC}\n"

# Check if IP was provided as argument
if [[ ! -z "$1" ]]; then
    MANUAL_IP=$1
else
    # Show available IPs first
    echo -e "${CYAN}Available network interfaces:${NC}"
    ./scripts/utils/detect-network.sh | grep -E "en[0-9]|wlan|eth" | head -10
    echo ""
    
    # Ask for manual IP
    echo -e "${YELLOW}Enter the IP address to use (or press Enter to auto-detect):${NC}"
    read -p "> " MANUAL_IP
fi

# If no manual IP provided, let the main script auto-detect
if [[ ! -z "$MANUAL_IP" ]]; then
    # Validate IP format (basic check)
    if [[ ! "$MANUAL_IP" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        echo -e "${RED}❌ Invalid IP address format: $MANUAL_IP${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Using manual IP: $MANUAL_IP${NC}\n"
    export EXPO_LOCAL_IP=$MANUAL_IP
fi

# Run the main start script
./scripts/start-native-expo.sh