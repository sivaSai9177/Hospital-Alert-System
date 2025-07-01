/**
 * Unified Logger System
 * Centralizes all logging and integrates with DebugPanel
 */

import type { LogLevel } from '@/components/blocks/debug/utils/logger';
import { loggingConfig } from './logging-config';

// Conditionally import debug panel only on client side
let debugPanel: any = null;
if (typeof window !== 'undefined') {
  import('@/components/blocks/debug/utils/logger').then(module => {
    debugPanel = module.debugLog;
  });
}

// Platform detection without importing React Native
const getPlatform = () => {
  if (typeof window !== 'undefined') {
    return 'web';
  } else if (typeof global !== 'undefined' && global.__fbBatchedBridge) {
    return 'mobile';
  } else {
    return 'server';
  }
};

export type LogCategory = 'AUTH' | 'API' | 'TRPC' | 'STORE' | 'ROUTER' | 'SYSTEM' | 'ERROR' | 'HEALTHCARE' | 'STORAGE' | 'ANALYTICS' | 'API_ERROR_BOUNDARY' | 'TEST' | 'WS_QUEUE' | 'WS_CONNECTION' | 'WS_CLEANUP' | 'ALERT_WS' | 'ALERTS' | 'SSR' | 'SSR_PREFETCH' | 'SSR_HOC' | 'NAVIGATION' | 'ESCALATION_QUEUE';

interface UnifiedLogEntry {
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  source?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  duration?: number;
}

class UnifiedLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isDebugMode = process.env.EXPO_PUBLIC_DEBUG_MODE === 'true';
  private enabledCategories: Set<LogCategory> = new Set(['AUTH', 'API', 'TRPC', 'ERROR', 'HEALTHCARE', 'ROUTER', 'SYSTEM']);
  private posthogClient: any = null;
  private posthogEnabled = false;
  private logBuffer: UnifiedLogEntry[] = [];
  private flushTimer: any = null;

  constructor() {
    // Load enabled categories from debug store if available
    if (typeof window !== 'undefined') {
      import('@/lib/stores/debug-store').then(({ useDebugStore }) => {
        const store = useDebugStore.getState();
        if (store.enableAuthLogging) this.enabledCategories.add('AUTH');
        if (store.enableTRPCLogging) this.enabledCategories.add('TRPC');
        if (store.enableRouterLogging) this.enabledCategories.add('ROUTER');
        if (store.enableHealthcareLogging) this.enabledCategories.add('HEALTHCARE');
      }).catch(() => {
        // Ignore errors if debug store is not available
      });
    }

    // Initialize PostHog integration
    this.initializePostHog();
    
    // Start batch timer for logging service
    const config = loggingConfig.getConfig();
    if (config.enabled && config.serviceUrl) {
      this.startBatchTimer();
    }
  }
  
  private startBatchTimer(): void {
    const config = loggingConfig.getConfig();
    if (!config.enabled || !config.serviceUrl) {
      return; // Don't start timer if logging is disabled
    }
    this.flushTimer = setInterval(() => {
      this.flushLogs();
    }, config.flushInterval || 5000);
  }
  
  private bufferLog(entry: UnifiedLogEntry): void {
    this.logBuffer.push(entry);
    const config = loggingConfig.getConfig();
    
    // Flush if we've reached batch size
    if (this.logBuffer.length >= (config.batchSize || 50)) {
      this.flushLogs();
    }
  }
  
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;
    
    const logs = [...this.logBuffer];
    this.logBuffer = [];
    const config = loggingConfig.getConfig();
    
    // Skip if logging service is disabled
    if (!config.enabled || !config.serviceUrl) {
      return;
    }
    
    try {
      // Use the original fetch to avoid interception
      const originalFetch = (global as any).__originalFetch || global.fetch;
      const response = await originalFetch(`${config.serviceUrl}/log/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Source': 'unified-logger',
        },
        body: JSON.stringify({ 
          events: logs.map(log => ({
            ...log,
            timestamp: log.timestamp.toISOString(),
            environment: process.env.NODE_ENV || 'development',
          }))
        }),
      });
      
      if (!response.ok) {
        // Re-add logs to buffer on failure
        this.logBuffer.unshift(...logs);
        if (this.isDevelopment) {
          console.error(`[UnifiedLogger] Failed to send logs: ${response.status}`);
        }
      }
    } catch (error) {
      // Re-add logs to buffer on error
      this.logBuffer.unshift(...logs);
      if (this.isDevelopment) {
        console.error('[UnifiedLogger] Error sending logs:', error);
      }
    }
  }

  private async initializePostHog() {
    // Skip PostHog initialization on server
    if (getPlatform() === 'server') return;
    
    try {
      // Check if PostHog is enabled
      const posthogEnabled = process.env.EXPO_PUBLIC_POSTHOG_ENABLED === 'true' || 
                            process.env.POSTHOG_ENABLED === 'true';
      
      if (!posthogEnabled) return;

      // PostHog will be initialized by PostHogProvider on client
      this.posthogEnabled = posthogEnabled;
    } catch (error) {
      console.warn('[UnifiedLogger] Failed to initialize PostHog:', error);
    }
  }

  private shouldLog(category: LogCategory, level: LogLevel): boolean {
    // Always log errors
    if (level === 'error') return true;
    
    // Check if category is enabled
    if (!this.enabledCategories.has(category)) return false;
    
    // In production, only log warnings and errors
    if (!this.isDevelopment && level === 'debug') return false;
    
    return true;
  }

  private formatMessage(entry: UnifiedLogEntry): string {
    const { category, message, userId, sessionId, requestId, duration } = entry;
    let formatted = `[${category}] ${message}`;
    
    if (userId) formatted += ` (User: ${userId})`;
    if (sessionId) formatted += ` (Session: ${sessionId})`;
    if (requestId) formatted += ` (Req: ${requestId})`;
    if (duration !== undefined) formatted += ` (${duration}ms)`;
    
    return formatted;
  }

  private log(entry: Omit<UnifiedLogEntry, 'timestamp'>): void {
    const fullEntry: UnifiedLogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    // Check if we should log
    if (!this.shouldLog(entry.category, entry.level)) return;

    // Send to DebugPanel
    const formattedMessage = this.formatMessage(fullEntry);

    // Use appropriate DebugPanel method (only if available)
    if (debugPanel) {
      switch (entry.level) {
        case 'error':
          debugPanel.error(formattedMessage, entry.data);
          break;
        case 'warn':
          debugPanel.warn(formattedMessage, entry.data);
          break;
        case 'info':
          debugPanel.info(formattedMessage, entry.data);
          break;
        case 'debug':
          debugPanel.debug(formattedMessage, entry.data);
          break;
      }
    }
    
    // Also log to console in development
    if (this.isDevelopment) {
      const consoleData = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
      switch (entry.level) {
        case 'error':
          console.error(formattedMessage + consoleData);
          break;
        case 'warn':
          console.warn(formattedMessage + consoleData);
          break;
        case 'info':
          console.log(formattedMessage + consoleData);
          break;
        case 'debug':
          console.log(formattedMessage + consoleData);
          break;
      }
    }

    // Buffer log for sending to logging service
    const config = loggingConfig.getConfig();
    if (config.enabled && config.serviceUrl) {
      this.bufferLog(fullEntry);
    }

    // Send to PostHog if enabled (skip on server)
    if (this.posthogEnabled && this.posthogClient && getPlatform() !== 'server') {
      try {
        // Send as custom event to PostHog
        const eventName = `log_${entry.category.toLowerCase()}_${entry.level}`;
        const eventProperties = {
          category: entry.category,
          level: entry.level,
          message: entry.message,
          timestamp: fullEntry.timestamp.toISOString(),
          userId: entry.userId,
          sessionId: entry.sessionId,
          requestId: entry.requestId,
          duration: entry.duration,
          source: entry.source,
          ...(entry.data && { data: JSON.stringify(entry.data) }),
        };

        // Remove undefined values
        Object.keys(eventProperties).forEach(key => {
          if (eventProperties[key as keyof typeof eventProperties] === undefined) {
            delete eventProperties[key as keyof typeof eventProperties];
          }
        });

        // Send to PostHog
        this.posthogClient.capture(eventName, eventProperties);

        // For errors, also send as error event
        if (entry.level === 'error') {
          this.posthogClient.capture('$exception', {
            ...eventProperties,
            $exception_message: entry.message,
            $exception_type: entry.category,
          });
        }
      } catch (error) {
        // Silently fail to avoid infinite loops
        if (this.isDevelopment) {
          console.warn('[UnifiedLogger] Failed to send log to PostHog:', error);
        }
      }
    }

    // Send to Docker console in development
    if (this.isDevelopment && process.env.EXPO_PUBLIC_DOCKER_CONSOLE === 'true') {
      // Log as structured JSON for Docker log drivers
      const dockerLog = {
        service: 'expo-app',
        timestamp: fullEntry.timestamp.toISOString(),
        level: entry.level,
        category: entry.category,
        message: formattedMessage,
        metadata: {
          userId: entry.userId,
          sessionId: entry.sessionId,
          requestId: entry.requestId,
          duration: entry.duration,
          data: entry.data,
        },
      };
      console.log(JSON.stringify(dockerLog));

    }
  }

  // Category-specific logging methods
  auth = {
    info: (message: string, data?: any) => this.log({ 
      level: 'info', 
      category: 'AUTH', 
      message, 
      data 
    }),
    error: (message: string, error?: any) => this.log({ 
      level: 'error', 
      category: 'AUTH', 
      message, 
      data: error 
    }),
    warn: (message: string, data?: any) => this.log({ 
      level: 'warn', 
      category: 'AUTH', 
      message, 
      data 
    }),
    debug: (message: string, data?: any) => this.log({ 
      level: 'debug', 
      category: 'AUTH', 
      message, 
      data 
    }),
    // Specific auth events
    login: (userId: string, method: string, data?: any) => this.log({
      level: 'info',
      category: 'AUTH',
      message: `User login via ${method}`,
      data: { ...data, method },
      userId,
    }),
    logout: (userId: string, data?: any) => this.log({
      level: 'info',
      category: 'AUTH',
      message: 'User logout',
      data,
      userId,
    }),
    sessionRefresh: (userId: string, sessionId: string) => this.log({
      level: 'debug',
      category: 'AUTH',
      message: 'Session refreshed',
      userId,
      sessionId,
    }),
  };

  api = {
    request: (method: string, path: string, data?: any) => this.log({
      level: 'debug',
      category: 'API',
      message: `${method} ${path}`,
      data: { method, path, ...data },
    }),
    response: (method: string, path: string, status: number, duration?: number) => this.log({
      level: 'debug',
      category: 'API',
      message: `${method} ${path} → ${status}`,
      data: { method, path, status },
      duration,
    }),
    error: (method: string, path: string, error: any, duration?: number) => this.log({
      level: 'error',
      category: 'API',
      message: `${method} ${path} failed`,
      data: { method, path, error: error?.message || error },
      duration,
    }),
  };

  trpc = {
    request: (procedure: string, type: string, input?: any, requestId?: string) => this.log({
      level: 'debug',
      category: 'TRPC',
      message: `${type.toUpperCase()} ${procedure}`,
      data: { procedure, type, hasInput: !!input },
      requestId,
    }),
    success: (procedure: string, type: string, duration: number, requestId?: string) => this.log({
      level: 'debug',
      category: 'TRPC',
      message: `${type.toUpperCase()} ${procedure} completed`,
      data: { procedure, type },
      duration,
      requestId,
    }),
    error: (procedure: string, type: string, error: any, duration?: number, requestId?: string) => this.log({
      level: 'error',
      category: 'TRPC',
      message: `${type.toUpperCase()} ${procedure} failed`,
      data: { 
        procedure, 
        type, 
        error: error?.message || error,
        code: error?.code,
      },
      duration,
      requestId,
    }),
  };

  store = {
    update: (storeName: string, action: string, data?: any) => this.log({
      level: 'debug',
      category: 'STORE',
      message: `${storeName}.${action}`,
      data,
    }),
    debug: (storeName: string, action: string, data?: any) => this.log({
      level: 'debug',
      category: 'STORE',
      message: `${storeName}.${action}`,
      data,
    }),
    warn: (storeName: string, action: string, data?: any) => this.log({
      level: 'warn',
      category: 'STORE',
      message: `${storeName}.${action}`,
      data,
    }),
    error: (storeName: string, action: string, error: any) => this.log({
      level: 'error',
      category: 'STORE',
      message: `${storeName}.${action} failed`,
      data: { error: error?.message || error },
    }),
  };

  router = {
    navigate: (from: string, to: string, params?: any) => this.log({
      level: 'debug',
      category: 'ROUTER',
      message: `Navigate: ${from} → ${to}`,
      data: { from, to, params },
    }),
    error: (path: string, error: any) => this.log({
      level: 'error',
      category: 'ROUTER',
      message: `Navigation error: ${path}`,
      data: { 
        path, 
        error: error?.message || error,
        errorType: error?.name,
        stack: error?.stack
      },
    }),
    screenNotFound: (screen: string, availableScreens?: string[]) => this.log({
      level: 'error',
      category: 'ROUTER',
      message: `Screen doesn't exist: ${screen}`,
      data: {
        attemptedScreen: screen,
        availableScreens,
        suggestion: 'Use the "Go to Home" button in the debug panel to recover'
      }
    }),
    recovered: (from: string, to: string) => this.log({
      level: 'info',
      category: 'ROUTER',
      message: `Navigation recovered: ${from} → ${to}`,
      data: { from, to }
    }),
  };

  healthcare = {
    info: (message: string, data?: any) => this.log({
      level: 'info',
      category: 'HEALTHCARE',
      message,
      data,
    }),
    error: (message: string, error?: any) => this.log({
      level: 'error',
      category: 'HEALTHCARE',
      message,
      data: error,
    }),
    warn: (message: string, data?: any) => this.log({
      level: 'warn',
      category: 'HEALTHCARE',
      message,
      data,
    }),
    debug: (message: string, data?: any) => this.log({
      level: 'debug',
      category: 'HEALTHCARE',
      message,
      data,
    }),
    alertCreated: (alertData: any) => this.log({
      level: 'info',
      category: 'HEALTHCARE',
      message: `Alert created: ${alertData.alertType} - Room ${alertData.roomNumber}`,
      data: alertData,
    }),
    alertAcknowledged: (alertId: string, userId: string) => this.log({
      level: 'info',
      category: 'HEALTHCARE',
      message: `Alert acknowledged`,
      data: { alertId, userId },
    }),
    alertResolved: (alertId: string, userId: string) => this.log({
      level: 'info',
      category: 'HEALTHCARE',
      message: `Alert resolved`,
      data: { alertId, userId },
    }),
  };

  system = {
    info: (message: string, data?: any) => this.log({
      level: 'info',
      category: 'SYSTEM',
      message,
      data,
    }),
    error: (message: string, error?: any) => this.log({
      level: 'error',
      category: 'SYSTEM',
      message,
      data: error,
    }),
    warn: (message: string, data?: any) => this.log({
      level: 'warn',
      category: 'SYSTEM',
      message,
      data,
    }),
    debug: (message: string, data?: any) => this.log({
      level: 'debug',
      category: 'SYSTEM',
      message,
      data,
    }),
  };

  network = {
    info: (message: string, data?: any) => this.log({
      level: 'info',
      category: 'SYSTEM',
      message: `[Network] ${message}`,
      data,
    }),
    error: (message: string, error?: any) => this.log({
      level: 'error',
      category: 'SYSTEM',
      message: `[Network] ${message}`,
      data: error,
    }),
    warn: (message: string, data?: any) => this.log({
      level: 'warn',
      category: 'SYSTEM',
      message: `[Network] ${message}`,
      data,
    }),
    success: (message: string, data?: any) => this.log({
      level: 'info',
      category: 'SYSTEM',
      message: `[Network] ${message}`,
      data,
    }),
  };

  // Generic logging methods
  info = (message: string, category: LogCategory = 'SYSTEM', data?: any) => 
    this.log({ level: 'info', category, message, data });
  
  error = (message: string, category: LogCategory = 'ERROR', error?: any) => 
    this.log({ level: 'error', category, message, data: error });
  
  warn = (message: string, category: LogCategory = 'SYSTEM', data?: any) => 
    this.log({ level: 'warn', category, message, data });
  
  debug = (message: string, category: LogCategory = 'SYSTEM', data?: any) => 
    this.log({ level: 'debug', category, message, data });

  // Enable/disable categories
  enableCategory(category: LogCategory) {
    this.enabledCategories.add(category);
  }

  disableCategory(category: LogCategory) {
    this.enabledCategories.delete(category);
  }

  setCategories(categories: LogCategory[]) {
    this.enabledCategories = new Set(categories);
  }
}

// Export singleton instance
export const logger = new UnifiedLogger();

// Export for backward compatibility
export const log = {
  info: (message: string, context?: string, data?: any) => 
    logger.info(message, (context as LogCategory) || 'SYSTEM', data),
  error: (message: string, context?: string, error?: any) => 
    logger.error(message, (context as LogCategory) || 'ERROR', error),
  warn: (message: string, context?: string, data?: any) => 
    logger.warn(message, (context as LogCategory) || 'SYSTEM', data),
  debug: (message: string, context?: string, data?: any) => 
    logger.debug(message, (context as LogCategory) || 'SYSTEM', data),
  auth: logger.auth,
  api: logger.api,
  store: logger.store,
};

// Export types
export type { UnifiedLogEntry, UnifiedLogger };