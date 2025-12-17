type AuthErrorMap = Record<string, string>;

const ERROR_MAP: AuthErrorMap = {
  'auth/user-not-found': "We couldn't find an account with that email. Want to sign up?",
  'auth/invalid-credential': 'Invalid email or password. Please try again.',
  'auth/wrong-password': 'Wrong password. Please try again.',
  'auth/invalid-email': 'That email looks invalid. Please check and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/popup-closed-by-user': 'Sign-in was canceled. Please try again.',
  'auth/popup-blocked': 'Your browser blocked the sign-in popup. Please allow popups and try again.',
  'auth/unauthorized-domain':
    'This domain is not authorized for sign-in. Please contact support if this persists.',
};

export const mapAuthError = (error: unknown): string => {
  const code =
    typeof error === 'object' && error && 'code' in error ? (error as { code?: string }).code : undefined;
  const message =
    typeof error === 'object' && error && 'message' in error ? (error as { message?: string }).message : undefined;

  if (code && ERROR_MAP[code]) return ERROR_MAP[code];
  if (message) return message;
  return 'Something went wrong. Please try again.';
};


