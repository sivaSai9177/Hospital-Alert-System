/**
 * Logging Service
 * Centralized logging service that integrates with PostHog for analytics
 */

import { log } from '@/lib/core/debug/server-logger';

// Dynamic import PostHog to make it optional
let PostHog: any;
try {
  // Using dynamic require to make PostHog optional
   
  PostHog = require('posthog-node').PostHog;
} catch (_error) {
  log.warn('PostHog module not found, running without PostHog integration', 'LOGGING');
}

export interface LogEvent {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  category: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  organizationId?: string;
  hospitalId?: string;
  traceId?: string;
  spanId?: string;
}

export interface TRPCLogEvent extends LogEvent {
  procedure: string;
  input?: any;
  output?: any;
  error?: any;
  duration?: number;
  success: boolean;
}

export interface PostHogConfig {
  apiKey?: string;
  apiHost?: string;
  enabled: boolean;
}

export class LoggingService {
  private postHogConfig: PostHogConfig;
  private postHogClient: any | null = null;
  private batchQueue: LogEvent[] = [];
  private batchInterval: ReturnType<typeof setInterval> | null = null;
  private batchSize = 100;
  private flushIntervalMs = 5000;

  constructor(config?: Partial<PostHogConfig>) {
    this.postHogConfig = {
      apiKey: config?.apiKey || process.env.POSTHOG_API_KEY,
      apiHost: config?.apiHost || process.env.POSTHOG_API_HOST || 'http://localhost:8000',
      enabled: config?.enabled ?? (process.env.POSTHOG_ENABLED === 'true' || !!process.env.POSTHOG_API_KEY),
    };

    // Initialize PostHog client if enabled and available
    if (this.postHogConfig.enabled && this.postHogConfig.apiKey && PostHog) {
      this.postHogClient = new PostHog(this.postHogConfig.apiKey, {
        host: this.postHogConfig.apiHost,
        flushAt: 20,
        flushInterval: 5000,
      });
    }

    if (this.postHogConfig.enabled) {
      this.startBatchInterval();
    }

    log.info('Logging service initialized', 'LOGGING', {
      postHogEnabled: this.postHogConfig.enabled,
      postHogHost: this.postHogConfig.apiHost,
      batchSize: this.batchSize,
      flushInterval: this.flushIntervalMs,
    });
  }

  /**
   * Log a TRPC procedure call
   */
  async logTRPCCall(event: Omit<TRPCLogEvent, 'id' | 'timestamp' | 'service' | 'category'>): Promise<void> {
    const logEvent: TRPCLogEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
      service: 'trpc',
      category: 'api-call',
    };

    // Log locally
    const logLevel = event.success ? 'info' : 'error';
    log[logLevel](`TRPC ${event.procedure}`, 'TRPC', {
      procedure: event.procedure,
      duration: event.duration,
      success: event.success,
      userId: event.userId,
      ...(event.error && { error: event.error }),
    });

    // Add to batch queue
    this.addToBatch(logEvent);

    // Send to PostHog if enabled
    if (this.postHogConfig.enabled && this.postHogConfig.apiKey) {
      this.sendToPostHog(logEvent);
    }
  }

  /**
   * Log a general event
   */
  async logEvent(event: Omit<LogEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: LogEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Log locally
    log[event.level](event.message, event.category, event.metadata);

    // Add to batch queue
    this.addToBatch(fullEvent);

    // Send to PostHog if enabled
    if (this.postHogConfig.enabled && this.postHogConfig.apiKey) {
      this.sendToPostHog(fullEvent);
    }
  }

  /**
   * Log performance metrics
   */
  async logPerformance(metric: {
    name: string;
    value: number;
    unit: 'ms' | 'bytes' | 'count';
    tags?: Record<string, string>;
  }): Promise<void> {
    const event: LogEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      level: 'info',
      service: 'performance',
      category: 'metrics',
      message: `${metric.name}: ${metric.value}${metric.unit}`,
      metadata: {
        metric: metric.name,
        value: metric.value,
        unit: metric.unit,
        ...metric.tags,
      },
    };

    this.addToBatch(event);

    if (this.postHogConfig.enabled && this.postHogConfig.apiKey) {
      this.sendToPostHog(event);
    }
  }

  /**
   * Send event to PostHog
   */
  private async sendToPostHog(event: LogEvent | TRPCLogEvent): Promise<void> {
    if (!this.postHogClient) return;

    try {
      const postHogEvent = this.transformToPostHogEvent(event);
      
      // Send to PostHog using the SDK
      this.postHogClient.capture({
        distinctId: event.userId || 'anonymous',
        event: postHogEvent.event,
        properties: {
          ...postHogEvent.properties,
          $lib: 'hospital-alert-system',
          $lib_version: '1.0.0',
        },
        timestamp: event.timestamp,
      });

      // Also log custom events for better analytics
      if ('procedure' in event) {
        // Track TRPC performance
        this.postHogClient.capture({
          distinctId: event.userId || 'anonymous',
          event: 'api_performance',
          properties: {
            procedure: event.procedure,
            duration: event.duration,
            success: event.success,
            $performance_rating: event.duration ? (event.duration < 100 ? 'fast' : event.duration < 500 ? 'normal' : 'slow') : 'unknown',
          },
        });
      }

      log.debug('PostHog event sent', 'LOGGING', { event: postHogEvent.event });
    } catch (error) {
      log.error('Failed to send to PostHog', 'LOGGING', error);
    }
  }

  /**
   * Transform log event to PostHog format
   */
  private transformToPostHogEvent(event: LogEvent | TRPCLogEvent): {
    event: string;
    properties: Record<string, any>;
  } {
    const baseProperties = {
      service: event.service,
      category: event.category,
      level: event.level,
      message: event.message,
      organizationId: event.organizationId,
      hospitalId: event.hospitalId,
      traceId: event.traceId,
      spanId: event.spanId,
      ...event.metadata,
    };

    if ('procedure' in event) {
      // TRPC event
      return {
        event: `trpc_${event.procedure}`,
        properties: {
          ...baseProperties,
          procedure: event.procedure,
          success: event.success,
          duration: event.duration,
          error: event.error?.message,
          errorCode: event.error?.code,
        },
      };
    }

    // General event
    return {
      event: `${event.service}_${event.category}`,
      properties: baseProperties,
    };
  }

  /**
   * Add event to batch queue
   */
  private addToBatch(event: LogEvent): void {
    this.batchQueue.push(event);

    if (this.batchQueue.length >= this.batchSize) {
      this.flushBatch();
    }
  }

  /**
   * Flush batch queue
   */
  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const events = [...this.batchQueue];
    this.batchQueue = [];

    try {
      // TODO: Implement batch sending to storage or analytics service
      log.debug(`Flushing ${events.length} events`, 'LOGGING');
      
      // For now, we can store in a local file or database
      // In production, this would send to PostHog or another analytics service
    } catch (error) {
      log.error('Failed to flush batch', 'LOGGING', error);
      // Re-add events to queue on failure
      this.batchQueue.unshift(...events);
    }
  }

  /**
   * Start batch interval
   */
  private startBatchInterval(): void {
    this.batchInterval = setInterval(() => {
      this.flushBatch();
    }, this.flushIntervalMs);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Close the service
   */
  async close(): Promise<void> {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
    await this.flushBatch();
    
    // Shutdown PostHog client
    if (this.postHogClient) {
      await this.postHogClient.shutdown();
    }
    
    log.info('Logging service closed', 'LOGGING');
  }
}

// Export factory function
export function createLoggingService(config?: Partial<PostHogConfig>): LoggingService {
  return new LoggingService(config);
}