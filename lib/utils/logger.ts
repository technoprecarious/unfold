/**
 * Production-safe logging utility
 * 
 * In development: Logs all messages to console
 * In production: Only logs errors (sanitized), sends to error tracking service
 * 
 * Usage:
 *   import { logger } from '@/lib/utils/logger';
 *   logger.log('Debug message');
 *   logger.warn('Warning message');
 *   logger.error('Error message', error);
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isClient = typeof window !== 'undefined';

/**
 * Sanitizes error objects to prevent information leakage
 */
const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    // In production, only show generic messages
    if (!isDevelopment) {
      return 'An error occurred';
    }
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};

/**
 * Sanitizes arguments to prevent logging sensitive data
 */
const sanitizeArgs = (args: any[]): any[] => {
  if (isDevelopment) {
    return args; // Show everything in development
  }
  
  // In production, filter out potentially sensitive data
  return args.map(arg => {
    if (typeof arg === 'string') {
      // Remove potential sensitive patterns
      const sensitivePatterns = [
        /password/i,
        /token/i,
        /secret/i,
        /key/i,
        /credential/i,
        /auth/i,
      ];
      
      for (const pattern of sensitivePatterns) {
        if (pattern.test(arg)) {
          return '[Sensitive data redacted]';
        }
      }
    }
    
    if (arg instanceof Error) {
      return sanitizeError(arg);
    }
    
    return arg;
  });
};

/**
 * Production-safe logger
 */
export const logger = {
  /**
   * Logs debug information (only in development)
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log('[LOG]', ...args);
    }
    // In production, do nothing (or send to analytics)
  },

  /**
   * Logs warnings (only in development)
   */
  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
    // In production, could send to monitoring service
  },

  /**
   * Logs errors (always logged, but sanitized in production)
   */
  error: (message: string, error?: unknown): void => {
    const sanitizedMessage = sanitizeError(error || message);
    const sanitizedArgs = sanitizeArgs([message, error].filter(Boolean));
    
    if (isDevelopment) {
      console.error('[ERROR]', ...sanitizedArgs);
    } else {
      // In production, log sanitized error
      console.error('[ERROR]', sanitizedMessage);
      
      // TODO: Integrate with error tracking service (e.g., Sentry)
      // if (isClient && typeof window !== 'undefined') {
      //   // Example: window.Sentry?.captureException(error);
      // }
    }
  },

  /**
   * Logs info messages (only in development)
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Logs debug messages (only in development, more verbose)
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  },
};

/**
 * Creates a scoped logger for a specific module
 */
export const createLogger = (module: string) => ({
  log: (...args: any[]) => logger.log(`[${module}]`, ...args),
  warn: (...args: any[]) => logger.warn(`[${module}]`, ...args),
  error: (message: string, error?: unknown) => logger.error(`[${module}] ${message}`, error),
  info: (...args: any[]) => logger.info(`[${module}]`, ...args),
  debug: (...args: any[]) => logger.debug(`[${module}]`, ...args),
});

export default logger;

