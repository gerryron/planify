import { toId, toNumber } from './routeHelpers';

describe('toId', () => {
  it('returns the same number for a positive integer number', () => {
    expect(toId(42)).toBe(42);
    expect(toId(1)).toBe(1);
    expect(toId(999)).toBe(999);
  });

  it('parses a positive integer string into a number', () => {
    expect(toId('42')).toBe(42);
    expect(toId('1')).toBe(1);
    expect(toId('999')).toBe(999);
  });

  it('returns null for the string "0"', () => {
    expect(toId('0')).toBeNull();
  });

  it('returns null for a negative number', () => {
    expect(toId(-1)).toBeNull();
    expect(toId(-100)).toBeNull();
  });

  it('returns null for a float', () => {
    expect(toId(3.14)).toBeNull();
    expect(toId(0.5)).toBeNull();
  });

  it('returns null for null, undefined, empty string, and non-numeric strings', () => {
    expect(toId(null)).toBeNull();
    expect(toId(undefined)).toBeNull();
    expect(toId('')).toBeNull();
    expect(toId('abc')).toBeNull();
    expect(toId('   ')).toBeNull();
  });
});

describe('toNumber', () => {
  it('returns the same number for a valid number', () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber(3.14)).toBe(3.14);
    expect(toNumber(-5)).toBe(-5);
    expect(toNumber(0)).toBe(0);
  });

  it('parses a valid numeric string into a number', () => {
    expect(toNumber('42')).toBe(42);
    expect(toNumber('0')).toBe(0);
    expect(toNumber('-5')).toBe(-5);
  });

  it('parses a float string into a float', () => {
    expect(toNumber('3.14')).toBe(3.14);
    expect(toNumber('0.5')).toBe(0.5);
  });

  it('returns NaN for null, undefined, empty string, and non-numeric strings', () => {
    expect(toNumber(null)).toBeNaN();
    expect(toNumber(undefined)).toBeNaN();
    expect(toNumber('')).toBeNaN();
    expect(toNumber('abc')).toBeNaN();
    expect(toNumber('   ')).toBeNaN();
  });
});
