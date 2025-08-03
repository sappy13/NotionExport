import * as fs from 'fs-extra';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source?: string;
}

export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logFile?: string;
  private listeners: ((entry: LogEntry) => void)[] = [];

  constructor(logFile?: string) {
    this.logFile = logFile;
    // Setup console overrides after a delay to prevent initialization issues
    setTimeout(() => {
      this.setupConsoleOverrides();
    }, 100);
  }

  private setupConsoleOverrides() {
    try {
      const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info,
        debug: console.debug
      };

      console.log = (...args) => {
        try {
          this.log('info', args.join(' '), 'console');
        } catch (e) {
          // Ignore logging errors to prevent recursion
        }
        originalConsole.log(...args);
      };

      console.info = (...args) => {
        try {
          this.log('info', args.join(' '), 'console');
        } catch (e) {
          // Ignore logging errors to prevent recursion
        }
        originalConsole.info(...args);
      };

      console.warn = (...args) => {
        try {
          this.log('warn', args.join(' '), 'console');
        } catch (e) {
          // Ignore logging errors to prevent recursion
        }
        originalConsole.warn(...args);
      };

      console.error = (...args) => {
        try {
          this.log('error', args.join(' '), 'console');
        } catch (e) {
          // Ignore logging errors to prevent recursion
        }
        originalConsole.error(...args);
      };

      console.debug = (...args) => {
        try {
          this.log('debug', args.join(' '), 'console');
        } catch (e) {
          // Ignore logging errors to prevent recursion
        }
        originalConsole.debug(...args);
      };
    } catch (error) {
      // If console override setup fails, just continue without it
    }
  }

  log(level: LogEntry['level'], message: string, source?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      source
    };

    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(entry));

    // Write to file if configured
    if (this.logFile) {
      this.writeToFile(entry);
    }
  }

  private async writeToFile(entry: LogEntry) {
    try {
      await fs.ensureFile(this.logFile!);
      const logLine = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}\n`;
      await fs.appendFile(this.logFile!, logLine);
    } catch (error) {
      // Don't log file write errors to prevent infinite loops
    }
  }

  info(message: string, source?: string) {
    this.log('info', message, source);
  }

  warn(message: string, source?: string) {
    this.log('warn', message, source);
  }

  error(message: string, source?: string) {
    this.log('error', message, source);
  }

  debug(message: string, source?: string) {
    this.log('debug', message, source);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    if (this.logFile) {
      fs.writeFile(this.logFile, '').catch(() => {});
    }
  }

  addListener(listener: (entry: LogEntry) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}