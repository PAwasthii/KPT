/**
 * Password Utility Functions
 * Handles password generation and validation
 */

/**
 * Generate a secure random password
 * @param length - Length of the password (default: 12)
 * @param options - Options for password complexity
 * @returns Generated password string
 */
export function generatePassword(
  length: number = 12,
  options: {
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSymbols?: boolean;
  } = {}
): string {
  const {
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
  } = options;

  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let characterPool = '';
  let password = '';

  // Build character pool based on options
  if (includeUppercase) characterPool += uppercase;
  if (includeLowercase) characterPool += lowercase;
  if (includeNumbers) characterPool += numbers;
  if (includeSymbols) characterPool += symbols;

  // Ensure at least one character set is included
  if (characterPool.length === 0) {
    characterPool = lowercase + numbers; // Default fallback
  }

  // Ensure password has at least one character from each selected type
  if (includeUppercase) {
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
  }
  if (includeLowercase) {
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
  }
  if (includeNumbers) {
    password += numbers[Math.floor(Math.random() * numbers.length)];
  }
  if (includeSymbols) {
    password += symbols[Math.floor(Math.random() * symbols.length)];
  }

  // Fill the rest of the password with random characters from the pool
  for (let i = password.length; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characterPool.length);
    password += characterPool[randomIndex];
  }

  // Shuffle the password to avoid predictable patterns
  password = password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');

  return password;
}

/**
 * Generate a secure password suitable for new user accounts
 * Returns a 6-character password with uppercase, lowercase, and numbers
 */
export function generateUserPassword(): string {
  return generatePassword(6, {
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: false,
  });
}

/**
 * Generate a simple memorable password (no symbols)
 * Useful for temporary passwords that users will change
 */
export function generateSimplePassword(length: number = 10): string {
  return generatePassword(length, {
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: false,
  });
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with validation result and strength score
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Check length
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else if (password.length >= 8 && password.length < 12) {
    score += 1;
  } else if (password.length >= 12) {
    score += 2;
  }

  // Check for uppercase
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain at least one uppercase letter');
  }

  // Check for lowercase
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain at least one lowercase letter');
  }

  // Check for numbers
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain at least one number');
  }

  // Check for symbols
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password should contain at least one special character');
  }

  // Check for common patterns
  const commonPatterns = ['12345', 'password', 'qwerty', 'abc123', '111111'];
  const lowerPassword = password.toLowerCase();
  for (const pattern of commonPatterns) {
    if (lowerPassword.includes(pattern)) {
      score -= 2;
      feedback.push('Password contains common patterns');
      break;
    }
  }

  // Minimum requirements: length >= 8 and score >= 4
  const isValid = password.length >= 8 && score >= 4;

  return {
    isValid,
    score: Math.max(0, score), // Ensure score doesn't go negative
    feedback,
  };
}

/**
 * Generate a random alphanumeric string (useful for tokens)
 */
export function generateRandomString(length: number = 32): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
