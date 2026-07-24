import { formatRupiah } from './currency';

// Intl.NumberFormat uses non-breaking spaces (U+00A0) as group separators
const NBSP = ' ';

describe('formatRupiah', () => {
  it('formats 15000 with thousand separator', () => {
    expect(formatRupiah(15000)).toBe(`Rp${NBSP}15.000`);
  });

  it('formats 0', () => {
    expect(formatRupiah(0)).toBe(`Rp${NBSP}0`);
  });

  it('formats 1000000', () => {
    expect(formatRupiah(1_000_000)).toBe(`Rp${NBSP}1.000.000`);
  });

  it('formats 500', () => {
    expect(formatRupiah(500)).toBe(`Rp${NBSP}500`);
  });

  it('formats 10000', () => {
    expect(formatRupiah(10000)).toBe(`Rp${NBSP}10.000`);
  });

  it('handles negative numbers', () => {
    expect(formatRupiah(-5000)).toBe(`-Rp${NBSP}5.000`);
  });

  it('formats with compact notation for large numbers', () => {
    const result = formatRupiah(1_500_000, { compact: true });
    expect(result).toMatch(/^Rp /);
  });
});
