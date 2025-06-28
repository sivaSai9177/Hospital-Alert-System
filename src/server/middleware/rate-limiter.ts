import { TRPCError } from '@trpc/server';
import { log } from '@/lib/core/debug/server-logger';
import type { Context } from '@/src/server/trpc';

// In-memory storage for rate limiting (use Redis in production)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (entry.resetAt < now) {
        this.limits.delete(key);
      }
    }
  }

  check(
    key: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || entry.resetAt < now) {
      // Create new entry
      this.limits.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetAt: now + windowMs
      };
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt
      };
    }

    // Increment count
    entry.count++;
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetAt: entry.resetAt
    };
  }

  reset(key: string) {
    this.limits.delete(key);
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.limits.clear();
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Rate limit configurations
export const RATE_LIMITS = {
  // Critical healthcare operations
  createAlert: {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    skipRoles: ['admin'] // Admin users bypass this limit
  },
  acknowledgeAlert: {
    maxRequests: 30,
    windowMs: 60000, // 1 minute
    skipRoles: ['admin', 'head_doctor']
  },
  
  // Authentication operations
  login: {
    maxRequests: 5,
    windowMs: 300000, // 5 minutes
    keyType: 'ip' // Rate limit by IP instead of user
  },
  register: {
    maxRequests: 3,
    windowMs: 3600000, // 1 hour
    keyType: 'ip'
  },
  
  // General API calls
  default: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    skipRoles: ['admin']
  },
  
  // Heavy operations
  getMetrics: {
    maxRequests: 10,
    windowMs: 60000 // 1 minute
  },
  exportData: {
    maxRequests: 5,
    windowMs: 300000 // 5 minutes
  }
} as const;

// Rate limit middleware factory
export function createRateLimitMiddleware(
  operation: keyof typeof RATE_LIMITS | 'default' = 'default'
) {
  const config = RATE_LIMITS[operation] || RATE_LIMITS.default;

  return async ({ ctx, next }: { ctx: Context; next: () => Promise<any> }) => {
    // Skip rate limiting in development/test environments
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return next();
    }

    // Determine the rate limit key
    let key: string;
    if ('keyType' in config && config.keyType === 'ip') {
      // Use IP address for unauthenticated endpoints
      const ip = ctx.req?.headers.get('x-forwarded-for') || 
                 ctx.req?.headers.get('x-real-ip') || 
                 'unknown';
      key = `ip:${ip}:${operation}`;
    } else if (ctx.session?.user) {
      // Use user ID for authenticated endpoints
      key = `user:${ctx.session.user.id}:${operation}`;
      
      // Check if user's role is exempted
      if ('skipRoles' in config && config.skipRoles?.includes(ctx.session.user.role as any)) {
        return next();
      }
    } else {
      // No user and not IP-based, skip rate limiting
      return next();
    }

    // Check rate limit
    const result = rateLimiter.check(key, config.maxRequests, config.windowMs);

    // Add rate limit headers to response
    if (ctx.res) {
      ctx.res.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      ctx.res.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      ctx.res.headers.set('X-RateLimit-Reset', new Date(result.resetAt).toISOString());
    }

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      
      log.warn('Rate limit exceeded', 'RATE_LIMIT', {
        key,
        operation,
        resetAt: new Date(result.resetAt).toISOString(),
        userId: ctx.session?.user?.id,
        ip: key.startsWith('ip:') ? key.split(':')[1] : undefined
      });

      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        cause: {
          retryAfter,
          resetAt: result.resetAt
        }
      });
    }

    // Log high usage
    if (result.remaining < config.maxRequests * 0.2) {
      log.info('High rate limit usage', 'RATE_LIMIT', {
        key,
        operation,
        remaining: result.remaining,
        limit: config.maxRequests
      });
    }

    return next();
  };
}

// Healthcare-specific rate limiters
export const healthcareRateLimiters = {
  // Strict limit for alert creation to prevent spam
  createAlert: createRateLimitMiddleware('createAlert'),
  
  // More lenient limit for acknowledgments
  acknowledgeAlert: createRateLimitMiddleware('acknowledgeAlert'),
  
  // Limit metric queries to prevent performance issues
  getMetrics: createRateLimitMiddleware('getMetrics'),
  
  // Default rate limiter for general use
  default: createRateLimitMiddleware('default')
};

// Utility to reset rate limit for a user (for testing or admin use)
export function resetUserRateLimit(userId: string, operation?: string) {
  if (operation) {
    rateLimiter.reset(`user:${userId}:${operation}`);
  } else {
    // Reset all operations for user
    for (const op of Object.keys(RATE_LIMITS)) {
      rateLimiter.reset(`user:${userId}:${op}`);
    }
  }
}

// Utility to reset IP rate limit
export function resetIpRateLimit(ip: string, operation?: string) {
  if (operation) {
    rateLimiter.reset(`ip:${ip}:${operation}`);
  } else {
    // Reset all operations for IP
    for (const op of Object.keys(RATE_LIMITS)) {
      rateLimiter.reset(`ip:${ip}:${op}`);
    }
  }
}

// Export rate limiter instance for testing
export { rateLimiter };