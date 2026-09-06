/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import type { CashLog } from '@/features/cash-log/services/cashLogService';
import type { Wallets } from '@/features/wallets/services/walletsService';
import { useDashboardCreditCards } from './useDashboardCreditCards';

const OUTCOME_CATEGORY = {
  id: 2,
  name: 'Food',
  type: 'outcome' as const,
  parentId: null,
};
const INCOME_CATEGORY = {
  id: 1,
  name: 'Transfer In',
  type: 'income' as const,
  parentId: null,
};

function makeWallet(overrides: Partial<Wallets> = {}): Wallets {
  return {
    id: 1,
    name: 'BCA Card',
    balance: 500000,
    excludeFromTotal: true,
    walletKind: 'credit_card',
    goalAmount: null,
    goalStartMonth: null,
    goalDueMonth: null,
    creditLimit: 5000000,
    statementDay: 20,
    dueDay: 10,
    ...overrides,
  };
}

function makeLog(overrides: Partial<CashLog> = {}): CashLog {
  return {
    id: 1,
    date: '2026-09-05',
    description: 'Transaction',
    amount: 100000,
    walletName: 'BCA Card',
    categoryId: OUTCOME_CATEGORY.id,
    excludeFromReport: false,
    category: OUTCOME_CATEGORY,
    ...overrides,
  };
}

const trendMonths = [
  { month: '2026-09', label: 'Sep 26', income: 100, outcome: 50, net: 50 },
  { month: '2026-10', label: 'Oct 26', income: 100, outcome: 50, net: 50 },
];

describe('useDashboardCreditCards', () => {
  beforeAll(() => {
    jest.useFakeTimers({ now: new Date(2026, 8, 6) });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should only include credit card wallets', () => {
    const basicWallet: Wallets = {
      id: 2,
      name: 'Cash',
      balance: 100000,
      excludeFromTotal: false,
      walletKind: 'basic',
      goalAmount: null,
      goalStartMonth: null,
      goalDueMonth: null,
      creditLimit: null,
      statementDay: null,
      dueDay: null,
    };

    const { result } = renderHook(() =>
      useDashboardCreditCards([makeWallet(), basicWallet], [], null, '2026-09', trendMonths),
    );

    expect(result.current.creditCardWallets.map((wallet) => wallet.id)).toEqual([1]);
  });

  it('should filter to the selected wallet when provided', () => {
    const { result } = renderHook(() =>
      useDashboardCreditCards(
        [makeWallet(), makeWallet({ id: 3, name: 'Other Card' })],
        [],
        makeWallet(),
        '2026-09',
        trendMonths,
      ),
    );

    expect(result.current.creditCardWallets.map((wallet) => wallet.id)).toEqual([1]);
  });

  it('should mark a due reminder as due-soon within 5 days', () => {
    const { result } = renderHook(() =>
      useDashboardCreditCards([makeWallet()], [], null, '2026-09', trendMonths),
    );

    const reminders = result.current.creditCardDueReminders;
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({
      name: 'BCA Card',
      dueDate: '2026-09-10',
      days: 4,
      outstanding: 500000,
      severity: 'due-soon',
    });
  });

  it('should mark a passed due day as overdue with negative days', () => {
    const { result } = renderHook(() =>
      useDashboardCreditCards(
        [makeWallet({ dueDay: 4 })],
        [],
        null,
        '2026-09',
        trendMonths,
      ),
    );

    const reminders = result.current.creditCardDueReminders;
    expect(reminders[0]).toMatchObject({
      dueDate: '2026-09-04',
      days: -2,
      severity: 'overdue',
    });
  });

  it('should mark a far due day as upcoming', () => {
    const { result } = renderHook(() =>
      useDashboardCreditCards(
        [makeWallet({ dueDay: 25 })],
        [],
        null,
        '2026-09',
        trendMonths,
      ),
    );

    expect(result.current.creditCardDueReminders[0]).toMatchObject({
      days: 19,
      severity: 'upcoming',
    });
  });

  it('should skip reminders for cards without an outstanding balance', () => {
    const { result } = renderHook(() =>
      useDashboardCreditCards(
        [makeWallet({ balance: 0 })],
        [],
        null,
        '2026-09',
        trendMonths,
      ),
    );

    expect(result.current.creditCardDueReminders).toEqual([]);
  });

  it('should compute cycle summaries from cash logs', () => {
    const logs: CashLog[] = [
      makeLog({ id: 1, date: '2026-09-05', amount: 100000 }),
      makeLog({
        id: 2,
        date: '2026-10-05',
        amount: 50000,
        category: INCOME_CATEGORY,
        categoryId: INCOME_CATEGORY.id,
      }),
      makeLog({ id: 3, date: '2026-08-10', amount: 99999 }),
      makeLog({ id: 4, date: '2026-09-10', amount: 40000, excludeFromReport: true }),
    ];

    const { result } = renderHook(() =>
      useDashboardCreditCards([makeWallet()], logs, null, '2026-09', trendMonths),
    );

    expect(result.current.creditCardCycleSummaries).toHaveLength(1);
    const summary = result.current.creditCardCycleSummaries[0];
    expect(summary).toMatchObject({
      cycleStart: '2026-08-21',
      cycleEnd: '2026-09-20',
      dueDate: '2026-10-10',
      spent: 100000,
      paid: 50000,
      netChange: 50000,
      outstanding: 500000,
      creditLimit: 5000000,
      remainingLimit: 4500000,
      utilization: 10,
    });
  });

  it('should aggregate 6-month metrics and payment discipline', () => {
    const logs: CashLog[] = [
      makeLog({ id: 1, date: '2026-09-05', amount: 100000 }),
      makeLog({
        id: 2,
        date: '2026-10-05',
        amount: 50000,
        category: INCOME_CATEGORY,
        categoryId: INCOME_CATEGORY.id,
      }),
    ];

    const { result } = renderHook(() =>
      useDashboardCreditCards([makeWallet()], logs, null, '2026-09', trendMonths),
    );

    expect(result.current.creditCardMonths6).toEqual([
      {
        month: '2026-09',
        label: 'Sep 26',
        billed: 100000,
        paid: 50000,
        carryover: 50000,
        cycleUtilization: 2,
        paymentCoverage: 50,
        onTrack: false,
      },
      {
        month: '2026-10',
        label: 'Oct 26',
        billed: 0,
        paid: 0,
        carryover: 0,
        cycleUtilization: 0,
        paymentCoverage: 100,
        onTrack: false,
      },
    ]);

    expect(result.current.paymentDisciplineSummary).toEqual({
      activeMonths: 1,
      onTrackMonths: 0,
      atRiskMonths: 1,
      avgCoverage: 50,
      totalBilled: 100000,
      totalPaid: 50000,
    });
  });

  it('should build a cumulative balance trend', () => {
    const { result } = renderHook(() =>
      useDashboardCreditCards([], [], null, '2026-09', trendMonths),
    );

    expect(result.current.balanceTrend).toEqual([
      { ...trendMonths[0], balance: 50 },
      { ...trendMonths[1], balance: 100 },
    ]);
  });
});
