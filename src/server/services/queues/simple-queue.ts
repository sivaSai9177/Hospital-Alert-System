/**
 * Simple Queue Implementation
 * A lightweight alternative to BullMQ using just Redis
 */

import Redis from 'ioredis';
import { log } from '@/lib/core/debug/server-logger';

export interface QueueJob<T = any> {
  id: string;
  data: T;
  attempts: number;
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}

export class SimpleQueue<T = any> {
  private redis: Redis;
  private queueName: string;
  private processing = false;
  private processInterval: NodeJS.Timeout | null = null;

  constructor(queueName: string, redisUrl?: string) {
    this.queueName = queueName;
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Add a job to the queue
   */
  async add(data: T): Promise<string> {
    const job: QueueJob<T> = {
      id: `${this.queueName}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      data,
      attempts: 0,
      createdAt: new Date(),
    };

    await this.redis.lpush(
      `queue:${this.queueName}:pending`,
      JSON.stringify(job)
    );

    log.debug(`Job added to queue ${this.queueName}`, 'QUEUE', { jobId: job.id });
    return job.id;
  }

  /**
   * Process jobs from the queue
   */
  async process(handler: (job: QueueJob<T>) => Promise<void>, options = { concurrency: 1, pollInterval: 5000 }) {
    if (this.processing) {
      throw new Error('Queue is already processing');
    }

    this.processing = true;

    const processNext = async () => {
      if (!this.processing) return;

      try {
        // Move job from pending to processing
        const jobData = await this.redis.rpoplpush(
          `queue:${this.queueName}:pending`,
          `queue:${this.queueName}:processing`
        );

        if (!jobData) {
          // No jobs available
          return;
        }

        const job = JSON.parse(jobData) as QueueJob<T>;
        job.processedAt = new Date();

        try {
          // Process the job
          await handler(job);

          // Remove from processing queue on success
          await this.redis.lrem(`queue:${this.queueName}:processing`, 1, jobData);
          
          log.debug(`Job completed successfully`, 'QUEUE', { jobId: job.id });
        } catch (error) {
          job.attempts++;
          job.error = error instanceof Error ? error.message : String(error);

          if (job.attempts < 3) {
            // Retry - add back to pending queue
            await this.redis.lpush(
              `queue:${this.queueName}:pending`,
              JSON.stringify(job)
            );
            log.warn(`Job failed, retrying`, 'QUEUE', { jobId: job.id, attempts: job.attempts });
          } else {
            // Move to failed queue
            await this.redis.lpush(
              `queue:${this.queueName}:failed`,
              JSON.stringify(job)
            );
            log.error(`Job failed permanently`, 'QUEUE', { jobId: job.id, error: job.error });
          }

          // Remove from processing queue
          await this.redis.lrem(`queue:${this.queueName}:processing`, 1, jobData);
        }
      } catch (error) {
        log.error(`Queue processing error`, 'QUEUE', { error });
      }
    };

    // Process jobs at the specified interval
    this.processInterval = setInterval(processNext, options.pollInterval);
    
    // Process immediately
    processNext();
  }

  /**
   * Stop processing jobs
   */
  async stop() {
    this.processing = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    const [pending, processing, failed] = await Promise.all([
      this.redis.llen(`queue:${this.queueName}:pending`),
      this.redis.llen(`queue:${this.queueName}:processing`),
      this.redis.llen(`queue:${this.queueName}:failed`),
    ]);

    return { pending, processing, failed };
  }

  /**
   * Clean up and close connections
   */
  async close() {
    await this.stop();
    await this.redis.quit();
  }
}

// Helper to create typed queues
export function createQueue<T>(name: string): SimpleQueue<T> {
  return new SimpleQueue<T>(name);
}