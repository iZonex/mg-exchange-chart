// ── Logger ──────────────────────────────────────────────────────────────────
// Centralized logging for the chart library.
//
// Usage in library code:
//   import { logger } from './logger';
//   logger.warn('WebGL not available, falling back');
//   logger.debug('Loaded 500 bars');  // only shows when debug enabled
//
// Consumer controls logging:
//   import { Chart } from '@mg-exchange/charts';
//   Chart.setLogLevel('debug');   // show everything
//   Chart.setLogLevel('warn');    // only warnings + errors (default)
//   Chart.setLogLevel('error');   // only errors
//   Chart.setLogLevel('none');    // silent

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

const PREFIX = '[exchange-charts]';

class Logger {
  private level: number = LEVELS.warn; // default: warn + error only
  private customHandler: ((level: LogLevel, message: string, ...args: any[]) => void) | null = null;

  /** Set minimum log level. Messages below this level are suppressed. */
  setLevel(level: LogLevel): void {
    this.level = LEVELS[level];
  }

  /** Get current log level */
  getLevel(): LogLevel {
    for (const [name, val] of Object.entries(LEVELS)) {
      if (val === this.level) return name as LogLevel;
    }
    return 'warn';
  }

  /**
   * Set a custom log handler. Replaces console output.
   * Useful for sending logs to external services (Sentry, DataDog, etc.)
   */
  setHandler(handler: ((level: LogLevel, message: string, ...args: any[]) => void) | null): void {
    this.customHandler = handler;
  }

  debug(message: string, ...args: any[]): void {
    if (this.level > LEVELS.debug) return;
    if (this.customHandler) { this.customHandler('debug', message, ...args); return; }
    console.debug(PREFIX, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    if (this.level > LEVELS.info) return;
    if (this.customHandler) { this.customHandler('info', message, ...args); return; }
    console.info(PREFIX, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    if (this.level > LEVELS.warn) return;
    if (this.customHandler) { this.customHandler('warn', message, ...args); return; }
    console.warn(PREFIX, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    if (this.level > LEVELS.error) return;
    if (this.customHandler) { this.customHandler('error', message, ...args); return; }
    console.error(PREFIX, message, ...args);
  }
}

/** Singleton logger instance for the library */
export const logger = new Logger();
