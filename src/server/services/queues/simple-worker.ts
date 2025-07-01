/**
 * Simple Queue Worker
 * Processes background jobs using our lightweight queue implementation
 */

import { createQueue, SimpleQueue } from './simple-queue';
import { log } from '@/lib/core/debug/server-logger';
import { emailService } from '../email';
import { pushService } from '../push-notifications';
import { db } from '@/src/db';
import { alerts, healthcareAuditLogs } from '@/src/db/healthcare-schema';
import { eq } from 'drizzle-orm';

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

// Create queues
const notificationQueue = createQueue<AlertNotificationJob>('alert-notifications');
const escalationQueue = createQueue<AlertEscalationJob>('alert-escalations');
const auditQueue = createQueue<AuditLogJob>('audit-logs');

// Process notification jobs
async function processNotificationJob(job: { data: AlertNotificationJob }) {
  const { alertId, type, recipientId, recipientEmail, recipientPhone } = job.data;
  
  log.info(`Processing ${type} notification for alert ${alertId}`, 'WORKER', {
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
            subject: `Alert: ${alert.alertType}`,
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
}

// Process escalation jobs
async function processEscalationJob(job: { data: AlertEscalationJob }) {
  const { alertId, fromTier, toTier, reason } = job.data;
  
  log.info(`Processing alert escalation`, 'WORKER', {
    alertId,
    fromTier,
    toTier,
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
}

// Process audit log jobs
async function processAuditJob(job: { data: AuditLogJob }) {
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
}

// Start workers
export async function startWorkers() {
  log.info('Starting queue workers...', 'WORKER');
  
  // Start processing queues
  await Promise.all([
    notificationQueue.process(processNotificationJob, { concurrency: 1, pollInterval: 5000 }),
    escalationQueue.process(processEscalationJob, { concurrency: 1, pollInterval: 10000 }),
    auditQueue.process(processAuditJob, { concurrency: 1, pollInterval: 15000 }),
  ]);
  
  log.info('Queue workers started', 'WORKER');
}

// Stop workers
export async function stopWorkers() {
  log.info('Stopping queue workers...', 'WORKER');
  
  await Promise.all([
    notificationQueue.stop(),
    escalationQueue.stop(),
    auditQueue.stop(),
  ]);
  
  log.info('Queue workers stopped', 'WORKER');
}

// Export queue instances for adding jobs
export const queues = {
  notification: notificationQueue,
  escalation: escalationQueue,
  audit: auditQueue,
};

// Graceful shutdown
const shutdown = async () => {
  await stopWorkers();
  
  await Promise.all([
    notificationQueue.close(),
    escalationQueue.close(),
    auditQueue.close(),
  ]);
  
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Auto-start if run directly
if (require.main === module) {
  startWorkers().catch(error => {
    log.error('Failed to start workers', 'WORKER', { error });
    process.exit(1);
  });
}