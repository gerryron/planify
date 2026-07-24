// ---------------------------------------------------------------------------
// Unit tests for dashboard chart utility functions
// ---------------------------------------------------------------------------

import {
  formatCurrency,
  formatCompact,
  monthLabel,
  shortMonthLabel,
  toIsoDate,
  getDateWithSafeDay,
  getNextDueDate,
  getCycleWindow,
  buildTop5WithOther,
  buildAllExpenses,
  getOutcomeCategoryLabels,
  getBudgetParentCategoryName,
  getLogParentCategoryName,
  getMonthLogs,
  getMonthBudgets,
  calcIncome,
  calcOutcome,
  getRecentMonths,
} from './dashboardCharts';

import type { CashLog } from '@/features/cash-log/services/cashLogService';
import type { Budget } from '@/features/monthly-budget/services/monthlyBudgetService';
import type { Category } from '@/features/categories/types/category';

// ===========================================================================
// 1. formatCurrency
// ===========================================================================

describe('formatCurrency', () => {
  it('formats a normal value with IDR locale', () => {
    const result = formatCurrency(150000);
    expect(result).toContain('Rp');
    expect(result).toContain('150');
  });

  it('formats zero', () => {
    const result = formatCurrency(0);
    expect(result).toContain('Rp');
    expect(result).toContain('0');
  });

  it('formats a negative value', () => {
    const result = formatCurrency(-50000);
    expect(result).toContain('Rp');
    expect(result).toContain('50');
  });

  it('formats a large number with thousands separators', () => {
    const result = formatCurrency(1_200_000_000);
    expect(result).toContain('Rp');
    // should contain grouping separators for the billions range
    expect(result).toMatch(/1\./);
  });
});

// ===========================================================================
// 2. formatCompact
// ===========================================================================

describe('formatCompact', () => {
  it('returns the number as string for values under 1000', () => {
    expect(formatCompact(0)).toBe('0');
    expect(formatCompact(500)).toBe('500');
    expect(formatCompact(999)).toBe('999');
  });

  it('appends K for thousands', () => {
    expect(formatCompact(1000)).toBe('1K');
    expect(formatCompact(1499)).toBe('1K');
    expect(formatCompact(1500)).toBe('2K');
    expect(formatCompact(999_999)).toBe('1000K');
  });

  it('appends M for millions with one decimal', () => {
    expect(formatCompact(1_000_000)).toBe('1.0M');
    expect(formatCompact(1_500_000)).toBe('1.5M');
    expect(formatCompact(2_750_000)).toBe('2.8M');
    expect(formatCompact(999_999_999)).toBe('1000.0M');
  });

  it('handles negative values', () => {
    expect(formatCompact(-500)).toBe('-500');
    expect(formatCompact(-1_000)).toBe('-1K');
    expect(formatCompact(-1_500_000)).toBe('-1.5M');
  });
});

// ===========================================================================
// 3. monthLabel
// ===========================================================================

describe('monthLabel', () => {
  it('returns short month name and full year', () => {
    expect(monthLabel('2026-07')).toBe('Jul 2026');
    expect(monthLabel('2026-01')).toBe('Jan 2026');
    expect(monthLabel('2026-12')).toBe('Dec 2026');
    expect(monthLabel('2025-06')).toBe('Jun 2025');
  });
});

// ===========================================================================
// 4. shortMonthLabel
// ===========================================================================

describe('shortMonthLabel', () => {
  it('returns short month name and 2-digit year', () => {
    expect(shortMonthLabel('2026-07')).toBe('Jul 26');
    expect(shortMonthLabel('2026-01')).toBe('Jan 26');
    expect(shortMonthLabel('2026-12')).toBe('Dec 26');
    expect(shortMonthLabel('2025-06')).toBe('Jun 25');
    expect(shortMonthLabel('2000-03')).toBe('Mar 00');
  });
});

// ===========================================================================
// 5. toIsoDate
// ===========================================================================

describe('toIsoDate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 6, 15))).toBe('2026-07-15');
  });

  it('pads single-digit month and day', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('handles year boundary', () => {
    expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

// ===========================================================================
// 6. getDateWithSafeDay
// ===========================================================================

describe('getDateWithSafeDay', () => {
  it('returns the date when day is within the month range', () => {
    const d = getDateWithSafeDay(2026, 6, 15); // July 15, 2026
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(15);
  });

  it('clamps day to last day of month for Feb 29 in non-leap year', () => {
    const d = getDateWithSafeDay(2023, 1, 29); // Feb 2023 (non-leap)
    expect(d.getFullYear()).toBe(2023);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(28);
  });

  it('allows Feb 29 in a leap year', () => {
    const d = getDateWithSafeDay(2024, 1, 29); // Feb 2024 (leap)
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(29);
  });

  it('handles overflow month index (13 → Jan of next year)', () => {
    const d = getDateWithSafeDay(2024, 12, 1); // "month 13" → Jan 2025
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it('clamps day to 1 when day is 0', () => {
    const d = getDateWithSafeDay(2026, 6, 0);
    expect(d.getDate()).toBe(1);
  });
});

// ===========================================================================
// 7. getNextDueDate
// ===========================================================================

describe('getNextDueDate', () => {
  it('returns current month due date when base date is before or on due day', () => {
    const base = new Date(2026, 6, 10); // July 10, 2026
    const dueDay = 15;
    const result = getNextDueDate(base, dueDay);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(6);
    expect(result.getDate()).toBe(15);
  });

  it('returns current month due date when base date equals due day', () => {
    const base = new Date(2026, 6, 15); // July 15, 2026
    const dueDay = 15;
    const result = getNextDueDate(base, dueDay);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(6);
    expect(result.getDate()).toBe(15);
  });

  it('returns next month due date when base date is after due day', () => {
    const base = new Date(2026, 6, 20); // July 20, 2026
    const dueDay = 15;
    const result = getNextDueDate(base, dueDay);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(7); // August
    expect(result.getDate()).toBe(15);
  });

  it('handles year boundary correctly', () => {
    const base = new Date(2026, 11, 20); // Dec 20, 2026
    const dueDay = 10;
    const result = getNextDueDate(base, dueDay);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(10);
  });

  it('clamps due day to end of month when it exceeds month length', () => {
    const base = new Date(2025, 0, 15); // Jan 15, 2025
    const dueDay = 31;
    const result = getNextDueDate(base, dueDay);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(31); // Jan has 31 days — fine
  });
});

// ===========================================================================
// 8. getCycleWindow
// ===========================================================================

describe('getCycleWindow', () => {
  it('returns cycle start and end dates for the given month and statement day', () => {
    const result = getCycleWindow('2026-07', 15);
    expect(result.cycleStart).toBe('2026-06-16');
    expect(result.cycleEnd).toBe('2026-07-15');
    expect(result.cycleEndDate.getFullYear()).toBe(2026);
    expect(result.cycleEndDate.getMonth()).toBe(6);
    expect(result.cycleEndDate.getDate()).toBe(15);
  });

  it('handles January (previous month is December of prior year)', () => {
    const result = getCycleWindow('2026-01', 10);
    expect(result.cycleStart).toBe('2025-12-11');
    expect(result.cycleEnd).toBe('2026-01-10');
  });
});

// ===========================================================================
// 9. buildTop5WithOther
// ===========================================================================

describe('buildTop5WithOther', () => {
  const expectedColors = ['#ef4444', '#f59e0b'];

  it('returns all items when there are 5 or fewer', () => {
    const input = { Food: 50000, Transport: 30000 };
    const result = buildTop5WithOther(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'Food', amount: 50000, fill: expectedColors[0] });
    expect(result[1]).toEqual({ name: 'Transport', amount: 30000, fill: expectedColors[1] });
  });

  it('aggregates items beyond the top 5 into "Other"', () => {
    const input: Record<string, number> = {
      Food: 100, Rent: 90, Transport: 80, Entertainment: 70,
      Utilities: 60, Shopping: 50, Insurance: 40,
    };
    const result = buildTop5WithOther(input);
    expect(result).toHaveLength(6);
    // first 5 are the top items in descending order
    expect(result[0].name).toBe('Food');
    expect(result[1].name).toBe('Rent');
    expect(result[2].name).toBe('Transport');
    expect(result[3].name).toBe('Entertainment');
    expect(result[4].name).toBe('Utilities');
    // 6th entry is "Other" with sum of remaining
    expect(result[5].name).toBe('Other');
    expect(result[5].amount).toBe(90); // 50 + 40
  });

  it('returns empty array for empty input', () => {
    const result = buildTop5WithOther({});
    expect(result).toEqual([]);
  });

  it('handles a single item', () => {
    const result = buildTop5WithOther({ Food: 50000 });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Food');
    expect(result[0].amount).toBe(50000);
  });

  it('alternates colors correctly', () => {
    const input: Record<string, number> = {
      A: 6, B: 5, C: 4, D: 3, E: 2, F: 1,
    };
    const result = buildTop5WithOther(input);
    expect(result[0].fill).toBe(expectedColors[0]); // index 0 → color 0
    expect(result[1].fill).toBe(expectedColors[1]); // index 1 → color 1
    expect(result[2].fill).toBe(expectedColors[0]); // index 2 → color 0 (wrap)
    expect(result[3].fill).toBe(expectedColors[1]); // index 3 → color 1 (wrap)
    expect(result[4].fill).toBe(expectedColors[0]); // index 4 → color 0 (wrap)
    expect(result[5].fill).toBe(expectedColors[1]); // index 5 → color 1 (wrap)
  });
});

// ===========================================================================
// 10. buildAllExpenses
// ===========================================================================

describe('buildAllExpenses', () => {
  const expectedColors = ['#ef4444', '#f59e0b'];

  it('sorts items descending by amount and assigns alternating colors', () => {
    const input = { Transport: 30000, Food: 50000 };
    const result = buildAllExpenses(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'Food', amount: 50000, fill: expectedColors[0] });
    expect(result[1]).toEqual({ name: 'Transport', amount: 30000, fill: expectedColors[1] });
  });

  it('returns empty array for empty input', () => {
    const result = buildAllExpenses({});
    expect(result).toEqual([]);
  });

  it('handles a single item', () => {
    const result = buildAllExpenses({ Food: 50000 });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Food');
    expect(result[0].amount).toBe(50000);
  });

  it('alternates colors for many items', () => {
    const input: Record<string, number> = { A: 5, B: 4, C: 3, D: 2 };
    const result = buildAllExpenses(input);
    expect(result[0].fill).toBe(expectedColors[0]);
    expect(result[1].fill).toBe(expectedColors[1]);
    expect(result[2].fill).toBe(expectedColors[0]);
    expect(result[3].fill).toBe(expectedColors[1]);
  });
});

// ===========================================================================
// 11. getOutcomeCategoryLabels
// ===========================================================================

describe('getOutcomeCategoryLabels', () => {
  const categories: Category[] = [
    { id: 1, name: 'Food & Drink', type: 'outcome', parentId: null },
    { id: 2, name: 'Restaurant', type: 'outcome', parentId: 1 },
    { id: 3, name: 'Salary', type: 'income', parentId: null },
  ];

  const makeLog = (overrides: Partial<CashLog> = {}): CashLog => ({
    id: 1,
    date: '2026-07-15',
    description: 'test',
    amount: 50000,
    walletName: 'Cash',
    categoryId: 1,
    excludeFromReport: false,
    ...overrides,
  });

  it('returns parent and child names when category is a child outcome category', () => {
    const log = makeLog({
      category: { id: 2, name: 'Restaurant', type: 'outcome', parentId: 1 },
    });
    const result = getOutcomeCategoryLabels(log, categories);
    expect(result).toEqual({ parentName: 'Food & Drink', childName: 'Restaurant' });
  });

  it('returns category name as parent and "Other" as child when parentId is null', () => {
    const log = makeLog({
      category: { id: 1, name: 'Food & Drink', type: 'outcome', parentId: null },
    });
    const result = getOutcomeCategoryLabels(log, categories);
    expect(result).toEqual({ parentName: 'Food & Drink', childName: 'Other' });
  });

  it('returns "Other" for both when category type is income', () => {
    const log = makeLog({
      category: { id: 3, name: 'Salary', type: 'income', parentId: null },
    });
    const result = getOutcomeCategoryLabels(log, categories);
    expect(result).toEqual({ parentName: 'Other', childName: 'Other' });
  });

  it('returns "Other" for both when there is no category', () => {
    const log = makeLog({ category: null });
    const result = getOutcomeCategoryLabels(log, categories);
    expect(result).toEqual({ parentName: 'Other', childName: 'Other' });
  });

  it('falls back to category name when parent category is not found in the list', () => {
    const log = makeLog({
      category: { id: 99, name: 'Mystery', type: 'outcome', parentId: 999 },
    });
    const result = getOutcomeCategoryLabels(log, categories);
    expect(result).toEqual({ parentName: 'Mystery', childName: 'Mystery' });
  });
});

// ===========================================================================
// 12. getBudgetParentCategoryName
// ===========================================================================

describe('getBudgetParentCategoryName', () => {
  const categories: Category[] = [
    { id: 1, name: 'Food & Drink', type: 'outcome', parentId: null },
    { id: 2, name: 'Restaurant', type: 'outcome', parentId: 1 },
    { id: 3, name: 'Salary', type: 'income', parentId: null },
    { id: 4, name: 'Bonus', type: 'income', parentId: 3 },
  ];

  it('returns the parent category name when a matching child category exists', () => {
    const result = getBudgetParentCategoryName('Restaurant', 'outcome', categories);
    expect(result).toBe('Food & Drink');
  });

  it('returns the same name when the category is a top-level category', () => {
    const result = getBudgetParentCategoryName('Food & Drink', 'outcome', categories);
    expect(result).toBe('Food & Drink');
  });

  it('returns the category name when no matching category is found', () => {
    const result = getBudgetParentCategoryName('Unknown', 'outcome', categories);
    expect(result).toBe('Unknown');
  });

  it('returns parent name for income subcategory', () => {
    const result = getBudgetParentCategoryName('Bonus', 'income', categories);
    expect(result).toBe('Salary');
  });

  it('falls back to category name when parent category is not in the list', () => {
    const orphanCategories: Category[] = [
      { id: 10, name: 'Orphan', type: 'outcome', parentId: 999 },
    ];
    const result = getBudgetParentCategoryName('Orphan', 'outcome', orphanCategories);
    expect(result).toBe('Orphan');
  });
});

// ===========================================================================
// 13. getLogParentCategoryName
// ===========================================================================

describe('getLogParentCategoryName', () => {
  const categories: Category[] = [
    { id: 1, name: 'Food & Drink', type: 'outcome', parentId: null },
    { id: 2, name: 'Restaurant', type: 'outcome', parentId: 1 },
  ];

  const makeLog = (overrides: Partial<CashLog> = {}): CashLog => ({
    id: 1,
    date: '2026-07-15',
    description: 'test',
    amount: 50000,
    walletName: 'Cash',
    categoryId: 1,
    excludeFromReport: false,
    ...overrides,
  });

  it('returns parent category name for a child category', () => {
    const log = makeLog({
      category: { id: 2, name: 'Restaurant', type: 'outcome', parentId: 1 },
    });
    expect(getLogParentCategoryName(log, categories)).toBe('Food & Drink');
  });

  it('returns category name when parentId is null', () => {
    const log = makeLog({
      category: { id: 1, name: 'Food & Drink', type: 'outcome', parentId: null },
    });
    expect(getLogParentCategoryName(log, categories)).toBe('Food & Drink');
  });

  it('returns "Other" when there is no category', () => {
    const log = makeLog({ category: null });
    expect(getLogParentCategoryName(log, categories)).toBe('Other');
  });

  it('falls back to category name when parent is not found', () => {
    const log = makeLog({
      category: { id: 99, name: 'Mystery', type: 'outcome', parentId: 999 },
    });
    expect(getLogParentCategoryName(log, categories)).toBe('Mystery');
  });
});

// ===========================================================================
// 14. getMonthLogs
// ===========================================================================

describe('getMonthLogs', () => {
  const makeLog = (date: string, excludeFromReport = false): CashLog => ({
    id: 1,
    date,
    description: 'test',
    amount: 10000,
    walletName: 'Cash',
    categoryId: 1,
    excludeFromReport,
    category: { id: 1, name: 'Food', type: 'outcome', parentId: null },
  });

  it('filters logs matching the given month', () => {
    const logs = [makeLog('2026-07-01'), makeLog('2026-07-15'), makeLog('2026-08-01')];
    const result = getMonthLogs(logs, '2026-07');
    expect(result).toHaveLength(2);
  });

  it('excludes logs with excludeFromReport set to true', () => {
    const logs = [
      makeLog('2026-07-01', false),
      makeLog('2026-07-15', true),
    ];
    const result = getMonthLogs(logs, '2026-07');
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-07-01');
  });

  it('returns empty array when no logs match', () => {
    const logs = [makeLog('2026-08-01')];
    const result = getMonthLogs(logs, '2026-07');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    const result = getMonthLogs([], '2026-07');
    expect(result).toEqual([]);
  });
});

// ===========================================================================
// 15. getMonthBudgets
// ===========================================================================

describe('getMonthBudgets', () => {
  const makeBudget = (month: string): Budget => ({
    id: 1,
    month,
    categoryId: 1,
    amount: 500000,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it('filters budgets matching the given month', () => {
    const budgets = [makeBudget('2026-07'), makeBudget('2026-07'), makeBudget('2026-08')];
    const result = getMonthBudgets(budgets, '2026-07');
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no budgets match', () => {
    const budgets = [makeBudget('2026-08')];
    const result = getMonthBudgets(budgets, '2026-07');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    const result = getMonthBudgets([], '2026-07');
    expect(result).toEqual([]);
  });
});

// ===========================================================================
// 16. calcIncome
// ===========================================================================

describe('calcIncome', () => {
  const makeLog = (
    amount: number,
    type: 'income' | 'outcome' | null,
    excludeFromReport = false,
  ): CashLog => ({
    id: 1,
    date: '2026-07-01',
    description: 'test',
    amount,
    walletName: 'Cash',
    categoryId: 1,
    excludeFromReport,
    category: type ? { id: 1, name: 'Test', type, parentId: null } : null,
  });

  it('sums income logs', () => {
    const logs = [makeLog(50000, 'income'), makeLog(30000, 'income')];
    expect(calcIncome(logs)).toBe(80000);
  });

  it('excludes outcome logs from the sum', () => {
    const logs = [makeLog(50000, 'income'), makeLog(20000, 'outcome')];
    expect(calcIncome(logs)).toBe(50000);
  });

  it('excludes logs with excludeFromReport set to true', () => {
    const logs = [makeLog(50000, 'income', true), makeLog(30000, 'income')];
    expect(calcIncome(logs)).toBe(30000);
  });

  it('excludes logs with no category', () => {
    const logs = [makeLog(50000, null)];
    expect(calcIncome(logs)).toBe(0);
  });

  it('returns 0 for empty input', () => {
    expect(calcIncome([])).toBe(0);
  });
});

// ===========================================================================
// 17. calcOutcome
// ===========================================================================

describe('calcOutcome', () => {
  const makeLog = (
    amount: number,
    type: 'income' | 'outcome' | null,
    excludeFromReport = false,
  ): CashLog => ({
    id: 1,
    date: '2026-07-01',
    description: 'test',
    amount,
    walletName: 'Cash',
    categoryId: 1,
    excludeFromReport,
    category: type ? { id: 1, name: 'Test', type, parentId: null } : null,
  });

  it('sums outcome logs', () => {
    const logs = [makeLog(50000, 'outcome'), makeLog(30000, 'outcome')];
    expect(calcOutcome(logs)).toBe(80000);
  });

  it('excludes income logs from the sum', () => {
    const logs = [makeLog(50000, 'outcome'), makeLog(20000, 'income')];
    expect(calcOutcome(logs)).toBe(50000);
  });

  it('excludes logs with excludeFromReport set to true', () => {
    const logs = [makeLog(50000, 'outcome', true), makeLog(30000, 'outcome')];
    expect(calcOutcome(logs)).toBe(30000);
  });

  it('excludes logs with no category', () => {
    const logs = [makeLog(50000, null)];
    expect(calcOutcome(logs)).toBe(0);
  });

  it('returns 0 for empty input', () => {
    expect(calcOutcome([])).toBe(0);
  });
});

// ===========================================================================
// 18. getRecentMonths
// ===========================================================================

describe('getRecentMonths', () => {
  it('returns the requested number of months ending with the given month', () => {
    const result = getRecentMonths(3, '2026-07');
    expect(result).toHaveLength(3);
    expect(result).toEqual(['2026-05', '2026-06', '2026-07']);
  });

  it('returns a single month when count is 1', () => {
    const result = getRecentMonths(1, '2026-07');
    expect(result).toEqual(['2026-07']);
  });

  it('returns months in ascending chronological order', () => {
    const result = getRecentMonths(5, '2026-07');
    expect(result).toHaveLength(5);
    // verify ascending order
    for (let i = 1; i < result.length; i++) {
      expect(result[i] > result[i - 1]).toBe(true);
    }
  });

  it('handles year boundary correctly', () => {
    const result = getRecentMonths(3, '2026-01');
    expect(result).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('handles crossing into previous year', () => {
    const result = getRecentMonths(5, '2026-02');
    expect(result).toHaveLength(5);
    expect(result[0]).toBe('2025-10');
    expect(result[4]).toBe('2026-02');
  });
});
