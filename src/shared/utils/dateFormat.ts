/**
 * Shared date formatting utilities.
 *
 * Extracted from duplicated definitions in:
 * - src/features/dashboard/utils/dashboardCharts.ts
 * - src/features/cash-log/components/CashLogList.tsx
 * - src/features/monthly-budget/components/MonthlyBudgetList.tsx
 * - Various form components
 */

/**
 * Format "YYYY-MM" to "Mon YYYY" (e.g., "2026-07" → "Jul 2026").
 */
export function monthLabel(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format "YYYY-MM" to "Mon" only (e.g., "2026-07" → "Jul").
 */
export function shortMonthLabel(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short' });
}

/**
 * Shift a base date by N months, returning "YYYY-MM" format.
 *
 * @param base Starting date
 * @param offset Number of months to add (negative = previous months)
 */
export function shiftMonth(base: Date, offset: number): string {
  const shifted = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get today's date as ISO date string "YYYY-MM-DD".
 */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Convert a Date object to ISO date string "YYYY-MM-DD".
 */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
