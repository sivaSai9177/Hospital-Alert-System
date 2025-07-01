/**
 * Server-side logger for Figma plugin
 * Provides consistent logging across the application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'AUTH' | 'API' | 'TRPC' | 'MEMORY' | 'MCP' | 'FIGMA' | 'ERROR' | 'SYSTEM' | 'WS';

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  error?: any;
  duration?: number;
  requestId?: string;
}

class ServerLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const category = `[${entry.category}]`.padEnd(10);
    return `${timestamp} ${level} ${category} ${entry.message}`;
  }

  private log(level: LogLevel, category: LogCategory, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
    };

    // Add to buffer for potential export
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Console output
    const formattedMessage = this.formatMessage(entry);
    const logData = data ? JSON.stringify(data, null, 2) : '';

    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.log(formattedMessage, logData);
        }
        break;
      case 'info':
        console.log(formattedMessage, logData);
        break;
      case 'warn':
        console.warn(formattedMessage, logData);
        break;
      case 'error':
        console.error(formattedMessage, data?.stack || logData);
        break;
    }
  }

  // Category-specific loggers
  auth = {
    info: (message: string, data?: any) => this.log('info', 'AUTH', message, data),
    error: (message: string, error?: any) => this.log('error', 'AUTH', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'AUTH', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'AUTH', message, data),
  };

  api = {
    info: (message: string, data?: any) => this.log('info', 'API', message, data),
    error: (message: string, error?: any) => this.log('error', 'API', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'API', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'API', message, data),
  };

  trpc = {
    info: (message: string, data?: any) => this.log('info', 'TRPC', message, data),
    error: (message: string, error?: any) => this.log('error', 'TRPC', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'TRPC', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'TRPC', message, data),
    request: (path: string, type: string, input?: any, requestId?: string) => {
      this.log('debug', 'TRPC', `${type.toUpperCase()} ${path}`, { input, requestId });
    },
    success: (path: string, type: string, duration: number, requestId?: string) => {
      this.log('info', 'TRPC', `${type.toUpperCase()} ${path} completed in ${duration}ms`, { duration, requestId });
    },
  };

  memory = {
    info: (message: string, data?: any) => this.log('info', 'MEMORY', message, data),
    error: (message: string, error?: any) => this.log('error', 'MEMORY', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'MEMORY', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'MEMORY', message, data),
  };

  mcp = {
    info: (message: string, data?: any) => this.log('info', 'MCP', message, data),
    error: (message: string, error?: any) => this.log('error', 'MCP', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'MCP', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'MCP', message, data),
  };

  figma = {
    info: (message: string, data?: any) => this.log('info', 'FIGMA', message, data),
    error: (message: string, error?: any) => this.log('error', 'FIGMA', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'FIGMA', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'FIGMA', message, data),
  };

  system = {
    info: (message: string, data?: any) => this.log('info', 'SYSTEM', message, data),
    error: (message: string, error?: any) => this.log('error', 'SYSTEM', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'SYSTEM', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'SYSTEM', message, data),
  };

  ws = {
    info: (message: string, data?: any) => this.log('info', 'WS', message, data),
    error: (message: string, error?: any) => this.log('error', 'WS', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'WS', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'WS', message, data),
  };

  // Generic methods
  info(message: string, data?: any) {
    this.log('info', 'SYSTEM', message, data);
  }

  error(message: string, error?: any) {
    this.log('error', 'ERROR', message, error);
  }

  warn(message: string, data?: any) {
    this.log('warn', 'SYSTEM', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', 'SYSTEM', message, data);
  }

  // Get log buffer for export
  getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  // Clear log buffer
  clearLogBuffer(): void {
    this.logBuffer = [];
  }
}

// Export singleton instance
export const serverLogger = new ServerLogger();

// Export for compatibility
export const logger = serverLogger;