/**
 * tRPC Logger Middleware for Figma Plugin
 * Provides request/response logging with performance tracking
 */

import { logger } from './server-logger';
import { TRPCError } from '@trpc/server';

interface LoggerOptions {
  /**
   * Log requests
   */
  logRequests?: boolean;
  /**
   * Log responses
   */
  logResponses?: boolean;
  /**
   * Log errors
   */
  logErrors?: boolean;
  /**
   * Log performance metrics
   */
  logPerformance?: boolean;
  /**
   * Paths to exclude from logging
   */
  excludePaths?: string[];
  /**
   * Maximum depth for logging nested objects
   */
  maxDepth?: number;
}

const DEFAULT_OPTIONS: LoggerOptions = {
  logRequests: true,
  logResponses: true,
  logErrors: true,
  logPerformance: true,
  excludePaths: [],
  maxDepth: 3,
};

/**
 * Create tRPC logger middleware
 */
export function createTRPCLogger(options: LoggerOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async function loggerMiddleware({
    path,
    type,
    next,
    ctx,
    rawInput,
  }: any) {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Check if path should be logged
    if (opts.excludePaths?.includes(path)) {
      return next();
    }

    // Log request
    if (opts.logRequests) {
      logger.trpc.request(path, type, sanitizeInput(rawInput, opts.maxDepth), requestId);
    }

    try {
      // Execute the actual procedure
      const result = await next();

      // Calculate duration
      const duration = Date.now() - startTime;

      // Log successful response
      if (opts.logResponses) {
        logger.trpc.success(path, type, duration, requestId);
      }

      // Log performance warning if slow
      if (opts.logPerformance && duration > 1000) {
        logger.trpc.warn(`Slow procedure: ${path} took ${duration}ms`, {
          path,
          type,
          duration,
          requestId,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error
      if (opts.logErrors) {
        const errorInfo = {
          path,
          type,
          duration,
          requestId,
          error: error instanceof TRPCError ? {
            code: error.code,
            message: error.message,
            cause: error.cause,
          } : error,
        };

        logger.trpc.error(`Procedure failed: ${path}`, errorInfo);
      }

      // Re-throw the error
      throw error;
    }
  };
}

/**
 * Sanitize input for logging (remove sensitive data)
 */
function sanitizeInput(input: any, maxDepth: number = 3, currentDepth: number = 0): any {
  if (currentDepth >= maxDepth) {
    return '[Max depth reached]';
  }

  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input !== 'object') {
    // Sanitize strings that might contain sensitive data
    if (typeof input === 'string') {
      // Check for common sensitive patterns
      if (input.match(/^(password|token|secret|key|auth|bearer)/i)) {
        return '[REDACTED]';
      }
    }
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item, maxDepth, currentDepth + 1));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(input)) {
    // Skip sensitive fields
    if (key.match(/(password|token|secret|key|auth|bearer|cookie|session)/i)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeInput(value, maxDepth, currentDepth + 1);
    }
  }

  return sanitized;
}

/**
 * Log tRPC context creation
 */
export function logContextCreation(ctx: any) {
  logger.trpc.debug('Creating tRPC context', {
    hasSession: !!ctx.session,
    userId: ctx.session?.user?.id,
    headers: sanitizeInput(ctx.headers, 2),
  });
}

/**
 * Log tRPC error
 */
export function logTRPCError(error: TRPCError, path?: string) {
  logger.trpc.error(`tRPC Error${path ? ` in ${path}` : ''}`, {
    code: error.code,
    message: error.message,
    cause: error.cause,
    path,
  });
}

/**
 * Create performance logger for specific procedures
 */
export function createPerfLogger(procedureName: string) {
  const timers = new Map<string, number>();

  return {
    start: (operation: string) => {
      const key = `${procedureName}.${operation}`;
      timers.set(key, Date.now());
      logger.trpc.debug(`Performance: ${key} started`);
    },
    
    end: (operation: string, metadata?: any) => {
      const key = `${procedureName}.${operation}`;
      const startTime = timers.get(key);
      
      if (!startTime) {
        logger.trpc.warn(`Performance: No start time found for ${key}`);
        return;
      }
      
      const duration = Date.now() - startTime;
      timers.delete(key);
      
      logger.trpc.debug(`Performance: ${key} completed in ${duration}ms`, {
        duration,
        ...metadata,
      });
      
      if (duration > 500) {
        logger.trpc.warn(`Performance: ${key} is slow (${duration}ms)`, {
          duration,
          ...metadata,
        });
      }
    },
  };
}