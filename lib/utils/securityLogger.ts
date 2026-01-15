/**
 * Security Event Logger
 * 
 * Tracks security-relevant events for monitoring and audit purposes.
 * In production, these logs can be sent to a monitoring service (e.g., Sentry, LogRocket).
 * 
 * Security events are ALWAYS logged, even in production (unlike regular debug logs).
 */

import { logger } from './logger';

export type SecurityEventType =
  | 'auth_success'
  | 'auth_failure'
  | 'auth_signup'
  | 'auth_signout'
  | 'auth_password_change'
  | 'firestore_permission_denied'
  | 'firestore_unauthorized_access'
  | 'suspicious_activity'
  | 'data_export'
  | 'bulk_operation'
  | 'rate_limit_exceeded';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: string;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * In-memory security event store (for development)
 * In production, this would be sent to a monitoring service
 */
const securityEvents: SecurityEvent[] = [];
const MAX_EVENTS_IN_MEMORY = 100;

/**
 * Gets client information (IP, user agent) if available
 */
const getClientInfo = (): { ipAddress?: string; userAgent?: string } => {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    userAgent: navigator.userAgent,
    // IP address would need to be obtained from server-side
    // For now, we'll track it via a server endpoint if needed
  };
};

/**
 * Logs a security event
 */
export const logSecurityEvent = (
  type: SecurityEventType,
  details: Record<string, any>,
  severity: SecurityEvent['severity'] = 'medium',
  userId?: string,
  email?: string
): void => {
  const event: SecurityEvent = {
    type,
    timestamp: new Date().toISOString(),
    userId,
    email,
    ...getClientInfo(),
    details: sanitizeSecurityDetails(details),
    severity,
  };

  // Always log security events (even in production)
  logger.error(`[SECURITY] ${type}`, {
    severity,
    userId,
    email,
    ...event.details,
  });

  // Store in memory (for development/debugging)
  if (process.env.NODE_ENV === 'development') {
    securityEvents.push(event);
    if (securityEvents.length > MAX_EVENTS_IN_MEMORY) {
      securityEvents.shift(); // Remove oldest
    }
  }

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to monitoring service
    // Example: sendToMonitoringService(event);
  }
};

/**
 * Sanitizes security event details to prevent logging sensitive data
 */
const sanitizeSecurityDetails = (details: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential', 'auth'];

  for (const [key, value] of Object.entries(details)) {
    const isSensitive = sensitiveKeys.some((sensitive) =>
      key.toLowerCase().includes(sensitive)
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeSecurityDetails(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Gets recent security events (for admin/debugging)
 */
export const getRecentSecurityEvents = (limit: number = 50): SecurityEvent[] => {
  return securityEvents.slice(-limit).reverse();
};

/**
 * Gets security events by type
 */
export const getSecurityEventsByType = (
  type: SecurityEventType,
  limit: number = 50
): SecurityEvent[] => {
  return securityEvents
    .filter((event) => event.type === type)
    .slice(-limit)
    .reverse();
};

/**
 * Detects suspicious patterns in recent events
 */
export const detectSuspiciousActivity = (): {
  suspicious: boolean;
  reasons: string[];
  events: SecurityEvent[];
} => {
  const recentEvents = securityEvents.slice(-20); // Last 20 events
  const reasons: string[] = [];
  const suspiciousEvents: SecurityEvent[] = [];

  // Check for multiple failed auth attempts
  const failedAuthAttempts = recentEvents.filter(
    (e) => e.type === 'auth_failure'
  );
  if (failedAuthAttempts.length >= 5) {
    reasons.push(`Multiple failed authentication attempts (${failedAuthAttempts.length})`);
    suspiciousEvents.push(...failedAuthAttempts);
  }

  // Check for rapid-fire events (potential DoS)
  if (recentEvents.length >= 10) {
    const timeSpan = recentEvents.length > 0
      ? new Date(recentEvents[recentEvents.length - 1].timestamp).getTime() -
        new Date(recentEvents[0].timestamp).getTime()
      : 0;
    if (timeSpan < 10000) {
      // 10 seconds
      reasons.push('Rapid-fire events detected (potential DoS)');
      suspiciousEvents.push(...recentEvents);
    }
  }

  // Check for permission denied spikes
  const permissionDenied = recentEvents.filter(
    (e) => e.type === 'firestore_permission_denied'
  );
  if (permissionDenied.length >= 3) {
    reasons.push(`Multiple permission denials (${permissionDenied.length})`);
    suspiciousEvents.push(...permissionDenied);
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
    events: suspiciousEvents,
  };
};

/**
 * Helper: Log authentication success
 */
export const logAuthSuccess = (
  method: 'email' | 'google',
  userId: string,
  email: string
): void => {
  logSecurityEvent(
    'auth_success',
    { method },
    'low',
    userId,
    email
  );
};

/**
 * Helper: Log authentication failure
 */
export const logAuthFailure = (
  method: 'email' | 'google',
  email: string,
  errorCode?: string
): void => {
  logSecurityEvent(
    'auth_failure',
    { method, errorCode },
    'medium',
    undefined,
    email
  );
};

/**
 * Helper: Log Firestore permission denied
 */
export const logFirestorePermissionDenied = (
  userId: string,
  collection: string,
  operation: 'read' | 'write' | 'delete',
  documentId?: string
): void => {
  logSecurityEvent(
    'firestore_permission_denied',
    { collection, operation, documentId },
    'high',
    userId
  );
};

/**
 * Helper: Log suspicious activity
 */
export const logSuspiciousActivity = (
  reason: string,
  details: Record<string, any>,
  userId?: string
): void => {
  logSecurityEvent(
    'suspicious_activity',
    { reason, ...details },
    'critical',
    userId
  );
};

export default {
  logSecurityEvent,
  logAuthSuccess,
  logAuthFailure,
  logFirestorePermissionDenied,
  logSuspiciousActivity,
  getRecentSecurityEvents,
  getSecurityEventsByType,
  detectSuspiciousActivity,
};
