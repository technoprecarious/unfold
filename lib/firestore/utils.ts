/**
 * Removes undefined values from an object recursively
 * Firestore doesn't accept undefined values
 */
export const removeUndefined = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const cleaned: any = {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== undefined) {
      // Use Object.prototype.toString to check for Date to avoid instanceof type issues
      const isDate = Object.prototype.toString.call(value) === '[object Date]';
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !isDate) {
        // Recursively clean nested objects
        const cleanedNested = removeUndefined(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
};




