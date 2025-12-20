import { describe, it, expect } from 'vitest';
import { validatePassword, getPasswordStrength } from '../authValidation';

// Mock translation function
const mockT = (key: string) => key;

describe('validatePassword', () => {
  it('should return no errors for a valid password', () => {
    const errors = validatePassword('MyP@ssw0rd!', mockT);
    expect(errors).toHaveLength(0);
  });

  it('should require minimum 10 characters', () => {
    const errors = validatePassword('Short1!', mockT);
    expect(errors).toContain('passwordMinLength');
  });

  it('should require uppercase letter', () => {
    const errors = validatePassword('mypassw0rd!', mockT);
    expect(errors).toContain('passwordUppercase');
  });

  it('should require lowercase letter', () => {
    const errors = validatePassword('MYPASSW0RD!', mockT);
    expect(errors).toContain('passwordLowercase');
  });

  it('should require number', () => {
    const errors = validatePassword('MyPassword!', mockT);
    expect(errors).toContain('passwordNumber');
  });

  it('should require special character', () => {
    const errors = validatePassword('MyPassw0rd1', mockT);
    expect(errors).toContain('passwordSpecialChar');
  });

  it('should return multiple errors for weak password', () => {
    const errors = validatePassword('weak', mockT);
    expect(errors.length).toBeGreaterThan(3);
  });
});

describe('getPasswordStrength', () => {
  it('should return weak for short password', () => {
    const result = getPasswordStrength('abc');
    expect(result.label).toBe('weak');
    expect(result.score).toBeLessThanOrEqual(2);
  });

  it('should return medium for moderate password', () => {
    const result = getPasswordStrength('Password1');
    expect(result.label).toBe('medium');
  });

  it('should return strong for complex password', () => {
    const result = getPasswordStrength('MyStr0ng!P@ssword');
    expect(result.label).toBe('strong');
    expect(result.score).toBeGreaterThanOrEqual(5);
  });

  it('should increase score for longer passwords', () => {
    const short = getPasswordStrength('Pass1!');
    const long = getPasswordStrength('MyVeryLongP@ssw0rd!');
    expect(long.score).toBeGreaterThan(short.score);
  });
});
