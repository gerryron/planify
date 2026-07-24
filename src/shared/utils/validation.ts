/**
 * Shared validation utilities.
 *
 * Extracted from duplicated inline definitions across:
 * - src/app/api/auth/login/route.ts
 * - src/app/api/auth/register/route.ts
 */

/**
 * Validate an email address format.
 */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
