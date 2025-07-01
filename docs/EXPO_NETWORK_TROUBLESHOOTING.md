# Expo Network Troubleshooting Guide

## Quick Start

To test on physical devices within your WiFi network:

```bash
# Auto-detect network IP and start Expo
bun run native

# Manually specify IP address
bun run native:ip 192.168.1.104

# Or set environment variable
export EXPO_LOCAL_IP=192.168.1.104
bun run native

# Check network configuration
bun run native:detect
```

## Common Issues and Solutions

### 1. Cannot Connect from Physical Device

**Symptoms:**
- QR code scans but app won't load
- "Network request failed" errors
- Expo Go shows connection timeout

**Solutions:**

1. **Check Firewall Settings**
   ```bash
   # macOS - Allow incoming connections for node
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
   ```

2. **Verify Correct IP**
   ```bash
   # Check detected IP
   bun run native:detect
   
   # Use manual IP if auto-detection fails
   bun run native:ip YOUR_WIFI_IP
   ```

3. **Ensure Same Network**
   - Phone and computer must be on the same WiFi network
   - Disable VPN on both devices
   - Check if network isolation is enabled on router

### 2. Multiple Network Interfaces

If you have multiple network interfaces (VPN, Docker, etc.):

```bash
# List all interfaces
bun run native:detect

# Use specific IP
export EXPO_LOCAL_IP=192.168.1.104
bun run native
```

### 3. Metro Bundler Issues

**Clear Metro cache:**
```bash
rm -rf .expo
rm -rf node_modules/.cache
bun run native
```

### 4. Port Conflicts

Check if port 8081 is in use:
```bash
lsof -i :8081
# Kill the process if needed
kill -9 <PID>
```

### 5. API Connection Issues

Ensure environment variables are set correctly:
```bash
# Check current settings
echo $EXPO_PUBLIC_API_URL
echo $REACT_NATIVE_PACKAGER_HOSTNAME

# These should match your WiFi IP when using physical devices
```

## Network Configuration Details

The `start-native-expo.sh` script automatically:

1. Detects your WiFi IP address
2. Sets up environment variables:
   - `EXPO_PUBLIC_API_URL`: API server URL
   - `EXPO_PUBLIC_WS_URL`: WebSocket URL
   - `REACT_NATIVE_PACKAGER_HOSTNAME`: Metro bundler host

3. Starts Expo with `--host` flag using detected IP

## Manual Network Setup

If auto-detection fails:

1. Find your IP manually:
   ```bash
   # macOS
   ifconfig en0 | grep "inet " | awk '{print $2}'
   
   # Linux
   ip addr show wlan0 | grep "inet " | awk '{print $2}' | cut -d/ -f1
   ```

2. Start with manual IP:
   ```bash
   bun run native:ip 192.168.1.XXX
   ```

## Advanced Troubleshooting

### Enable Expo Debug Logs
```bash
export EXPO_DEBUG=true
bun run native
```

### Check WebSocket Connection
```bash
# Test WebSocket server
curl -I http://localhost:3002/api/trpc
```

### Verify All Services
```bash
# Check PostgreSQL
docker exec myexpo-postgres-local pg_isready

# Check Redis
docker exec myexpo-redis-local redis-cli ping

# Check WebSocket
curl http://localhost:3002/api/trpc
```

## Router Configuration

Some routers block device-to-device communication. Check:

1. **AP Isolation** - Should be disabled
2. **Guest Network** - Use main network instead
3. **Firewall Rules** - Allow local network communication

## Still Having Issues?

1. Run network detection:
   ```bash
   bun run native:detect
   ```

2. Copy the output and check:
   - Is the detected IP correct?
   - Can you ping this IP from your phone?
   - Are all services showing as running?

3. Try tunnel mode (slower but more reliable):
   ```bash
   bun run dev:tunnel
   ```

This uses ngrok to create a public tunnel, bypassing local network issues.