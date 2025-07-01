/**
 * Client-side logger for Figma plugin UI
 * Integrates with debug console for real-time monitoring
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'UI' | 'FIGMA' | 'TRPC' | 'MEMORY' | 'ROUTER' | 'ERROR' | 'SYSTEM';

interface ClientLogEntry {
  timestamp: Date;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  stack?: string;
}

interface DebugConsoleInterface {
  addLog: (entry: ClientLogEntry) => void;
  isEnabled: () => boolean;
}

class ClientLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logBuffer: ClientLogEntry[] = [];
  private maxBufferSize = 500;
  private debugConsole: DebugConsoleInterface | null = null;
  private enabledCategories = new Set<LogCategory>(['ERROR', 'SYSTEM']);

  constructor() {
    // Enable all categories in development
    if (this.isDevelopment) {
      this.enabledCategories = new Set(['UI', 'FIGMA', 'TRPC', 'MEMORY', 'ROUTER', 'ERROR', 'SYSTEM']);
    }
  }

  /**
   * Set the debug console interface
   */
  setDebugConsole(console: DebugConsoleInterface) {
    this.debugConsole = console;
    
    // Send buffered logs to console
    if (console.isEnabled() && this.logBuffer.length > 0) {
      this.logBuffer.forEach(entry => console.addLog(entry));
    }
  }

  /**
   * Enable/disable categories
   */
  setEnabledCategories(categories: LogCategory[]) {
    this.enabledCategories = new Set(categories);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, category: LogCategory, message: string, data?: any) {
    // Skip if category is disabled
    if (!this.enabledCategories.has(category) && level !== 'error') {
      return;
    }

    const entry: ClientLogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
    };

    // Extract stack trace for errors
    if (data instanceof Error) {
      entry.stack = data.stack;
      entry.data = {
        name: data.name,
        message: data.message,
        ...data,
      };
    }

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Send to debug console if available
    if (this.debugConsole?.isEnabled()) {
      this.debugConsole.addLog(entry);
    }

    // Console output
    const prefix = `[${category}]`;
    const formattedMessage = `${prefix} ${message}`;

    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.log(formattedMessage, data);
        }
        break;
      case 'info':
        console.log(formattedMessage, data);
        break;
      case 'warn':
        console.warn(formattedMessage, data);
        break;
      case 'error':
        console.error(formattedMessage, data);
        break;
    }
  }

  // Category-specific loggers
  ui = {
    info: (message: string, data?: any) => this.log('info', 'UI', message, data),
    error: (message: string, error?: any) => this.log('error', 'UI', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'UI', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'UI', message, data),
  };

  figma = {
    info: (message: string, data?: any) => this.log('info', 'FIGMA', message, data),
    error: (message: string, error?: any) => this.log('error', 'FIGMA', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'FIGMA', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'FIGMA', message, data),
  };

  trpc = {
    info: (message: string, data?: any) => this.log('info', 'TRPC', message, data),
    error: (message: string, error?: any) => this.log('error', 'TRPC', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'TRPC', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'TRPC', message, data),
  };

  memory = {
    info: (message: string, data?: any) => this.log('info', 'MEMORY', message, data),
    error: (message: string, error?: any) => this.log('error', 'MEMORY', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'MEMORY', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'MEMORY', message, data),
  };

  router = {
    info: (message: string, data?: any) => this.log('info', 'ROUTER', message, data),
    error: (message: string, error?: any) => this.log('error', 'ROUTER', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'ROUTER', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'ROUTER', message, data),
  };

  system = {
    info: (message: string, data?: any) => this.log('info', 'SYSTEM', message, data),
    error: (message: string, error?: any) => this.log('error', 'SYSTEM', message, error),
    warn: (message: string, data?: any) => this.log('warn', 'SYSTEM', message, data),
    debug: (message: string, data?: any) => this.log('debug', 'SYSTEM', message, data),
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

  // Get log buffer
  getLogBuffer(): ClientLogEntry[] {
    return [...this.logBuffer];
  }

  // Clear log buffer
  clearLogBuffer(): void {
    this.logBuffer = [];
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }
}

// Export singleton instance
export const clientLogger = new ClientLogger();

// Export for compatibility
export const logger = clientLogger;