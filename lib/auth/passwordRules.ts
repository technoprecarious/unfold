// Constants
const MIN_PASSWORD_LENGTH = 8;
const COMMON_PASSWORDS = ['password', '123456', '123456789', 'qwerty', '111111', '123123'];
const ALLOWED_SPECIAL_CHARACTERS = '!@#$%^&*';

// Regex patterns
const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const NUMBER_PATTERN = /[0-9]/;

export type PasswordCheck = {
  valid: boolean;
  message?: string;
};

/**
 * Validates password against security rules
 * @param password - The password to validate
 * @returns PasswordCheck object with validation result and optional message
 */
export const validatePassword = (password: string): PasswordCheck => {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { 
      valid: false, 
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` 
    };
  }
  
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return { valid: false, message: 'Password is too common.' };
  }
  
  if (!UPPERCASE_PATTERN.test(password)) {
    return { valid: false, message: 'Add at least one uppercase letter.' };
  }
  
  if (!LOWERCASE_PATTERN.test(password)) {
    return { valid: false, message: 'Add at least one lowercase letter.' };
  }
  
  if (!NUMBER_PATTERN.test(password)) {
    return { valid: false, message: 'Add at least one number.' };
  }
  
  // Escape special regex characters in allowed specials
  const escapedSpecials = ALLOWED_SPECIAL_CHARACTERS.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
  const specialPattern = new RegExp(`[${escapedSpecials}]`);
  
  if (!specialPattern.test(password)) {
    return { 
      valid: false, 
      message: `Add at least one special character: ${ALLOWED_SPECIAL_CHARACTERS}` 
    };
  }
  
  return { valid: true };
};


