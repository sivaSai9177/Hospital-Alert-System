# Port Management Guide

## Overview

MyExpo uses multiple services that require specific ports. This guide helps you manage port conflicts and understand the service architecture.

## Port Allocation

### Core Services (docker-compose.local.yml)
- **5432** - PostgreSQL (`myexpo-postgres-local`)
- **6379** - Redis (`myexpo-redis-local`)
- **3002** - WebSocket Server (`myexpo-websocket-local`)
- **3003** - Logging Service (`myexpo-logging-local`)
- **8081** - Expo Dev Server (native)

### Figma Plugin Services (docker-compose.yml)
- **3456** - Figma MCP Server
- **3457** - Figma Vite Dev Server
- **3458** - Figma WebSocket
- **6333** - Qdrant Vector Database

### Additional Services
- **5050** - pgAdmin (optional)
- **4983** - Drizzle Studio (optional)
- **8000** - PostHog Analytics (optional)
- **8123** - ClickHouse HTTP (optional)
- **9000** - MinIO/ClickHouse Native (optional)
- **9001** - MinIO Console (optional)

## Common Issues and Solutions

### Issue 1: Port Already in Use

**Symptoms:**
- Error: "bind: address already in use"
- Services fail to start

**Solutions:**

1. **Check what's using the port:**
   ```bash
   ./scripts/check-ports.sh
   ```

2. **Free specific ports:**
   ```bash
   ./scripts/manage-ports.sh free
   ```

3. **Stop all MyExpo containers:**
   ```bash
   ./scripts/manage-ports.sh stop-all
   ```

### Issue 2: Container Name Conflicts

**Problem:** 
Two different docker-compose files use different container names:
- `docker-compose.yml`: `myexpo-postgres`, `myexpo-redis`
- `docker-compose.local.yml`: `myexpo-postgres-local`, `myexpo-redis-local`

**Solution:**
The updated scripts now check for and handle these conflicts automatically.

### Issue 3: Services Not Starting

**Debug Steps:**

1. Check Docker logs:
   ```bash
   docker-compose logs figma-plugin
   docker-compose logs qdrant
   docker-compose -f docker-compose.local.yml logs postgres-local
   ```

2. Check container status:
   ```bash
   docker ps -a
   ```

3. Verify port availability:
   ```bash
   lsof -i :PORT_NUMBER
   ```

## Scripts Overview

### `bun run native:full`
Starts both Expo and Figma plugin with all required services:
- PostgreSQL, Redis (local versions)
- WebSocket, Logging services
- Figma plugin with Qdrant

### `bun run native`
Starts only Expo with core services (no Figma plugin)

### `bun run native:figma`
Starts only the Figma plugin services

### Port Management Scripts

1. **check-ports.sh** - Shows all port usage
2. **manage-ports.sh** - Interactive port management
3. **start-native-with-figma.sh** - Handles conflicts automatically

## Best Practices

1. **Before starting services:**
   ```bash
   ./scripts/manage-ports.sh check
   ```

2. **If ports are blocked:**
   ```bash
   ./scripts/manage-ports.sh free
   ```

3. **Clean restart:**
   ```bash
   docker-compose -f docker-compose.local.yml down
   docker-compose --profile figma down
   bun run native:full
   ```

4. **Development workflow:**
   - Use `native:full` for full-stack development
   - Use `native` for mobile-only development
   - Use `native:figma` for Figma plugin only

## Troubleshooting Commands

```bash
# View all running containers
docker ps

# Stop specific container
docker stop CONTAINER_NAME

# Remove stopped containers
docker container prune

# Check specific port
lsof -i :5432

# Kill process on port
kill -9 $(lsof -ti:5432)

# Reset everything
docker-compose -f docker-compose.local.yml down -v
docker-compose --profile figma down -v
```

## Environment Variables

Key environment variables for ports:
```env
POSTGRES_PORT=5432
REDIS_PORT=6379
FIGMA_MCP_PORT=3456
FIGMA_VITE_PORT=3457
FIGMA_WS_PORT=3458
QDRANT_PORT=6333
WS_PORT=3002
LOGGING_PORT=3003
EXPO_PORT=8081
```

Set custom ports in `.env.local` if defaults conflict with your system.