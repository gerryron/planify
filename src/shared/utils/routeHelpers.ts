/**
 * Shared route helper utilities.
 *
 * Extracted from duplicated inline definitions across:
 * - src/app/api/wallets/route.ts
 * - src/app/api/wallets/transfer/route.ts
 * - src/app/api/cash-log/route.ts
 * - src/app/api/categories/route.ts
 * - src/app/api/monthly-budget/route.ts
 */

/**
 * Parse an unknown value into a positive integer ID.
 * Accepts numbers and numeric strings. Returns null for invalid input.
 */
export function toId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

/**
 * Parse an unknown value into a number.
 * Accepts numbers and numeric strings. Returns NaN for invalid input.
 */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}
