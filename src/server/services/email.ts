import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';
import { log } from '@/lib/core/debug/logger';
import { db } from '@/src/db';
import { notificationLogs } from '@/src/db/notification-schema';
import Redis from 'ioredis';
import { z } from 'zod';

// Email validation schema
const EmailOptionsSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  subject: z.string().min(1).max(998), // RFC 2822 limit
  template: z.string().optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  data: z.record(z.any()).optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.union([z.string(), z.instanceof(Buffer)]),
    contentType: z.string().optional(),
  })).optional(),
  headers: z.record(z.string()).optional(),
  priority: z.enum(['high', 'normal', 'low']).default('normal'),
  scheduledFor: z.date().optional(),
  replyTo: z.string().email().optional(),
  // Custom fields for tracking
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  notificationType: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type EmailOptions = z.infer<typeof EmailOptionsSchema>;

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  queueId?: string;
  timestamp: Date;
}

export interface EmailTemplate {
  name: string;
  subject: string | ((data: any) => string);
  html: string | ((data: any) => string);
  text?: string | ((data: any) => string);
  requiredData?: string[];
}

interface RateLimitInfo {
  count: number;
  resetAt: Date;
}

class EmailService {
  private transporter: Transporter | null = null;
  private redis: Redis | null = null;
  private templates: Map<string, EmailTemplate> = new Map();
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private isInitialized = false;
  private connectionAttempts = 0;
  private maxConnectionAttempts = 3;
  private retryDelay = 5000; // 5 seconds

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Initialize transporter
      await this.initializeTransporter();
      
      // Initialize Redis if enabled
      if (process.env.EMAIL_QUEUE_ENABLED === 'true') {
        await this.initializeRedis();
      }
      
      // Load templates
      await this.loadTemplates();
      
      this.isInitialized = true;
      log.info('Email service initialized successfully', 'EMAIL');
    } catch (error) {
      log.error('Failed to initialize email service', 'EMAIL', error);
      // Schedule retry
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        setTimeout(() => this.initialize(), this.retryDelay);
      }
    }
  }

  private async initializeTransporter() {
    try {
      // Validate required environment variables
      const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS'];
      const missingVars = requiredEnvVars.filter(v => !process.env[v]);
      
      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST!,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER!,
          pass: process.env.EMAIL_PASS!,
        },
        // Connection pooling for better performance
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        // Timeouts
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000,  // 30 seconds
        socketTimeout: 60000,     // 60 seconds
      });

      // Verify connection
      await this.verifyConnection();
      
    } catch (error) {
      this.connectionAttempts++;
      throw error;
    }
  }

  private async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('Transporter not initialized');
    }

    try {
      await this.transporter.verify();
      log.info('Email service connection verified', 'EMAIL');
      return true;
    } catch (error) {
      log.error('Email service connection failed', 'EMAIL', error);
      throw error;
    }
  }

  private async initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl);
      
      await this.redis.ping();
      log.info('Redis connection established for email service', 'EMAIL');
    } catch (error) {
      log.warn('Redis initialization failed, email service will work without caching', 'EMAIL', error);
      this.redis = null;
    }
  }

  private async loadTemplates() {
    // Import and register all templates
    try {
      // Load healthcare alert template
      const alertTemplate = await import('./email-templates/healthcare/alert-notification');
      if (alertTemplate.default) {
        this.templates.set('healthcare.alert', alertTemplate.default);
        this.templates.set('alert-notification', alertTemplate.default); // For backward compatibility
      }

      // Load auth verification template
      const verifyEmailTemplate = await import('./email-templates/auth/verify-email');
      if (verifyEmailTemplate.default) {
        this.templates.set('auth.verify', verifyEmailTemplate.default);
        this.templates.set('verify-email', verifyEmailTemplate.default); // For backward compatibility
      }

      log.info(`Loaded ${this.templates.size} email templates`, 'EMAIL');
    } catch (error) {
      log.warn('Some email templates failed to load', 'EMAIL', error);
    }
  }

  // Rate limiting check
  private checkRateLimit(identifier: string): boolean {
    const limit = parseInt(process.env.EMAIL_RATE_LIMIT || '100');
    const window = parseInt(process.env.EMAIL_RATE_WINDOW || '3600000'); // 1 hour
    
    const now = new Date();
    const info = this.rateLimits.get(identifier);
    
    if (!info || info.resetAt < now) {
      // Reset rate limit
      this.rateLimits.set(identifier, {
        count: 1,
        resetAt: new Date(now.getTime() + window),
      });
      return true;
    }
    
    if (info.count >= limit) {
      return false;
    }
    
    info.count++;
    return true;
  }

  // Validate email options
  private validateOptions(options: EmailOptions): void {
    try {
      EmailOptionsSchema.parse(options);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Invalid email options: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }

    // Additional validation
    if (!options.html && !options.text && !options.template) {
      throw new Error('Email must have either html, text, or template');
    }

    // Check template requirements
    if (options.template) {
      const template = this.templates.get(options.template);
      if (!template) {
        throw new Error(`Template "${options.template}" not found`);
      }

      // Check required data fields
      if (template.requiredData) {
        const missingFields = template.requiredData.filter(
          field => !options.data || !(field in options.data)
        );
        if (missingFields.length > 0) {
          throw new Error(`Template requires data fields: ${missingFields.join(', ')}`);
        }
      }
    }
  }

  // Render template
  private renderTemplate(template: EmailTemplate, data: any): {
    subject: string;
    html: string;
    text: string;
  } {
    const renderField = (field: string | ((data: any) => string), data: any): string => {
      if (typeof field === 'function') {
        return field(data);
      }
      // Simple template interpolation with nested property support
      return field.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
        const keys = key.split('.');
        let value = data;
        for (const k of keys) {
          value = value?.[k];
        }
        return value !== undefined ? value : match;
      });
    };

    return {
      subject: renderField(template.subject, data),
      html: renderField(template.html, data),
      text: template.text ? renderField(template.text, data) : '',
    };
  }

  // Main send method
  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      // Wait for initialization
      if (!this.isInitialized) {
        await this.waitForInitialization();
      }

      // Validate options
      this.validateOptions(options);

      // Check rate limit
      const rateLimitKey = options.userId || options.organizationId || 'global';
      if (!this.checkRateLimit(rateLimitKey)) {
        throw new Error('Rate limit exceeded');
      }

      // Development mode check
      if (process.env.EMAIL_DEV_MODE === 'true') {
        const devEmail = process.env.EMAIL_DEV_TO || 'dev@example.com';
        log.info('Development mode: redirecting email', 'EMAIL', {
          originalTo: options.to,
          redirectTo: devEmail,
        });
        options.to = devEmail;
      }

      // Always send directly (queueing handled by hybrid-queue)
      return await this.sendDirect(options);
    } catch (error) {
      log.error('Failed to send email', 'EMAIL', error);
      
      // Log to database
      await this.logEmail({
        ...options,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }


  // Send email directly
  private async sendDirect(options: EmailOptions): Promise<EmailResult> {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    try {
      // Prepare email content
      let subject = options.subject;
      let html = options.html || '';
      let text = options.text || '';

      // Render template if specified
      if (options.template) {
        const template = this.templates.get(options.template);
        if (template) {
          const rendered = this.renderTemplate(template, options.data || {});
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
        }
      }

      // Prepare mail options
      const mailOptions: SendMailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        subject,
        html,
        text: text || this.htmlToText(html),
        attachments: options.attachments,
        headers: options.headers,
        priority: options.priority,
        replyTo: options.replyTo,
      };

      // Send email
      const info = await this.transporter.sendMail(mailOptions);

      log.info('Email sent successfully', 'EMAIL', {
        messageId: info.messageId,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      });

      // Log to database
      await this.logEmail({
        ...options,
        status: 'sent',
        messageId: info.messageId,
      });

      return {
        success: true,
        messageId: info.messageId,
        timestamp: new Date(),
      };
    } catch (error) {
      // Handle specific SMTP errors
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          throw new Error('Email server connection refused. Please check SMTP settings.');
        }
        if (error.message.includes('EAUTH')) {
          throw new Error('Email authentication failed. Please check credentials.');
        }
        if (error.message.includes('ESOCKET')) {
          throw new Error('Email server connection timeout. Please check network.');
        }
      }
      throw error;
    }
  }

  // Send batch emails
  async sendBatch(emails: EmailOptions[]): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    
    // Process in chunks to avoid overwhelming the server
    const chunkSize = parseInt(process.env.EMAIL_BATCH_SIZE || '50');
    
    for (let i = 0; i < emails.length; i += chunkSize) {
      const chunk = emails.slice(i, i + chunkSize);
      const chunkResults = await Promise.allSettled(
        chunk.map(email => this.send(email))
      );
      
      results.push(...chunkResults.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            success: false,
            error: result.reason?.message || 'Unknown error',
            timestamp: new Date(),
          };
        }
      }));
      
      // Small delay between chunks
      if (i + chunkSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  // Log email to database
  private async logEmail(data: any): Promise<void> {
    try {
      await db.insert(notificationLogs).values({
        channel: 'email',
        type: data.notificationType || 'general',
        userId: data.userId,
        organizationId: data.organizationId,
        status: data.status,
        sentAt: data.status === 'sent' ? new Date() : null,
        failedAt: data.status === 'failed' ? new Date() : null,
        error: data.error,
        metadata: {
          to: data.to,
          subject: data.subject,
          template: data.template,
          messageId: data.messageId,
          priority: data.priority,
          ...data.metadata,
        },
      });
    } catch (error) {
      log.error('Failed to log email', 'EMAIL', error);
    }
  }

  // Helper to convert HTML to plain text
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Wait for initialization
  private async waitForInitialization(timeout = 30000): Promise<void> {
    const start = Date.now();
    
    while (!this.isInitialized && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!this.isInitialized) {
      throw new Error('Email service initialization timeout');
    }
  }


  // Shutdown gracefully
  async shutdown(): Promise<void> {
    log.info('Shutting down email service', 'EMAIL');
    
    if (this.redis) {
      await this.redis.quit();
    }
    
    if (this.transporter) {
      this.transporter.close();
    }
    
    this.isInitialized = false;
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export types
export type { EmailService };

// Export specific functions for queue worker compatibility
export const sendAlertNotificationEmail = async (data: {
  to: string;
  alertType: string;
  roomNumber: string;
  urgencyLevel: number;
  description: string;
  createdAt: Date;
}) => {
  return emailService.send({
    to: data.to,
    subject: `🚨 Healthcare Alert: ${data.alertType}`,
    template: 'alert-notification',
    data,
  });
};