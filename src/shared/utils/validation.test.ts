import { isValidEmail } from './validation';

describe('isValidEmail', () => {
  it('returns true for "test@example.com"', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });

  it('returns true for "user@domain.co.id"', () => {
    expect(isValidEmail('user@domain.co.id')).toBe(true);
  });

  it('returns true for email with plus sign', () => {
    expect(isValidEmail('user+tag@domain.com')).toBe(true);
  });

  it('returns false for an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('returns false for a string without @', () => {
    expect(isValidEmail('notanemail')).toBe(false);
  });

  it('returns false for "@domain.com"', () => {
    expect(isValidEmail('@domain.com')).toBe(false);
  });

  it('returns false for "user@"', () => {
    expect(isValidEmail('user@')).toBe(false);
  });
});
