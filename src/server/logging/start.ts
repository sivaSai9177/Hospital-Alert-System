#!/usr/bin/env bun
/**
 * Logging Service Entry Point
 * Centralized logging service with PostHog integration
 */

import { createLoggingService, LoggingService } from './service';
import { log } from '@/lib/core/debug/server-logger';

// Initialize logging service
let loggingService: LoggingService;

try {
  loggingService = createLoggingService();
  log.info('Logging service initialized', 'LOGGING_START');
} catch (error) {
  log.error('Failed to initialize logging service', 'LOGGING_START', error);
  process.exit(1);
}

// Start the server
const port = parseInt(process.env.LOGGING_SERVICE_PORT || '3003', 10);

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;
    
    // Health check endpoint
    if (url.pathname === '/health' && method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        service: 'logging', 
        timestamp: new Date().toISOString(),
        postHogEnabled: !!process.env.POSTHOG_API_KEY,
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }
    
    // Log TRPC call
    if (url.pathname === '/trpc' && method === 'POST') {
      try {
        const body = await req.json();
        
        await loggingService.logTRPCCall({
          procedure: body.procedure,
          input: body.input,
          output: body.output,
          error: body.error,
          duration: body.duration,
          success: body.success,
          level: body.success ? 'info' : 'error',
          message: `TRPC ${body.procedure} ${body.success ? 'succeeded' : 'failed'}`,
          userId: body.userId,
          organizationId: body.organizationId,
          hospitalId: body.hospitalId,
          traceId: body.traceId,
          spanId: body.spanId,
          metadata: body.metadata,
        });
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (error) {
        log.error('Failed to log TRPC call', 'LOGGING_API', error);
        return new Response(JSON.stringify({ error: 'Failed to log TRPC call' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }
    
    // Log general event
    if (url.pathname === '/event' && method === 'POST') {
      try {
        const body = await req.json();
        
        await loggingService.logEvent({
          level: body.level || 'info',
          service: body.service,
          category: body.category,
          message: body.message,
          metadata: body.metadata,
          userId: body.userId,
          organizationId: body.organizationId,
          hospitalId: body.hospitalId,
          traceId: body.traceId,
          spanId: body.spanId,
        });
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (error) {
        log.error('Failed to log event', 'LOGGING_API', error);
        return new Response(JSON.stringify({ error: 'Failed to log event' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }
    
    // Log performance metric
    if (url.pathname === '/performance' && method === 'POST') {
      try {
        const body = await req.json();
        
        await loggingService.logPerformance({
          name: body.name,
          value: body.value,
          unit: body.unit,
          tags: body.tags,
        });
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (error) {
        log.error('Failed to log performance metric', 'LOGGING_API', error);
        return new Response(JSON.stringify({ error: 'Failed to log performance metric' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }
    
    // Batch log endpoint
    if (url.pathname === '/batch' && method === 'POST') {
      try {
        const body = await req.json();
        const events = body.events || [];
        
        for (const event of events) {
          if (event.type === 'trpc') {
            await loggingService.logTRPCCall(event);
          } else {
            await loggingService.logEvent(event);
          }
        }
        
        return new Response(JSON.stringify({ 
          success: true,
          processed: events.length 
        }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      } catch (error) {
        log.error('Failed to process batch', 'LOGGING_API', error);
        return new Response(JSON.stringify({ error: 'Failed to process batch' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }
    
    // Default response
    return new Response('Logging Service API', { status: 200 });
  }
});

log.info(`Logging service listening on port ${server.port}`, 'LOGGING_START');
log.info('Endpoints:', 'LOGGING_START', {
  health: `http://localhost:${server.port}/health`,
  trpc: `http://localhost:${server.port}/trpc`,
  event: `http://localhost:${server.port}/event`,
  performance: `http://localhost:${server.port}/performance`,
  batch: `http://localhost:${server.port}/batch`,
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received, shutting down gracefully', 'LOGGING_START');
  loggingService.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  log.info('SIGINT received, shutting down gracefully', 'LOGGING_START');
  loggingService.close();
  process.exit(0);
});