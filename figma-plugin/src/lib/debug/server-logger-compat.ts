// ES5-compatible version of server logger
export class ServerLogger {
  private isDevelopment: boolean;
  private logBuffer: any[];
  private maxBufferSize: number;
  
  constructor() {
    this.isDevelopment = true;
    this.logBuffer = [];
    this.maxBufferSize = 1000;
  }
  
  formatMessage(entry: any) {
    const timestamp = entry.timestamp.toISOString();
    const level = entry.level.toUpperCase().padEnd(5);
    const category = `[${entry.category}]`.padEnd(10);
    const message = entry.message;
    const data = entry.data ? `\n${JSON.stringify(entry.data, null, 2)}` : '';
    
    return `${timestamp} ${level} ${category} ${message}${data}`;
  }
  
  addToBuffer(entry: any) {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }
  
  getBuffer() {
    return [...this.logBuffer];
  }
  
  clearBuffer() {
    this.logBuffer = [];
  }
}

export const serverLogger = new ServerLogger();