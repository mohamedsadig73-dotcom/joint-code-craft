import { z } from 'zod';

// Strong password policy: minimum 10 chars, uppercase, lowercase, number, symbol
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/, 'Password must contain at least one special character');

export const emailSchema = z
  .string()
  .trim()
  .email('Invalid email address')
  .max(255, 'Email must be less than 255 characters');

export const usernameSchema = z
  .string()
  .trim()
  .min(2, 'Username must be at least 2 characters')
  .max(50, 'Username must be less than 50 characters')
  .regex(/^[a-zA-Z0-9_\u0600-\u06FF\s]+$/, 'Username can only contain letters, numbers, underscores, and Arabic characters');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

// Validation helper that returns localized error messages
export function validatePassword(password: string, t: (key: string) => string): string[] {
  const errors: string[] = [];
  
  if (password.length < 10) {
    errors.push(t('passwordMinLength'));
  }
  if (!/[A-Z]/.test(password)) {
    errors.push(t('passwordUppercase'));
  }
  if (!/[a-z]/.test(password)) {
    errors.push(t('passwordLowercase'));
  }
  if (!/[0-9]/.test(password)) {
    errors.push(t('passwordNumber'));
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push(t('passwordSpecialChar'));
  }
  
  return errors;
}

export function getPasswordStrength(password: string): { score: number; label: string } {
  let score = 0;
  
  if (password.length >= 10) score++;
  if (password.length >= 14) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) score++;
  
  if (score <= 2) return { score, label: 'weak' };
  if (score <= 4) return { score, label: 'medium' };
  return { score, label: 'strong' };
}
