/**
 * Hybrid Queue System
 * Combines PostgreSQL (reliability) with Redis (speed) for optimal performance
 * 
 * Architecture:
 * - Redis: Real-time notifications, cache, pub/sub for instant alerts
 * - PostgreSQL: Job persistence, retries, scheduling, audit trail
 */

import PgBoss from 'pg-boss';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import { log } from '@/lib/core/debug/server-logger';
import { emailService } from '../email';
import { pushService } from '../push-notifications';
import { db } from '@/src/db';
import { alerts } from '@/src/db/healthcare-schema';
import { eq } from 'drizzle-orm';

// Job types
interface AlertNotificationJob {
  alertId: string;
  type: 'email' | 'push' | 'sms';
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  urgent?: boolean;
}

interface QueueOptions {
  priority?: number;
  delay?: number;
  retryLimit?: number;
  urgent?: boolean;
}

export class HybridQueueSystem extends EventEmitter {
  private pgBoss!: PgBoss;
  private redis: Redis;
  private redisPub: Redis;
  private redisSub: Redis;
  private initialized = false;

  constructor() {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.redisPub = this.redis.duplicate();
    this.redisSub = this.redis.duplicate();
  }

  async initialize() {
    if (this.initialized) return;

    // Initialize PgBoss for reliable job processing
    this.pgBoss = new PgBoss({
      connectionString: process.env.DATABASE_URL,
      schema: 'pgboss',
      monitorStateIntervalSeconds: 30,
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      expireInHours: 24,
    });

    await this.pgBoss.start();

    // Set up Redis pub/sub for real-time notifications
    await this.setupRedisPubSub();

    // Register job handlers
    await this.registerHandlers();

    this.initialized = true;
    log.info('Hybrid queue system initialized', 'QUEUE');
  }

  private async setupRedisPubSub() {
    // Subscribe to urgent notification channel
    await this.redisSub.subscribe('urgent:notifications');
    
    this.redisSub.on('message', async (channel, message) => {
      if (channel === 'urgent:notifications') {
        try {
          const job = JSON.parse(message);
          await this.processUrgentJob(job);
        } catch (error) {
          log.error('Failed to process urgent notification', 'QUEUE', { error });
        }
      }
    });
  }

  private async registerHandlers() {
    // Standard notification handler (via PgBoss)
    await this.pgBoss.work<AlertNotificationJob>(
      'notification',
      { batchSize: 5 },
      async (jobs) => {
        // Process jobs in batch
        for (const job of jobs) {
          await this.processNotification(job.data);
        }
      }
    );

    // Scheduled job for processing Redis queue overflow
    await this.pgBoss.schedule(
      'process-redis-overflow',
      '*/30 * * * * *', // Every 30 seconds
      {}
    );

    await this.pgBoss.work('process-redis-overflow', async () => {
      await this.processRedisOverflow();
    });
  }

  /**
   * Send a notification - uses hybrid approach
   */
  async sendNotification(data: AlertNotificationJob, options: QueueOptions = {}) {
    const jobId = `notify:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;

    // For urgent notifications, use Redis for immediate processing
    if (options.urgent || data.urgent) {
      // Cache job data in Redis with TTL
      await this.redis.setex(
        `job:${jobId}`,
        3600, // 1 hour TTL
        JSON.stringify({ ...data, jobId, timestamp: Date.now() })
      );

      // Publish to urgent channel for immediate processing
      await this.redisPub.publish('urgent:notifications', JSON.stringify({
        jobId,
        data,
      }));

      // Also queue in PgBoss as backup (with delay)
      await this.pgBoss.send('notification', data, {
        ...options,
        startAfter: new Date(Date.now() + 60000), // Process after 1 minute if not handled by Redis
        singletonKey: jobId, // Prevent duplicate processing
      });

      log.info('Urgent notification queued', 'QUEUE', { jobId, alertId: data.alertId });
    } else {
      // For non-urgent, use PgBoss directly
      const pgJobId = await this.pgBoss.send('notification', data, options);
      log.info('Standard notification queued', 'QUEUE', { pgJobId, alertId: data.alertId });
    }

    return jobId;
  }

  /**
   * Process urgent job immediately via Redis
   */
  private async processUrgentJob(job: { jobId: string; data: AlertNotificationJob }) {
    const startTime = Date.now();
    
    try {
      // Check if already processed (using Redis as distributed lock)
      const lockKey = `lock:${job.jobId}`;
      const locked = await this.redis.set(lockKey, '1', 'PX', 30000, 'NX'); // 30s lock
      
      if (!locked) {
        log.debug('Job already being processed', 'QUEUE', { jobId: job.jobId });
        return;
      }

      // Process the notification
      await this.processNotification(job.data);

      // Mark as completed in Redis
      await this.redis.setex(`completed:${job.jobId}`, 3600, '1');

      // Cancel the backup PgBoss job by singleton key
      await this.pgBoss.cancel('notification', job.jobId);

      const duration = Date.now() - startTime;
      log.info('Urgent notification processed', 'QUEUE', {
        jobId: job.jobId,
        duration,
        via: 'redis',
      });

      // Store metrics
      await this.storeMetrics('redis', duration, true);

    } catch (error) {
      log.error('Failed to process urgent job', 'QUEUE', {
        error,
        jobId: job.jobId,
      });
      
      // Let PgBoss handle it as fallback
      await this.redis.del(`lock:${job.jobId}`);
      
      // Store failure metric
      await this.storeMetrics('redis', Date.now() - startTime, false);
      
      throw error;
    }
  }

  /**
   * Core notification processing logic
   */
  private async processNotification(data: AlertNotificationJob) {
    const { alertId, type, recipientId, recipientEmail } = data;

    // Fetch alert details (with Redis caching)
    const alert = await this.getAlertWithCache(alertId);
    
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    // Process based on notification type
    switch (type) {
      case 'email':
        if (recipientEmail) {
          await emailService.send({
            to: recipientEmail,
            subject: `🚨 Alert: ${alert.alertType}`,
            template: 'alert-notification',
            data: {
              alertType: alert.alertType,
              roomNumber: alert.roomNumber,
              urgencyLevel: alert.urgencyLevel,
              description: alert.description || '',
              createdAt: alert.createdAt,
            },
          });
        }
        break;
        
      case 'push':
        await pushService.sendToUser(recipientId, {
          title: `Alert: ${alert.alertType}`,
          body: `Room ${alert.roomNumber} - Urgency: ${alert.urgencyLevel}/5`,
          data: {
            alertId,
            type: 'alert',
            urgency: alert.urgencyLevel.toString(),
          },
        });
        break;
        
      case 'sms':
        log.warn('SMS not implemented', 'QUEUE');
        break;
    }
  }

  /**
   * Get alert with Redis caching
   */
  private async getAlertWithCache(alertId: string) {
    const cacheKey = `alert:${alertId}`;
    
    // Check Redis cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const [alert] = await db
      .select()
      .from(alerts)
      .where(eq(alerts.id, alertId))
      .limit(1);

    if (alert) {
      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(alert));
    }

    return alert;
  }

  /**
   * Process any jobs that might have been missed in Redis
   */
  private async processRedisOverflow() {
    // Check for stuck jobs in Redis
    const keys = await this.redis.keys('job:*');
    
    for (const key of keys) {
      const job = await this.redis.get(key);
      if (!job) continue;
      
      const jobData = JSON.parse(job);
      const age = Date.now() - jobData.timestamp;
      
      // If job is older than 2 minutes and not completed, process it
      if (age > 120000) {
        const completedKey = `completed:${jobData.jobId}`;
        const isCompleted = await this.redis.exists(completedKey);
        
        if (!isCompleted) {
          log.warn('Found stuck job in Redis', 'QUEUE', {
            jobId: jobData.jobId,
            age: Math.round(age / 1000) + 's',
          });
          
          // Queue for processing via PgBoss
          await this.pgBoss.send('notification', jobData, {
            priority: 100, // High priority
          });
          
          // Clean up Redis
          await this.redis.del(key);
        }
      }
    }
  }

  /**
   * Store performance metrics
   */
  private async storeMetrics(system: 'redis' | 'pgboss', duration: number, success: boolean) {
    const key = `metrics:${system}:${new Date().toISOString().split('T')[0]}`;
    
    await this.redis.hincrby(key, 'total', 1);
    await this.redis.hincrby(key, success ? 'success' : 'failed', 1);
    await this.redis.hincrby(key, 'totalDuration', duration);
    await this.redis.expire(key, 86400 * 7); // 7 days
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [redisKeys, pgQueues] = await Promise.all([
      this.redis.keys('job:*'),
      this.pgBoss.getQueueSize('notification'),
    ]);

    // Get today's metrics
    const today = new Date().toISOString().split('T')[0];
    const redisMetrics = await this.redis.hgetall(`metrics:redis:${today}`);
    const pgMetrics = await this.redis.hgetall(`metrics:pgboss:${today}`);

    return {
      redis: {
        pending: redisKeys.length,
        metrics: {
          total: parseInt(redisMetrics.total || '0'),
          success: parseInt(redisMetrics.success || '0'),
          failed: parseInt(redisMetrics.failed || '0'),
          avgDuration: redisMetrics.totalDuration 
            ? Math.round(parseInt(redisMetrics.totalDuration) / parseInt(redisMetrics.total || '1'))
            : 0,
        },
      },
      pgboss: {
        queued: pgQueues,
        failed: 0, // We'll track this separately
        metrics: {
          total: parseInt(pgMetrics.total || '0'),
          success: parseInt(pgMetrics.success || '0'),
          failed: parseInt(pgMetrics.failed || '0'),
          avgDuration: pgMetrics.totalDuration
            ? Math.round(parseInt(pgMetrics.totalDuration) / parseInt(pgMetrics.total || '1'))
            : 0,
        },
      },
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    log.info('Shutting down hybrid queue system...', 'QUEUE');
    
    await Promise.all([
      this.pgBoss.stop(),
      this.redisSub.unsubscribe(),
      this.redis.quit(),
      this.redisPub.quit(),
      this.redisSub.quit(),
    ]);
    
    log.info('Hybrid queue system shut down', 'QUEUE');
  }
}

// Export singleton instance
export const hybridQueue = new HybridQueueSystem();

// Convenience methods
export const queues = {
  /**
   * Send notification with smart routing
   */
  async sendAlert(data: AlertNotificationJob) {
    // Urgent alerts (level 4-5) go through Redis fast path
    const alert = await hybridQueue['getAlertWithCache'](data.alertId);
    const isUrgent = alert && alert.urgencyLevel >= 4;
    
    return hybridQueue.sendNotification(data, {
      urgent: isUrgent,
      priority: isUrgent ? 100 : 10,
      retryLimit: data.type === 'email' ? 5 : 3,
    });
  },

  /**
   * Get system stats
   */
  getStats: () => hybridQueue.getStats(),
};