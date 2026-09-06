/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import type { Wallets } from '@/features/wallets/services/walletsService';
import type { Category } from '@/features/categories/types/category';
import type { CashLog } from '@/features/cash-log/services/cashLogService';
import type { BudgetResponse } from '@/features/monthly-budget/types/budget';
import { useDashboardData } from './useDashboardData';

// ---------------------------------------------------------------------------
// React Query hook mocks
// ---------------------------------------------------------------------------
type QueryResult<T> = { data: T; isLoading: boolean; error: Error | null };

const mockWalletsResult: QueryResult<Wallets[]> = {
  data: [],
  isLoading: false,
  error: null,
};
const mockCategoriesResult: QueryResult<Category[]> = {
  data: [],
  isLoading: false,
  error: null,
};
const mockCashLogsResult: QueryResult<CashLog[]> = {
  data: [],
  isLoading: false,
  error: null,
};
const mockBudgetsResult: QueryResult<BudgetResponse[]> = {
  data: [],
  isLoading: false,
  error: null,
};

jest.mock('@/features/wallets/hooks/useWallets', () => ({
  useWallets: () => mockWalletsResult,
}));
jest.mock('@/features/categories/hooks/useCategories', () => ({
  useCategories: () => mockCategoriesResult,
}));
jest.mock('@/features/cash-log/hooks/useCashLogs', () => ({
  useCashLogs: () => mockCashLogsResult,
}));
jest.mock('@/features/monthly-budget/hooks/useMonthlyBudgets', () => ({
  useMonthlyBudgets: () => mockBudgetsResult,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const CATEGORY_SALARY: Category = { id: 1, name: 'Salary', type: 'income', parentId: null };
const CATEGORY_FOOD: Category = { id: 2, name: 'Food', type: 'outcome', parentId: null };

const WALLET_CASH: Wallets = {
  id: 1,
  name: 'Cash',
  balance: 1000,
  excludeFromTotal: false,
  walletKind: 'basic',
  goalAmount: null,
  goalStartMonth: null,
  goalDueMonth: null,
  creditLimit: null,
  statementDay: null,
  dueDay: null,
};
const WALLET_GOAL: Wallets = {
  ...WALLET_CASH,
  id: 2,
  name: 'Goal',
  balance: 500,
  walletKind: 'goal',
  excludeFromTotal: true,
};
const WALLET_CARD: Wallets = {
  ...WALLET_CASH,
  id: 3,
  name: 'BCA Card',
  balance: 300,
  walletKind: 'credit_card',
  excludeFromTotal: true,
};

const LOG_SALARY: CashLog = {
  id: 1,
  date: '2026-09-05',
  description: 'Gaji',
  amount: 100,
  walletName: 'Cash',
  categoryId: 1,
  excludeFromReport: false,
  category: CATEGORY_SALARY,
};
const LOG_FOOD: CashLog = {
  id: 2,
  date: '2026-09-06',
  description: 'Makan',
  amount: 40,
  walletName: 'Cash',
  categoryId: 2,
  excludeFromReport: false,
  category: CATEGORY_FOOD,
};
const LOG_PREV_MONTH: CashLog = {
  id: 3,
  date: '2026-08-31',
  description: 'Bulan lalu',
  amount: 999,
  walletName: 'Cash',
  categoryId: 2,
  excludeFromReport: false,
  category: CATEGORY_FOOD,
};
const LOG_EXCLUDED: CashLog = {
  id: 4,
  date: '2026-09-07',
  description: 'Dikecualikan',
  amount: 25,
  walletName: 'Cash',
  categoryId: 2,
  excludeFromReport: true,
  category: CATEGORY_FOOD,
};

const BUDGET_SALARY: BudgetResponse = {
  id: 1,
  name: 'Gaji',
  amount: 1000,
  month: '2026-09',
  category: 'Salary',
  type: 'income',
  isDone: false,
};
const BUDGET_FOOD: BudgetResponse = {
  id: 2,
  name: 'Makan',
  amount: 200,
  month: '2026-09',
  category: 'Food',
  type: 'outcome',
  isDone: false,
};

const SNAPSHOT_KEY = 'dashboard-offline-snapshot-v1';

describe('useDashboardData', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(2026, 8, 6) });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    window.matchMedia = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }) as never;

    mockWalletsResult.data = [WALLET_CASH, WALLET_GOAL, WALLET_CARD];
    mockWalletsResult.isLoading = false;
    mockWalletsResult.error = null;
    mockCategoriesResult.data = [CATEGORY_SALARY, CATEGORY_FOOD];
    mockCategoriesResult.isLoading = false;
    mockCategoriesResult.error = null;
    mockCashLogsResult.data = [LOG_SALARY, LOG_FOOD, LOG_PREV_MONTH, LOG_EXCLUDED];
    mockCashLogsResult.isLoading = false;
    mockCashLogsResult.error = null;
    mockBudgetsResult.data = [BUDGET_SALARY, BUDGET_FOOD];
    mockBudgetsResult.isLoading = false;
    mockBudgetsResult.error = null;
    localStorage.clear();
  });

  it('should default to the current month', () => {
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.selectedMonth).toBe('2026-09');
  });

  it('should compute monthly income, outcome, net, and transaction count', () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.totalIncome).toBe(100);
    expect(result.current.totalOutcome).toBe(40);
    expect(result.current.netBalance).toBe(60);
    expect(result.current.txCount).toBe(2);
    expect(result.current.monthLogs.map((log) => log.id)).toEqual([1, 2]);
  });

  it('should group wallets into included and excluded', () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.groupedWallets.included.map((w) => w.id)).toEqual([1]);
    expect(result.current.groupedWallets.excluded.map((w) => w.id)).toEqual([2, 3]);
  });

  it('should compute assets, debt, and net worth', () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.totalAssets).toBe(1000);
    expect(result.current.totalDebt).toBe(300);
    expect(result.current.netWorth).toBe(700);
  });

  it('should build a 6-month trend ending at the selected month', () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.trendMonths).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
    expect(result.current.monthlyTrend[5]).toEqual({
      month: '2026-09',
      label: 'Sep 26',
      income: 100,
      outcome: 40,
      net: 60,
    });
    // August contains the 999 outcome log, so the 6-month net is -999 + 60.
    expect(result.current.net6Months).toBe(-939);
  });

  it('should sort recent transactions by date then id, newest first', () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.recentTransactions.map((log) => log.id)).toEqual([2, 1]);
  });

  it('should group budget vs actual by parent category and sort by priority', () => {
    const { result } = renderHook(() => useDashboardData());

    const rows = result.current.budgetVsActual;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      type: 'income',
      category: 'Salary',
      budget: 1000,
      actual: 100,
    });
    expect(rows[1]).toMatchObject({
      type: 'outcome',
      category: 'Food',
      budget: 200,
      actual: 40,
    });
    expect(result.current.totalBudget).toBe(800);
  });

  it('should write the offline snapshot when data is loaded', () => {
    renderHook(() => useDashboardData());

    const snapshot = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? '{}');
    expect(snapshot).toMatchObject({
      month: '2026-09',
      income: 100,
      outcome: 40,
      net: 60,
      totalAssets: 1000,
      totalDebt: 300,
      netWorth: 700,
    });
  });

  it('should switch month and reset drill-down state', () => {
    const { result } = renderHook(() => useDashboardData());

    act(() => {
      result.current.setSelectedMonthlyParent('Food');
      result.current.setMonthlyExpenseDrillMode('child');
    });

    act(() => {
      result.current.setSelectedMonth('2026-08');
    });

    expect(result.current.selectedMonth).toBe('2026-08');
    expect(result.current.totalIncome).toBe(0);
    expect(result.current.selectedMonthlyParent).toBeNull();
    expect(result.current.monthlyExpenseDrillMode).toBe('top');
  });

  it('should filter cash logs and totals by selected wallet', () => {
    const { result } = renderHook(() => useDashboardData());

    act(() => {
      result.current.setSelectedWalletId('3');
    });

    expect(result.current.selectedWalletId).toBe(3);
    expect(result.current.selectedWallet?.name).toBe('BCA Card');
    expect(result.current.monthLogs).toEqual([]);
    expect(result.current.totalIncome).toBe(0);
    expect(result.current.totalAssets).toBe(0);
    expect(result.current.totalDebt).toBe(300);
  });

  it('should expose the hidden value formatter', () => {
    const { result } = renderHook(() => useDashboardData());

    // Intl.NumberFormat('id-ID') joins currency and value with a non-breaking space.
    expect(result.current.val(1000)).toBe('Rp 1.000');
    expect(result.current.currencyFormatter(null)).toBe('');

    act(() => {
      result.current.setShowNominal(false);
    });
    expect(result.current.val(1000)).toBe(result.current.HIDDEN_VALUE);
  });

  it('should report loading state while any query loads', () => {
    mockWalletsResult.isLoading = true;
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.loadingData).toBe(true);
  });

  it('should report a data error when any query fails', () => {
    mockCashLogsResult.error = new Error('boom');
    const { result } = renderHook(() => useDashboardData());
    expect(result.current.dataError).toBe('Failed to load dashboard data');
  });
});
