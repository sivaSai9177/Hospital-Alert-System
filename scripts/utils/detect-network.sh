#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if we're in export mode first
EXPORT_MODE=false
if [[ ! -z "$1" ]] && [[ "$1" == "--export" ]]; then
    EXPORT_MODE=true
fi

# Only show header if not in export mode
if [[ "$EXPORT_MODE" == "false" ]]; then
    echo -e "${BLUE}🌐 Network Interface Detection Utility${NC}"
    echo -e "${BLUE}=====================================${NC}\n"
fi

# Function to detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macOS";;
        Linux*)     echo "Linux";;
        *)          echo "Unknown";;
    esac
}

OS=$(detect_os)

# Function to get WiFi interface name
get_wifi_interface() {
    if [[ "$OS" == "macOS" ]]; then
        # On macOS, WiFi is typically en0 or en1
        for interface in en0 en1 en2; do
            if ifconfig $interface 2>/dev/null | grep -q "status: active"; then
                echo $interface
                return
            fi
        done
    elif [[ "$OS" == "Linux" ]]; then
        # On Linux, look for wlan* or wlp* interfaces
        for interface in $(ip link | grep -E "wlan|wlp" | cut -d: -f2 | tr -d ' '); do
            if ip addr show $interface | grep -q "UP"; then
                echo $interface
                return
            fi
        done
    fi
    echo ""
}

# Function to get IP address for a given interface
get_ip_for_interface() {
    local interface=$1
    if [[ "$OS" == "macOS" ]]; then
        ifconfig $interface 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
    elif [[ "$OS" == "Linux" ]]; then
        ip addr show $interface 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1
    fi
}

# Function to get all active network interfaces with IPs
get_all_interfaces() {
    echo -e "${CYAN}Active Network Interfaces:${NC}"
    echo -e "${CYAN}-------------------------${NC}"
    
    if [[ "$OS" == "macOS" ]]; then
        # Get all interfaces
        for interface in $(ifconfig -l); do
            # Skip loopback and inactive interfaces
            if [[ "$interface" == "lo0" ]] || ! ifconfig $interface 2>/dev/null | grep -q "status: active"; then
                continue
            fi
            
            local ip=$(get_ip_for_interface $interface)
            if [[ ! -z "$ip" ]]; then
                local desc=""
                case $interface in
                    en0|en1|en2) desc="(WiFi)" ;;
                    bridge*) desc="(Bridge)" ;;
                    utun*) desc="(VPN)" ;;
                esac
                echo -e "  ${GREEN}$interface${NC} $desc: $ip"
            fi
        done
    elif [[ "$OS" == "Linux" ]]; then
        # Get all interfaces
        for interface in $(ip link | grep -v "lo:" | grep "state UP" | cut -d: -f2 | tr -d ' '); do
            local ip=$(get_ip_for_interface $interface)
            if [[ ! -z "$ip" ]]; then
                local desc=""
                case $interface in
                    wlan*|wlp*) desc="(WiFi)" ;;
                    eth*|enp*) desc="(Ethernet)" ;;
                    docker*|br-*) desc="(Docker)" ;;
                esac
                echo -e "  ${GREEN}$interface${NC} $desc: $ip"
            fi
        done
    fi
}

# Function to detect primary IP
detect_primary_ip() {
    local wifi_interface=$(get_wifi_interface)
    
    if [[ ! -z "$wifi_interface" ]]; then
        local ip=$(get_ip_for_interface $wifi_interface)
        if [[ ! -z "$ip" ]]; then
            echo $ip
            return
        fi
    fi
    
    # Fallback: try to get IP by routing to Google DNS
    if command -v ip &> /dev/null; then
        ip route get 8.8.8.8 2>/dev/null | grep -oP 'src \K[^ ]+'
    elif [[ "$OS" == "macOS" ]]; then
        # More reliable method for macOS
        ipconfig getifaddr $(route -n get 8.8.8.8 2>/dev/null | awk '/interface: / {print $2}') 2>/dev/null
    fi
}

# Main execution

# Detect primary IP (always needed)
PRIMARY_IP=$(detect_primary_ip)

# If export mode, just output IP and exit
if [[ "$EXPORT_MODE" == "true" ]]; then
    echo -n "$PRIMARY_IP"
    exit 0
fi

# Otherwise show full output
WIFI_INTERFACE=$(get_wifi_interface)

echo -e "${YELLOW}Operating System:${NC} $OS"
echo ""

# Show all interfaces
get_all_interfaces
echo ""

if [[ ! -z "$PRIMARY_IP" ]]; then
    echo -e "${GREEN}✅ Primary IP detected:${NC} $PRIMARY_IP"
    if [[ ! -z "$WIFI_INTERFACE" ]]; then
        echo -e "${GREEN}✅ WiFi Interface:${NC} $WIFI_INTERFACE"
    fi
else
    echo -e "${RED}❌ Could not detect primary IP address${NC}"
    echo -e "${YELLOW}💡 Please check your network connection${NC}"
fi

echo ""
echo -e "${BLUE}Expo Connection URLs:${NC}"
echo -e "  Metro Bundler: ${CYAN}http://$PRIMARY_IP:8081${NC}"
echo -e "  API URL: ${CYAN}http://$PRIMARY_IP:8081${NC}"
echo -e "  WebSocket: ${CYAN}ws://$PRIMARY_IP:3002${NC}"