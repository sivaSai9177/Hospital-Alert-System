/**
 * PgBoss Queue Worker
 * Processes background jobs using PostgreSQL for healthcare alerts
 */

import PgBoss from 'pg-boss';
import { log } from '@/lib/core/debug/server-logger';
import { emailService } from '../email';
import { pushService } from '../push-notifications';
import { db } from '@/src/db';
import { alerts, healthcareAuditLogs } from '@/src/db/healthcare-schema';
import { eq } from 'drizzle-orm';

// Job payload types
interface AlertNotificationJob {
  alertId: string;
  type: 'email' | 'push' | 'sms';
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
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

// Initialize PgBoss
let boss: PgBoss;

export async function initializeQueues() {
  // Use your existing database connection
  boss = new PgBoss({
    connectionString: process.env.DATABASE_URL,
    schema: 'pgboss', // Separate schema for job tables
    
    // Job archival settings
    archiveCompletedAfterSeconds: 60 * 60 * 24 * 7, // 7 days
    deleteAfterDays: 30,
    
    // Monitoring
    monitorStateIntervalSeconds: 30,
    
    // Retry configuration
    retryLimit: 3,
    retryDelay: 30, // seconds
    retryBackoff: true,
    
    // Performance tuning for healthcare
    newJobCheckInterval: 1000, // Check for new jobs every second
    expireInHours: 24, // Jobs expire after 24 hours if not processed
  });

  boss.on('error', error => {
    log.error('PgBoss error', 'QUEUE', { error });
  });

  await boss.start();
  
  // Register job handlers
  await registerHandlers();
  
  log.info('PgBoss queue system initialized', 'QUEUE');
}

async function registerHandlers() {
  // Alert notification handler
  await boss.work<AlertNotificationJob>(
    'alert-notification',
    { teamSize: 5, teamConcurrency: 2 }, // Process up to 5 jobs concurrently
    async (job) => {
      const { alertId, type, recipientId, recipientEmail } = job.data;
      
      log.info(`Processing ${type} notification`, 'QUEUE', {
        jobId: job.id,
        alertId,
        recipientId,
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
              await emailService.send({
                to: recipientEmail,
                subject: `🚨 Healthcare Alert: ${alert.alertType}`,
                template: 'alert-notification',
                data: {
                  alertType: alert.alertType,
                  roomNumber: alert.roomNumber,
                  urgencyLevel: alert.urgencyLevel,
                  description: alert.description || '',
                  createdAt: alert.createdAt,
                  alertId: alert.id,
                },
              });
            }
            break;
            
          case 'push':
            await pushService.send({
              userId: recipientId,
              notification: {
                title: `Alert: ${alert.alertType}`,
                body: `Room ${alert.roomNumber} - Urgency: ${alert.urgencyLevel}/5`,
                data: {
                  alertId,
                  type: 'alert',
                  urgency: alert.urgencyLevel.toString(),
                },
              },
            });
            break;
            
          case 'sms':
            // SMS would go here
            log.warn('SMS notifications not implemented', 'QUEUE');
            break;
        }
        
        log.info(`${type} notification sent`, 'QUEUE', {
          alertId,
          recipientId,
        });
        
      } catch (error) {
        log.error(`Failed to send ${type} notification`, 'QUEUE', {
          error,
          alertId,
          recipientId,
        });
        throw error; // PgBoss will retry based on config
      }
    }
  );

  // Alert escalation handler
  await boss.work<AlertEscalationJob>(
    'alert-escalation',
    { teamSize: 3 },
    async (job) => {
      const { alertId, fromTier, toTier, reason } = job.data;
      
      log.info('Processing alert escalation', 'QUEUE', {
        jobId: job.id,
        alertId,
        fromTier,
        toTier,
      });
      
      try {
        // Update alert in transaction
        await db.transaction(async (tx) => {
          await tx
            .update(alerts)
            .set({
              currentEscalationTier: toTier,
              escalationLevel: toTier,
            })
            .where(eq(alerts.id, alertId));
          
          // Queue notifications for new tier
          await queueEscalationNotifications(alertId, toTier);
        });
        
        log.info('Alert escalated successfully', 'QUEUE', {
          alertId,
          newTier: toTier,
        });
        
      } catch (error) {
        log.error('Failed to escalate alert', 'QUEUE', {
          error,
          alertId,
        });
        throw error;
      }
    }
  );

  // Audit log handler - lower priority
  await boss.work<AuditLogJob>(
    'audit-log',
    { 
      teamSize: 2,
      priority: false, // Process after higher priority jobs
    },
    async (job) => {
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
          severity: 'info',
        });
        
        log.debug('Audit log created', 'QUEUE', {
          action,
          entityType,
          entityId,
        });
        
      } catch (error) {
        log.error('Failed to create audit log', 'QUEUE', {
          error,
          action,
          entityType,
        });
        // Don't throw - audit failures shouldn't retry
      }
    }
  );

  // Scheduled job for alert escalation checks
  await boss.schedule(
    'check-escalations',
    '*/1 * * * *', // Every minute
    {},
    { tz: 'UTC' }
  );

  await boss.work('check-escalations', async () => {
    log.debug('Checking for alerts to escalate', 'QUEUE');
    // Check and queue escalation jobs
    await checkAndQueueEscalations();
  });
}

// Helper functions
async function queueEscalationNotifications(alertId: string, tier: number) {
  // Logic to find relevant staff for the tier and queue notifications
  // This would query healthcare_users based on role and tier
}

async function checkAndQueueEscalations() {
  // Find alerts that need escalation based on time and acknowledgment
  // Queue escalation jobs for them
}

// Public API for queuing jobs
export const queues = {
  async sendNotification(data: AlertNotificationJob) {
    return boss.send('alert-notification', data, {
      priority: data.type === 'push' ? 10 : 5, // Push notifications are higher priority
      retryLimit: data.type === 'email' ? 5 : 3, // Retry emails more
    });
  },

  async escalateAlert(data: AlertEscalationJob) {
    return boss.send('alert-escalation', data, {
      priority: 20, // High priority
      singletonKey: `escalate-${data.alertId}`, // Prevent duplicate escalations
    });
  },

  async logAudit(data: AuditLogJob) {
    return boss.send('audit-log', data, {
      priority: 1, // Low priority
      retryLimit: 1, // Don't retry audit logs much
    });
  },

  // Utility methods
  async getQueueStats() {
    return {
      queues: await boss.getQueueSize(),
      failed: await boss.getQueueSize('failed'),
      completed: await boss.getQueueSize('completed'),
    };
  },

  async retryFailed(jobId: string) {
    return boss.retry(jobId);
  },

  async cancelJob(jobId: string) {
    return boss.cancel(jobId);
  }
};

// Graceful shutdown
export async function stopQueues() {
  if (boss) {
    log.info('Stopping PgBoss queues...', 'QUEUE');
    await boss.stop();
    log.info('PgBoss queues stopped', 'QUEUE');
  }
}

// Handle process termination
process.on('SIGTERM', stopQueues);
process.on('SIGINT', stopQueues);