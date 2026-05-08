const AUTH_ERROR_MAP = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/popup-closed-by-user': null,
  'auth/cancelled-popup-request': null,
};

export function getAuthErrorMessage(code) {
  const mapped = AUTH_ERROR_MAP[code];
  if (mapped === null) return null;
  return mapped ?? 'Something went wrong. Please try again.';
}
