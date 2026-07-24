/**
 * Shared currency formatting utilities.
 *
 * Replaces 13+ inline `toLocaleString('id-ID')` + `"Rp "` calls
 * with a single consistent formatter.
 */

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  compactDisplay: 'short',
});

/**
 * Format a number as Indonesian Rupiah currency string.
 *
 * @example formatRupiah(15000) // "Rp 15.000"
 * @example formatRupiah(1500000, { compact: true }) // "Rp 1,5 jt"
 */
export function formatRupiah(
  amount: number,
  options?: { compact?: boolean },
): string {
  if (options?.compact) {
    return `Rp ${compactFormatter.format(amount)}`;
  }
  return currencyFormatter.format(amount);
}
