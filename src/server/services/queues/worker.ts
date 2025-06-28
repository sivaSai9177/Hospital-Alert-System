/**
 * Queue Worker
 * Processes background jobs for the healthcare alert system
 */

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { log } from '@/lib/core/debug/server-logger';
import { sendAlertNotificationEmail } from '../email';
import { sendPushNotification } from '../push-notifications';
import { db } from '@/src/db';
import { alerts, healthcareAuditLogs } from '@/src/db/healthcare-schema';
import { eq } from 'drizzle-orm';

// Redis connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl);

// Worker configuration
const workerOptions = {
  connection: redis,
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

// Define job types
interface AlertNotificationJob {
  alertId: string;
  type: 'email' | 'push' | 'sms';
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
}

interface AlertEscalationJob {
  alertId: string;
  fromTier: number;
  toTier: number;
  reason: string;
}

interface AuditLogJob {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
}

// Alert Notification Worker
const alertNotificationWorker = new Worker<AlertNotificationJob>(
  'alert-notifications',
  async (job: Job<AlertNotificationJob>) => {
    const { alertId, type, recipientId, recipientEmail, recipientPhone } = job.data;
    
    log.info(`Processing ${type} notification for alert ${alertId}`, 'WORKER', {
      recipientId,
      jobId: job.id,
    });
    
    try {
      // Fetch alert details
      const [alert] = await db
        .select()
        .from(alerts)
        .where(eq(alerts.id, alertId))
        .limit(1);
      
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }
      
      // Process based on notification type
      switch (type) {
        case 'email':
          if (recipientEmail) {
            await sendAlertNotificationEmail({
              to: recipientEmail,
              alertType: alert.alertType,
              roomNumber: alert.roomNumber,
              urgencyLevel: alert.urgencyLevel,
              description: alert.description || '',
              createdAt: alert.createdAt,
            });
          }
          break;
          
        case 'push':
          await sendPushNotification(recipientId, {
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
          // SMS implementation would go here
          log.warn('SMS notifications not yet implemented', 'WORKER');
          break;
      }
      
      log.info(`${type} notification sent successfully`, 'WORKER', {
        alertId,
        recipientId,
      });
      
    } catch (error) {
      log.error(`Failed to send ${type} notification`, 'WORKER', {
        error,
        alertId,
        recipientId,
      });
      throw error;
    }
  },
  workerOptions
);

// Alert Escalation Worker
const alertEscalationWorker = new Worker<AlertEscalationJob>(
  'alert-escalations',
  async (job: Job<AlertEscalationJob>) => {
    const { alertId, fromTier, toTier, reason } = job.data;
    
    log.info(`Processing alert escalation`, 'WORKER', {
      alertId,
      fromTier,
      toTier,
      jobId: job.id,
    });
    
    try {
      // Update alert escalation level
      await db
        .update(alerts)
        .set({
          currentEscalationTier: toTier,
          escalationLevel: toTier,
        })
        .where(eq(alerts.id, alertId));
      
      // TODO: Notify relevant staff based on escalation tier
      // This would involve looking up staff roles and sending notifications
      
      log.info('Alert escalated successfully', 'WORKER', {
        alertId,
        newTier: toTier,
      });
      
    } catch (error) {
      log.error('Failed to escalate alert', 'WORKER', {
        error,
        alertId,
      });
      throw error;
    }
  },
  workerOptions
);

// Audit Log Worker
const auditLogWorker = new Worker<AuditLogJob>(
  'audit-logs',
  async (job: Job<AuditLogJob>) => {
    const { userId, action, entityType, entityId, metadata } = job.data;
    
    try {
      await db.insert(healthcareAuditLogs).values({
        userId,
        action: action as any,
        entityType: entityType as any,
        entityId,
        metadata,
        timestamp: new Date(),
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        hospitalId: metadata?.hospitalId,
      });
      
      log.debug('Audit log created', 'WORKER', {
        action,
        entityType,
        entityId,
      });
      
    } catch (error) {
      log.error('Failed to create audit log', 'WORKER', {
        error,
        action,
        entityType,
      });
      // Don't throw - audit logging failures shouldn't break the system
    }
  },
  workerOptions
);

// Graceful shutdown
const shutdown = async () => {
  log.info('Shutting down queue workers...', 'WORKER');
  
  await Promise.all([
    alertNotificationWorker.close(),
    alertEscalationWorker.close(),
    auditLogWorker.close(),
  ]);
  
  await redis.quit();
  log.info('Queue workers shut down successfully', 'WORKER');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Worker health check
const checkHealth = async () => {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
};

// Log worker startup
log.info('Queue workers started', 'WORKER', {
  concurrency: workerOptions.concurrency,
  queues: ['alert-notifications', 'alert-escalations', 'audit-logs'],
});

// Export for testing
export { checkHealth };