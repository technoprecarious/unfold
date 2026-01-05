/**
 * Input validation constants and utilities
 * These limits prevent DoS attacks and ensure data integrity
 */

// Maximum lengths for text fields
export const MAX_LENGTHS = {
  TITLE: 200,
  DESCRIPTION: 5000,
  NOTES: 10000,
  CATEGORY: 100,
  PHASE: 100,
  OBJECTIVE: 1000,
  TAG: 50,
  MAX_TAGS: 50,
  MAX_RESOURCES: 50,
  MAX_DEPENDENCIES: 50,
  MAX_SUBTASKS: 50,
} as const;

// Maximum JSON input size (10KB)
export const MAX_JSON_INPUT_SIZE = 10 * 1024;

// Maximum array size
export const MAX_ARRAY_SIZE = 100;

/**
 * Validates string length
 */
export const validateStringLength = (value: string, maxLength: number): boolean => {
  return typeof value === 'string' && value.length <= maxLength;
};

/**
 * Validates and trims string to max length
 */
export const sanitizeString = (value: string, maxLength: number): string => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

/**
 * Validates array of strings
 */
export const validateStringArray = (value: unknown, maxItems: number = MAX_ARRAY_SIZE): value is string[] => {
  if (!Array.isArray(value)) return false;
  if (value.length > maxItems) return false;
  return value.every(item => typeof item === 'string' && item.length <= MAX_LENGTHS.TAG);
};

/**
 * Validates priority enum
 */
export const isValidPriority = (value: unknown): value is 'low' | 'medium' | 'high' | 'critical' | undefined => {
  if (value === undefined || value === null) return true;
  return ['low', 'medium', 'high', 'critical'].includes(value as string);
};

/**
 * Validates status primary enum
 */
export const isValidStatusPrimary = (value: unknown): value is 'planned' | 'active' | 'paused' | 'due' | 'completed' | undefined => {
  if (value === undefined || value === null) return true;
  return ['planned', 'active', 'paused', 'due', 'completed'].includes(value as string);
};

/**
 * Validates status secondary enum
 */
export const isValidStatusSecondary = (value: unknown): value is 'planned' | 'completed' | undefined => {
  if (value === undefined || value === null) return true;
  return ['planned', 'completed'].includes(value as string);
};

/**
 * Validates recurrence type enum
 */
export const isValidRecurrenceType = (value: unknown): value is 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | undefined => {
  if (value === undefined || value === null) return true;
  return ['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(value as string);
};

/**
 * Validates ISO date string format
 */
export const isValidISODate = (value: unknown): boolean => {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  // ISO 8601 format: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/;
  if (!isoDateRegex.test(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
};

/**
 * Validates JSON input size before parsing
 */
export const validateJsonSize = (jsonString: string): boolean => {
  // Check size in bytes (approximate)
  const sizeInBytes = new Blob([jsonString]).size;
  return sizeInBytes <= MAX_JSON_INPUT_SIZE;
};

/**
 * Sanitizes user input by removing potentially dangerous characters
 * This is a basic sanitization - for production, consider using DOMPurify
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  // Remove null bytes and control characters (except newlines and tabs)
  return input
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
};

/**
 * Validates title field
 */
export const validateTitle = (title: unknown): string | null => {
  if (typeof title !== 'string') return null;
  const sanitized = sanitizeString(title, MAX_LENGTHS.TITLE);
  if (sanitized.length === 0) return null;
  return sanitized;
};

/**
 * Validates description field
 */
export const validateDescription = (description: unknown): string | undefined => {
  if (description === undefined || description === null || description === '') return undefined;
  if (typeof description !== 'string') return undefined;
  return sanitizeString(description, MAX_LENGTHS.DESCRIPTION);
};

/**
 * Validates notes field
 */
export const validateNotes = (notes: unknown): string | undefined => {
  if (notes === undefined || notes === null || notes === '') return undefined;
  if (typeof notes !== 'string') return undefined;
  return sanitizeString(notes, MAX_LENGTHS.NOTES);
};

