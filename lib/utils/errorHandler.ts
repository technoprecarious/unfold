/**
 * Error handling utilities
 * Sanitizes error messages to prevent information leakage
 */

/**
 * Sanitizes error messages for user display
 * Prevents sensitive information from being exposed
 */
export const sanitizeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message;
    
    // Don't expose internal error details
    if (message.includes('Firebase') || message.includes('Firestore')) {
      return 'A database error occurred. Please try again.';
    }
    
    if (message.includes('auth') || message.includes('authentication')) {
      return 'Authentication error. Please sign in again.';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    // For validation errors, show the message (these are safe)
    if (message.includes('required') || 
        message.includes('Invalid') || 
        message.includes('must be') ||
        message.includes('characters or less')) {
      return message;
    }
    
    // Generic error for everything else
    return 'An error occurred. Please try again.';
  }
  
  return 'An unexpected error occurred. Please try again.';
};

/**
 * Logs detailed error information for debugging (server-side only)
 */
export const logError = (error: unknown, context?: string): void => {
  if (typeof window === 'undefined') {
    // Server-side logging
    console.error(`[${context || 'Error'}]`, error);
  } else {
    // Client-side: only log in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context || 'Error'}]`, error);
    }
  }
};

