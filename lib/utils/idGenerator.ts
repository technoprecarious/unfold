import { customAlphabet } from 'nanoid';

// Base36 alphabet: 0-9, A-Z (uppercase only)
const base36Alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Create a custom nanoid generator with base36 alphabet, 6 characters
const generateBase36Id = customAlphabet(base36Alphabet, 6);

/**
 * Generates a 6-character ID using base36 (0-9, A-Z uppercase only)
 * Total combinations: 36^6 = 2,176,782,336 (~2.18 billion unique IDs)
 * 
 * @returns A 6-character uppercase alphanumeric ID
 */
export const generateId = (): string => {
  return generateBase36Id();
};

