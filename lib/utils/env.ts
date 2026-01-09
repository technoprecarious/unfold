/**
 * Environment variable validation utility
 * 
 * Validates required environment variables at startup
 * Throws errors if critical variables are missing
 * 
 * Usage:
 *   import { validateEnv, getEnv } from '@/lib/utils/env';
 *   
 *   // Validate all required variables
 *   validateEnv();
 *   
 *   // Get validated environment variable
 *   const apiKey = getEnv('NEXT_PUBLIC_FIREBASE_API_KEY');
 */

import { logger } from './logger';

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = {
  // Firebase configuration (required for client-side)
  NEXT_PUBLIC_FIREBASE_API_KEY: 'Firebase API Key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'Firebase Auth Domain',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'Firebase Project ID',
  // Optional but recommended
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'Firebase Storage Bucket',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'Firebase Messaging Sender ID',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'Firebase App ID',
} as const;

/**
 * Optional environment variables
 */
const OPTIONAL_ENV_VARS = {
  NEXT_PUBLIC_SITE_URL: 'Site URL',
  NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'Use Firebase Emulator',
} as const;

/**
 * Validates that a required environment variable exists
 */
export const validateEnvVar = (key: string, description?: string): string => {
  const value = process.env[key];
  
  if (!value || value.trim() === '') {
    const errorMessage = `Missing required environment variable: ${key}${description ? ` (${description})` : ''}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  return value;
};

/**
 * Gets an environment variable with optional default value
 */
export const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key];
  
  if (!value || value.trim() === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    logger.warn(`Environment variable ${key} is not set${defaultValue ? `, using default: ${defaultValue}` : ''}`);
    return '';
  }
  
  return value;
};

/**
 * Gets a boolean environment variable
 */
export const getEnvBool = (key: string, defaultValue: boolean = false): boolean => {
  const value = process.env[key];
  
  if (!value) {
    return defaultValue;
  }
  
  return value.toLowerCase() === 'true' || value === '1';
};

/**
 * Validates all required environment variables
 * Call this at application startup
 */
export const validateEnv = (): void => {
  const missing: string[] = [];
  
  // Check required variables
  for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      missing.push(`${key} (${description})`);
    }
  }
  
  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\nPlease check your .env.local file.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  // Log optional variables status
  for (const [key, description] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      logger.info(`Optional environment variable not set: ${key} (${description})`);
    }
  }
  
  logger.info('Environment variables validated successfully');
};

/**
 * Validates Firebase-specific environment variables
 */
export const validateFirebaseEnv = (): boolean => {
  const required = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ];
  
  const missing = required.filter(key => {
    const value = process.env[key];
    return !value || value.trim() === '';
  });
  
  if (missing.length > 0) {
    logger.warn(`Missing Firebase environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
};

export default {
  validateEnv,
  validateEnvVar,
  getEnv,
  getEnvBool,
  validateFirebaseEnv,
};

