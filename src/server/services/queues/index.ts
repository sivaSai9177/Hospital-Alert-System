/**
 * Queue System Entry Point
 * Exports the hybrid queue system for use throughout the application
 */

import { hybridQueue, queues } from './hybrid-queue';
import { log } from '@/lib/core/debug/server-logger';

// Initialize queue system on module load
let initialized = false;

export async function initializeQueues() {
  if (initialized) {
    log.warn('Queue system already initialized', 'QUEUE');
    return;
  }

  try {
    await hybridQueue.initialize();
    initialized = true;
    log.info('Queue system initialized successfully', 'QUEUE');
  } catch (error) {
    log.error('Failed to initialize queue system', 'QUEUE', { error });
    throw error;
  }
}

// Ensure graceful shutdown
process.on('beforeExit', async () => {
  if (initialized) {
    await hybridQueue.shutdown();
    initialized = false;
  }
});

// Re-export for convenience
export { queues, hybridQueue };
export { HybridQueueSystem } from './hybrid-queue';

// Export job types
export interface NotificationJob {
  alertId: string;
  type: 'email' | 'push' | 'sms';
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  urgent?: boolean;
}

export interface EscalationJob {
  alertId: string;
  fromTier: number;
  toTier: number;
  reason: string;
}

export interface AuditJob {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
}