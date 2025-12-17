const COMMON_PASSWORDS = ['password', '123456', '123456789', 'qwerty', '111111', '123123'];
const ALLOWED_SPECIALS = '!@#$%^&*';

export type PasswordCheck = {
  valid: boolean;
  message?: string;
};

export const validatePassword = (pwd: string): PasswordCheck => {
  if (!pwd || pwd.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters.' };
  }
  if (COMMON_PASSWORDS.includes(pwd.toLowerCase())) {
    return { valid: false, message: 'Password is too common.' };
  }
  if (!/[A-Z]/.test(pwd)) {
    return { valid: false, message: 'Add at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(pwd)) {
    return { valid: false, message: 'Add at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(pwd)) {
    return { valid: false, message: 'Add at least one number.' };
  }
  if (!new RegExp(`[${ALLOWED_SPECIALS.replace(/[\\^$*+?.()|[\\]{}]/g, '\\$&')}]`).test(pwd)) {
    return { valid: false, message: `Add at least one special character: ${ALLOWED_SPECIALS}` };
  }
  return { valid: true };
};


