'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cashLogService,
  type CashLog,
} from '@/features/cash-log/services/cashLogService';
import {
  monthlyBudgetService,
  type Budget,
} from '@/features/monthly-budget/services/monthlyBudgetService';
import {
  walletsService,
  type Wallets,
} from '@/features/wallets/services/walletsService';
import { categoryService } from '@/features/categories/services/categoryService';
import type { Category } from '@/features/categories/types/category';
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
} from '../utils/dashboardCharts';
import { HIDDEN_VALUE } from '../components/TopExpenseTooltip';

// ---------------------------------------------------------------------------
// Types (extracted from DashboardView)
// ---------------------------------------------------------------------------

type DashboardMode = 'month' | 'summary';

type ExpenseChartItem = {
  name: string;
  amount: number;
  fill: string;
};

type ExpenseDrillMode = 'top' | 'other' | 'child';

type BudgetVsActualItem = {
  rowKey: string;
  categoryLabel: string;
  type: 'income' | 'outcome';
  category: string;
  budget: number;
  actual: number;
};

type CreditCardDueReminder = {
  id: number;
  name: string;
  dueDate: string;
  days: number;
  outstanding: number;
  severity: 'overdue' | 'due-soon' | 'upcoming';
};

type CreditCardCycleSummary = {
  id: number;
  name: string;
  cycleStart: string;
  cycleEnd: string;
  dueDate: string;
  spent: number;
  paid: number;
  netChange: number;
  outstanding: number;
  creditLimit: number;
  remainingLimit: number;
  utilization: number;
};

type CreditCardMonthMetric = {
  month: string;
  label: string;
  billed: number;
  paid: number;
  carryover: number;
  cycleUtilization: number;
  paymentCoverage: number;
  onTrack: boolean;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDashboardData() {
  const DASHBOARD_SNAPSHOT_KEY = 'dashboard-offline-snapshot-v1';
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // ─── Filter / UI state ───
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedWalletId, setSelectedWalletId] = useState<'all' | number>('all');
  const [showNominal, setShowNominal] = useState(true);
  const [mode, setMode] = useState<DashboardMode>('month');
  const [isDark, setIsDark] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [showDailyIncome, setShowDailyIncome] = useState(true);
  const [showDailyOutcome, setShowDailyOutcome] = useState(true);
  const [showDailyTrend, setShowDailyTrend] = useState(true);
  const [selectedMonthlyParent, setSelectedMonthlyParent] = useState<string | null>(null);
  const [monthlyExpenseDrillMode, setMonthlyExpenseDrillMode] = useState<ExpenseDrillMode>('top');
  const [monthlyChildFromOther, setMonthlyChildFromOther] = useState(false);
  const [selectedSummaryParent, setSelectedSummaryParent] = useState<string | null>(null);
  const [summaryExpenseDrillMode, setSummaryExpenseDrillMode] = useState<ExpenseDrillMode>('top');
  const [summaryChildFromOther, setSummaryChildFromOther] = useState(false);
  const [budgetVsActualPageRaw, setBudgetVsActualPageRaw] = useState(0);

  // ─── Raw data ───
  const [wallets, setWallets] = useState<Wallets[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [cashLogs, setCashLogs] = useState<CashLog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // ─── Theme detection ───
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncTheme = () => {
      const rootDark = document.documentElement.classList.contains('dark');
      const bodyDark = document.body.classList.contains('theme-dark');
      setIsDark(rootDark || bodyDark);
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // ─── Mobile viewport detection ───
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const applyViewportMode = (event: MediaQueryList | MediaQueryListEvent) =>
      setIsMobileViewport(event.matches);

    applyViewportMode(mediaQuery);

    const listener = (event: MediaQueryListEvent) => applyViewportMode(event);
    mediaQuery.addEventListener('change', listener);

    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // ─── Data fetching ───
  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      setLoadingData(true);
      setDataError(null);

      try {
        const [walletsData, budgetsData, logsData, categoriesData] =
          await Promise.all([
            walletsService.getAll(),
            monthlyBudgetService.getAll(),
            cashLogService.getAll(),
            categoryService.getAll(),
          ]);

        if (!isMounted) return;
        setWallets(walletsData);
        setBudgets(budgetsData);
        setCashLogs(logsData);
        setCategories(categoriesData);
      } catch {
        if (!isMounted) return;
        setDataError('Failed to load dashboard data');
      } finally {
        if (!isMounted) return;
        setLoadingData(false);
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Offline snapshot ───
  useEffect(() => {
    if (typeof window === 'undefined' || loadingData || dataError) {
      return;
    }

    const monthLogs = getMonthLogs(cashLogs, selectedMonth);
    const income = calcIncome(monthLogs);
    const outcome = calcOutcome(monthLogs);
    const totalAssets = wallets
      .filter(
        (wallet) =>
          !wallet.excludeFromTotal &&
          wallet.walletKind !== 'goal' &&
          wallet.walletKind !== 'credit_card',
      )
      .reduce((sum, wallet) => sum + wallet.balance, 0);
    const totalDebt = wallets
      .filter((wallet) => wallet.walletKind === 'credit_card')
      .reduce((sum, wallet) => sum + wallet.balance, 0);
    const walletTotal = totalAssets - totalDebt;

    const snapshot = {
      month: selectedMonth,
      income,
      outcome,
      net: income - outcome,
      totalAssets,
      totalDebt,
      netWorth: walletTotal,
      walletTotal,
      savedAt: new Date().toLocaleString('id-ID'),
    };

    localStorage.setItem(DASHBOARD_SNAPSHOT_KEY, JSON.stringify(snapshot));
  }, [cashLogs, dataError, loadingData, selectedMonth, wallets]);

  // ─── Grouped wallets ───
  const groupedWallets = useMemo(() => {
    const included = wallets.filter(
      (wallet) =>
        !wallet.excludeFromTotal &&
        wallet.walletKind !== 'goal' &&
        wallet.walletKind !== 'credit_card',
    );
    const excluded = wallets.filter(
      (wallet) =>
        wallet.excludeFromTotal ||
        wallet.walletKind === 'goal' ||
        wallet.walletKind === 'credit_card',
    );

    return { included, excluded };
  }, [wallets]);

  const selectedWallet = useMemo(
    () =>
      selectedWalletId === 'all'
        ? null
        : (wallets.find((wallet) => wallet.id === selectedWalletId) ?? null),
    [selectedWalletId, wallets],
  );

  const filteredCashLogs = useMemo(() => {
    if (!selectedWallet) return cashLogs;
    return cashLogs.filter((log) => log.walletName === selectedWallet.name);
  }, [cashLogs, selectedWallet]);

  const monthLogs = useMemo(
    () => getMonthLogs(filteredCashLogs, selectedMonth),
    [filteredCashLogs, selectedMonth],
  );
  const monthBudgets = useMemo(
    () => getMonthBudgets(budgets, selectedMonth),
    [budgets, selectedMonth],
  );

  const totalIncome = useMemo(() => calcIncome(monthLogs), [monthLogs]);
  const totalOutcome = useMemo(() => calcOutcome(monthLogs), [monthLogs]);
  const netBalance = totalIncome - totalOutcome;
  const txCount = monthLogs.length;

  const totalAssets = useMemo(() => {
    if (selectedWallet) {
      if (selectedWallet.walletKind === 'credit_card') return 0;
      if (selectedWallet.walletKind === 'goal') return 0;
      if (selectedWallet.excludeFromTotal) return 0;
      return selectedWallet.balance;
    }

    return wallets
      .filter(
        (wallet) =>
          !wallet.excludeFromTotal &&
          wallet.walletKind !== 'goal' &&
          wallet.walletKind !== 'credit_card',
      )
      .reduce((sum, wallet) => sum + wallet.balance, 0);
  }, [selectedWallet, wallets]);

  const totalDebt = useMemo(() => {
    if (selectedWallet) {
      return selectedWallet.walletKind === 'credit_card'
        ? selectedWallet.balance
        : 0;
    }

    return wallets
      .filter((wallet) => wallet.walletKind === 'credit_card')
      .reduce((sum, wallet) => sum + wallet.balance, 0);
  }, [selectedWallet, wallets]);

  const netWorth = totalAssets - totalDebt;

  // ─── 6-month trend ───
  const trendMonths = useMemo(
    () => getRecentMonths(6, selectedMonth),
    [selectedMonth],
  );
  const monthlyTrend = useMemo(
    () =>
      trendMonths.map((m) => {
        const logs = getMonthLogs(filteredCashLogs, m);
        const inc = calcIncome(logs);
        const out = calcOutcome(logs);
        return {
          month: m,
          label: shortMonthLabel(m),
          income: inc,
          outcome: out,
          net: inc - out,
        };
      }),
    [filteredCashLogs, trendMonths],
  );

  const avgIncome6Months = useMemo(() => {
    if (!monthlyTrend.length) return 0;
    return (
      monthlyTrend.reduce((sum, item) => sum + item.income, 0) /
      monthlyTrend.length
    );
  }, [monthlyTrend]);

  const avgOutcome6Months = useMemo(() => {
    if (!monthlyTrend.length) return 0;
    return (
      monthlyTrend.reduce((sum, item) => sum + item.outcome, 0) /
      monthlyTrend.length
    );
  }, [monthlyTrend]);

  const net6Months = useMemo(
    () => monthlyTrend.reduce((sum, item) => sum + item.net, 0),
    [monthlyTrend],
  );

  // ─── Credit card metrics ───
  const creditCardMonths6 = useMemo<CreditCardMonthMetric[]>(() => {
    const eligibleCards = wallets.filter(
      (wallet) =>
        wallet.walletKind === 'credit_card' &&
        (!selectedWallet || wallet.id === selectedWallet.id) &&
        Number.isInteger(wallet.statementDay) &&
        Number.isInteger(wallet.dueDay) &&
        Number(wallet.statementDay) > 0 &&
        Number(wallet.dueDay) > 0 &&
        Number(wallet.creditLimit) > 0,
    );

    return trendMonths.map((month) => {
      const totals = eligibleCards.reduce(
        (acc, wallet) => {
          const cycleWindow = getCycleWindow(month, Number(wallet.statementDay));
          const dueDate = getDateWithSafeDay(
            cycleWindow.cycleEndDate.getFullYear(),
            cycleWindow.cycleEndDate.getMonth() + 1,
            Number(wallet.dueDay),
          );
          const dueDateIso = toIsoDate(dueDate);

          const cycleLogs = cashLogs.filter(
            (log) =>
              log.walletName === wallet.name &&
              !log.excludeFromReport &&
              log.date >= cycleWindow.cycleStart &&
              log.date <= cycleWindow.cycleEnd,
          );

          const paymentLogs = cashLogs.filter(
            (log) =>
              log.walletName === wallet.name &&
              !log.excludeFromReport &&
              log.date >= cycleWindow.cycleEnd &&
              log.date <= dueDateIso,
          );

          const billed = cycleLogs
            .filter((log) => log.category?.type === 'outcome')
            .reduce((sum, log) => sum + log.amount, 0);
          const paid = paymentLogs
            .filter((log) => log.category?.type === 'income')
            .reduce((sum, log) => sum + log.amount, 0);

          acc.billed += billed;
          acc.paid += paid;
          acc.limit += Number(wallet.creditLimit);
          return acc;
        },
        { billed: 0, paid: 0, limit: 0 },
      );

      const carryover = Math.max(totals.billed - totals.paid, 0);
      const cycleUtilization =
        totals.limit > 0
          ? Math.min((totals.billed / totals.limit) * 100, 100)
          : 0;
      const paymentCoverage =
        totals.billed > 0
          ? Math.min((totals.paid / totals.billed) * 100, 999)
          : 100;

      return {
        month,
        label: shortMonthLabel(month),
        billed: totals.billed,
        paid: totals.paid,
        carryover,
        cycleUtilization,
        paymentCoverage,
        onTrack: totals.billed > 0 && totals.paid >= totals.billed,
      };
    });
  }, [cashLogs, selectedWallet, trendMonths, wallets]);

  const paymentDisciplineSummary = useMemo(() => {
    const activeMonths = creditCardMonths6.filter(
      (item) => item.billed > 0 || item.paid > 0,
    );
    const onTrackMonths = activeMonths.filter((item) => item.onTrack).length;
    const atRiskMonths = activeMonths.filter((item) => item.carryover > 0).length;
    const totalBilled = activeMonths.reduce((sum, item) => sum + item.billed, 0);
    const totalPaid = activeMonths.reduce((sum, item) => sum + item.paid, 0);
    const avgCoverage =
      totalBilled > 0 ? Math.min((totalPaid / totalBilled) * 100, 999) : 100;

    return {
      activeMonths: activeMonths.length,
      onTrackMonths,
      atRiskMonths,
      avgCoverage,
      totalBilled,
      totalPaid,
    };
  }, [creditCardMonths6]);

  // ─── Cumulative balance trend ───
  const balanceTrend = useMemo(() => {
    const result: Array<(typeof monthlyTrend)[number] & { balance: number }> = [];
    let acc = 0;
    for (const m of monthlyTrend) {
      acc += m.net;
      result.push({ ...m, balance: acc });
    }
    return result;
  }, [monthlyTrend]);

  // ─── Monthly expense maps ───
  const monthlyParentExpenseMap = useMemo(() => {
    const map: Record<string, number> = {};
    monthLogs
      .filter((l) => l.category?.type === 'outcome' && !l.excludeFromReport)
      .forEach((log) => {
        const { parentName } = getOutcomeCategoryLabels(log, categories);
        map[parentName] = (map[parentName] || 0) + log.amount;
      });

    return map;
  }, [monthLogs, categories]);

  const monthlyAllParentExpenses = useMemo<ExpenseChartItem[]>(() => {
    return buildAllExpenses(monthlyParentExpenseMap);
  }, [monthlyParentExpenseMap]);

  const monthlyTopParentExpenses = useMemo<ExpenseChartItem[]>(() => {
    return buildTop5WithOther(monthlyParentExpenseMap);
  }, [monthlyParentExpenseMap]);

  const monthlyOtherParentExpenses = useMemo<ExpenseChartItem[]>(() => {
    return monthlyAllParentExpenses.length > 5
      ? monthlyAllParentExpenses.slice(5)
      : [];
  }, [monthlyAllParentExpenses]);

  const monthlyChildExpenses = useMemo<ExpenseChartItem[]>(() => {
    if (!selectedMonthlyParent) return [];

    const map: Record<string, number> = {};
    monthLogs
      .filter((l) => l.category?.type === 'outcome' && !l.excludeFromReport)
      .forEach((log) => {
        const { parentName, childName } = getOutcomeCategoryLabels(log, categories);
        if (parentName !== selectedMonthlyParent) return;
        map[childName] = (map[childName] || 0) + log.amount;
      });

    return buildAllExpenses(map);
  }, [monthLogs, selectedMonthlyParent, categories]);

  // ─── Daily trend ───
  const dailyTrend = useMemo(() => {
    const incomeMap: Record<string, number> = {};
    const outcomeMap: Record<string, number> = {};

    monthLogs
      .filter((log) => !log.excludeFromReport)
      .forEach((log) => {
        const day = log.date.slice(-2);
        if (log.category?.type === 'income') {
          incomeMap[day] = (incomeMap[day] || 0) + log.amount;
        } else if (log.category?.type === 'outcome') {
          outcomeMap[day] = (outcomeMap[day] || 0) + log.amount;
        }
      });

    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNumber = i + 1;
      const day = String(dayNumber).padStart(2, '0');
      const fullDate = new Date(year, month - 1, dayNumber).toLocaleDateString(
        'en-US',
        { day: '2-digit', month: 'short', year: 'numeric' },
      );

      return {
        day,
        fullDate,
        income: incomeMap[day] || 0,
        incomeTrend: incomeMap[day] || 0,
        outcome: outcomeMap[day] || 0,
        outcomeTrend: -(outcomeMap[day] || 0),
      };
    });
  }, [monthLogs, selectedMonth]);

  const dailyIncomeMax = useMemo(() => {
    const maxValue = dailyTrend.reduce((max, item) => Math.max(max, item.income), 0);
    return Math.max(maxValue, 1);
  }, [dailyTrend]);

  const dailyOutcomeMax = useMemo(() => {
    const maxValue = dailyTrend.reduce((max, item) => Math.max(max, item.outcome), 0);
    return Math.max(maxValue, 1);
  }, [dailyTrend]);

  const dailyTrendMaxAbs = useMemo(
    () => Math.max(dailyIncomeMax, dailyOutcomeMax),
    [dailyIncomeMax, dailyOutcomeMax],
  );

  const monthlyExpenseChartData =
    monthlyExpenseDrillMode === 'child'
      ? monthlyChildExpenses
      : monthlyExpenseDrillMode === 'other'
        ? monthlyOtherParentExpenses
        : monthlyTopParentExpenses;

  const monthlyExpenseChartHeight = Math.max(360, monthlyExpenseChartData.length * 42);

  const selectedMonthlyParentAmount = useMemo(() => {
    if (!selectedMonthlyParent) return 0;
    return (
      monthlyAllParentExpenses.find((item) => item.name === selectedMonthlyParent)?.amount ?? 0
    );
  }, [monthlyAllParentExpenses, selectedMonthlyParent]);

  // ─── Summary expense maps ───
  const summaryParentExpenseMap = useMemo(() => {
    const monthSet = new Set(trendMonths);
    const expenseMap: Record<string, number> = {};

    filteredCashLogs
      .filter(
        (log) =>
          monthSet.has(log.date.slice(0, 7)) &&
          log.category?.type === 'outcome' &&
          !log.excludeFromReport,
      )
      .forEach((log) => {
        const { parentName } = getOutcomeCategoryLabels(log, categories);
        expenseMap[parentName] = (expenseMap[parentName] || 0) + log.amount;
      });

    return expenseMap;
  }, [filteredCashLogs, trendMonths, categories]);

  const summaryAllParentExpenses = useMemo<ExpenseChartItem[]>(() => {
    return buildAllExpenses(summaryParentExpenseMap);
  }, [summaryParentExpenseMap]);

  const summaryTopParentExpenses = useMemo<ExpenseChartItem[]>(() => {
    return buildTop5WithOther(summaryParentExpenseMap);
  }, [summaryParentExpenseMap]);

  const summaryOtherParentExpenses = useMemo<ExpenseChartItem[]>(() => {
    return summaryAllParentExpenses.length > 5
      ? summaryAllParentExpenses.slice(5)
      : [];
  }, [summaryAllParentExpenses]);

  const summaryChildExpenses = useMemo<ExpenseChartItem[]>(() => {
    if (!selectedSummaryParent) return [];

    const monthSet = new Set(trendMonths);
    const expenseMap: Record<string, number> = {};

    filteredCashLogs
      .filter(
        (log) =>
          monthSet.has(log.date.slice(0, 7)) &&
          log.category?.type === 'outcome' &&
          !log.excludeFromReport,
      )
      .forEach((log) => {
        const { parentName, childName } = getOutcomeCategoryLabels(log, categories);
        if (parentName !== selectedSummaryParent) return;
        expenseMap[childName] = (expenseMap[childName] || 0) + log.amount;
      });

    return buildAllExpenses(expenseMap);
  }, [filteredCashLogs, selectedSummaryParent, trendMonths, categories]);

  const summaryExpenseChartData =
    summaryExpenseDrillMode === 'child'
      ? summaryChildExpenses
      : summaryExpenseDrillMode === 'other'
        ? summaryOtherParentExpenses
        : summaryTopParentExpenses;

  const summaryExpenseChartHeight = Math.max(280, summaryExpenseChartData.length * 42);

  const selectedSummaryParentAmount = useMemo(() => {
    if (!selectedSummaryParent) return 0;
    return (
      summaryAllParentExpenses.find((item) => item.name === selectedSummaryParent)?.amount ?? 0
    );
  }, [selectedSummaryParent, summaryAllParentExpenses]);

  // ─── Budget vs Actual ───
  const budgetVsActual = useMemo<BudgetVsActualItem[]>(() => {
    const getPriority = (item: { budget: number; actual: number }) => {
      if (item.budget > 0 && item.actual > 0) return 0;
      if (item.budget > 0 && item.actual === 0) return 1;
      if (item.budget === 0 && item.actual > 0) return 2;
      return 3;
    };

    const makeGroup = (type: 'income' | 'outcome') => {
      const budgetMap: Record<string, number> = {};
      monthBudgets
        .filter((budget) =>
          type === 'income'
            ? budget.type === 'income' || budget.type === 'carryover'
            : budget.type === 'outcome',
        )
        .forEach((budget) => {
          const parentCategory = getBudgetParentCategoryName(
            budget.category,
            type,
            categories,
          );
          budgetMap[parentCategory] = (budgetMap[parentCategory] || 0) + budget.amount;
        });

      const actualMap: Record<string, number> = {};
      monthLogs
        .filter((log) => log.category?.type === type && !log.excludeFromReport)
        .forEach((log) => {
          const key =
            type === 'outcome'
              ? getOutcomeCategoryLabels(log, categories).parentName
              : getLogParentCategoryName(log, categories);
          actualMap[key] = (actualMap[key] || 0) + log.amount;
        });

      const allCategories = new Set([
        ...Object.keys(budgetMap),
        ...Object.keys(actualMap),
      ]);

      return Array.from(allCategories)
        .map((category) => ({
          rowKey: `${type}:${category}`,
          categoryLabel: category,
          type,
          category,
          budget: budgetMap[category] || 0,
          actual: actualMap[category] || 0,
        }))
        .sort((a, b) => {
          const priorityDiff = getPriority(a) - getPriority(b);
          if (priorityDiff !== 0) return priorityDiff;
          if (b.budget !== a.budget) return b.budget - a.budget;
          if (b.actual !== a.actual) return b.actual - a.actual;
          return a.category.localeCompare(b.category);
        });
    };

    return [...makeGroup('income'), ...makeGroup('outcome')].sort((a, b) => {
      const priorityDiff = getPriority(a) - getPriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      if (b.budget !== a.budget) return b.budget - a.budget;
      if (b.actual !== a.actual) return b.actual - a.actual;
      return a.category.localeCompare(b.category);
    });
  }, [monthBudgets, monthLogs, categories]);

  const budgetVsActualPageSize = 5;
  const budgetVsActualTotalPages = Math.max(
    1,
    Math.ceil(budgetVsActual.length / budgetVsActualPageSize),
  );
  const budgetVsActualPage = Math.min(budgetVsActualPageRaw, budgetVsActualTotalPages - 1);
  const budgetVsActualVisible = useMemo(() => {
    const start = budgetVsActualPage * budgetVsActualPageSize;
    return budgetVsActual.slice(start, start + budgetVsActualPageSize);
  }, [budgetVsActual, budgetVsActualPage]);

  const isSingleBudgetVsActualRow = budgetVsActualVisible.length === 1;
  const hasBudgetSeriesValue = budgetVsActualVisible.some((item) => item.budget > 0);
  const hasActualSeriesValue = budgetVsActualVisible.some((item) => item.actual > 0);

  const budgetVsActualVisibleMap = useMemo(
    () => new Map(budgetVsActualVisible.map((item) => [item.rowKey, item])),
    [budgetVsActualVisible],
  );

  // ─── Recent transactions ───
  const recentTransactions = useMemo(
    () =>
      [...monthLogs]
        .sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.id - a.id;
        })
        .slice(0, 10),
    [monthLogs],
  );

  const totalBudget = useMemo(
    () =>
      monthBudgets.reduce(
        (s, b) =>
          s + (b.type === 'income' || b.type === 'carryover' ? b.amount : -b.amount),
        0,
      ),
    [monthBudgets],
  );

  // ─── Credit card wallets ───
  const creditCardWallets = useMemo(
    () =>
      wallets.filter(
        (wallet) =>
          wallet.walletKind === 'credit_card' &&
          (!selectedWallet || wallet.id === selectedWallet.id),
      ),
    [wallets, selectedWallet],
  );

  const creditCardDueReminders = useMemo<CreditCardDueReminder[]>(() => {
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    return creditCardWallets
      .filter(
        (wallet) =>
          wallet.balance > 0 &&
          Number.isInteger(wallet.dueDay) &&
          Number(wallet.dueDay) > 0,
      )
      .map((wallet) => {
        const dueDay = Number(wallet.dueDay);
        const thisMonthDue = getDateWithSafeDay(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          dueDay,
        );

        if (baseDate > thisMonthDue) {
          const overdueDays = Math.floor(
            (baseDate.getTime() - thisMonthDue.getTime()) / 86_400_000,
          );
          return {
            id: wallet.id,
            name: wallet.name,
            dueDate: toIsoDate(thisMonthDue),
            days: -overdueDays,
            outstanding: wallet.balance,
            severity: 'overdue' as const,
          };
        }

        const nextDueDate = getNextDueDate(baseDate, dueDay);
        const daysUntilDue = Math.floor(
          (nextDueDate.getTime() - baseDate.getTime()) / 86_400_000,
        );
        const severity: CreditCardDueReminder['severity'] =
          daysUntilDue <= 5 ? 'due-soon' : 'upcoming';

        return {
          id: wallet.id,
          name: wallet.name,
          dueDate: toIsoDate(nextDueDate),
          days: daysUntilDue,
          outstanding: wallet.balance,
          severity,
        };
      })
      .sort((a, b) => a.days - b.days);
  }, [creditCardWallets]);

  const creditCardCycleSummaries = useMemo<CreditCardCycleSummary[]>(() => {
    return creditCardWallets
      .filter(
        (wallet) =>
          Number.isInteger(wallet.statementDay) &&
          Number.isInteger(wallet.dueDay) &&
          Number(wallet.statementDay) > 0 &&
          Number(wallet.dueDay) > 0 &&
          Number(wallet.creditLimit) > 0,
      )
      .map((wallet) => {
        const cycleWindow = getCycleWindow(selectedMonth, Number(wallet.statementDay));
        const dueDate = getDateWithSafeDay(
          cycleWindow.cycleEndDate.getFullYear(),
          cycleWindow.cycleEndDate.getMonth() + 1,
          Number(wallet.dueDay),
        );

        const cycleLogs = cashLogs.filter(
          (log) =>
            log.walletName === wallet.name &&
            !log.excludeFromReport &&
            log.date >= cycleWindow.cycleStart &&
            log.date <= cycleWindow.cycleEnd,
        );

        const paymentLogs = cashLogs.filter(
          (log) =>
            log.walletName === wallet.name &&
            !log.excludeFromReport &&
            log.date >= cycleWindow.cycleEnd &&
            log.date <= toIsoDate(dueDate),
        );

        const spent = cycleLogs
          .filter((log) => log.category?.type === 'outcome')
          .reduce((sum, log) => sum + log.amount, 0);
        const paid = paymentLogs
          .filter((log) => log.category?.type === 'income')
          .reduce((sum, log) => sum + log.amount, 0);
        const netChange = spent - paid;
        const creditLimit = Number(wallet.creditLimit);
        const remainingLimit = Math.max(creditLimit - wallet.balance, 0);
        const utilization =
          creditLimit > 0
            ? Math.min((wallet.balance / creditLimit) * 100, 100)
            : 0;

        return {
          id: wallet.id,
          name: wallet.name,
          cycleStart: cycleWindow.cycleStart,
          cycleEnd: cycleWindow.cycleEnd,
          dueDate: toIsoDate(dueDate),
          spent,
          paid,
          netChange,
          outstanding: wallet.balance,
          creditLimit,
          remainingLimit,
          utilization,
        };
      })
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [cashLogs, creditCardWallets, selectedMonth]);

  // ─── Tooltip / chart style helpers ───
  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#fff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '8px',
    color: isDark ? '#e2e8f0' : '#1e293b',
  };

  const tooltipLabelStyle = {
    color: isDark ? '#e2e8f0' : '#1e293b',
  };

  const tooltipItemStyle = {
    color: isDark ? '#e2e8f0' : '#1e293b',
  };

  const chartTooltipCursor = isMobileViewport
    ? { fill: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(16, 185, 129, 0.12)' }
    : false;

  const mobileActiveBarStyle = {
    stroke: isDark ? '#cbd5e1' : '#0f172a',
    strokeWidth: isMobileViewport ? 2 : 1,
    strokeOpacity: isMobileViewport ? 0.6 : 0.3,
  };

  const smallActiveDot = { r: isMobileViewport ? 6 : 3, strokeWidth: isMobileViewport ? 2 : 1 };
  const mediumActiveDot = { r: isMobileViewport ? 7 : 5, strokeWidth: isMobileViewport ? 2 : 1 };
  const strongActiveDot = { r: isMobileViewport ? 8 : 6, strokeWidth: isMobileViewport ? 2 : 1 };

  // ─── Formatting helpers ───
  const val = useCallback(
    (v: number) => (showNominal ? formatCurrency(v) : HIDDEN_VALUE),
    [showNominal],
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currencyFormatter = useCallback(
    (value: any) => {
      if (value === undefined) return '';
      return showNominal ? formatCurrency(Number(value)) : HIDDEN_VALUE;
    },
    [showNominal],
  );

  // ─── Filter change handler ───
  const handleFilterChange = useCallback(() => {
    setBudgetVsActualPageRaw(0);
    setMonthlyExpenseDrillMode('top');
    setSelectedMonthlyParent(null);
    setMonthlyChildFromOther(false);
    setSummaryExpenseDrillMode('top');
    setSelectedSummaryParent(null);
    setSummaryChildFromOther(false);
  }, []);

  const handleMonthChange = useCallback(
    (value: string) => {
      setSelectedMonth(value);
      handleFilterChange();
    },
    [handleFilterChange],
  );

  const handleWalletChange = useCallback(
    (value: string) => {
      setSelectedWalletId(value === 'all' ? 'all' : Number(value));
      handleFilterChange();
    },
    [handleFilterChange],
  );

  return {
    // Loading / error
    loadingData,
    dataError,

    // UI state
    mode,
    setMode,
    selectedMonth,
    setSelectedMonth: handleMonthChange,
    selectedWalletId,
    setSelectedWalletId: handleWalletChange,
    showNominal,
    setShowNominal,
    isDark,
    isMobileViewport,

    // Raw data
    wallets,
    budgets,
    cashLogs,
    categories,

    // Wallet grouping
    groupedWallets,
    selectedWallet,

    // Monthly data
    monthLogs,
    monthBudgets,
    totalIncome,
    totalOutcome,
    netBalance,
    txCount,
    totalAssets,
    totalDebt,
    netWorth,
    totalBudget,

    // 6-month trend
    trendMonths,
    monthlyTrend,
    avgIncome6Months,
    avgOutcome6Months,
    net6Months,
    balanceTrend,

    // Credit card
    creditCardWallets,
    creditCardMonths6,
    creditCardDueReminders,
    creditCardCycleSummaries,
    paymentDisciplineSummary,

    // Expense charts
    monthlyExpenseChartData,
    monthlyExpenseChartHeight,
    monthlyTopParentExpenses,
    monthlyOtherParentExpenses,
    monthlyChildExpenses,
    monthlyExpenseDrillMode,
    setMonthlyExpenseDrillMode,
    selectedMonthlyParent,
    setSelectedMonthlyParent,
    selectedMonthlyParentAmount,
    monthlyChildFromOther,
    setMonthlyChildFromOther,

    summaryExpenseChartData,
    summaryExpenseChartHeight,
    summaryTopParentExpenses,
    summaryOtherParentExpenses,
    summaryChildExpenses,
    summaryExpenseDrillMode,
    setSummaryExpenseDrillMode,
    selectedSummaryParent,
    setSelectedSummaryParent,
    selectedSummaryParentAmount,
    summaryChildFromOther,
    setSummaryChildFromOther,

    // Daily trend
    dailyTrend,
    dailyIncomeMax,
    dailyOutcomeMax,
    dailyTrendMaxAbs,
    showDailyIncome,
    setShowDailyIncome,
    showDailyOutcome,
    setShowDailyOutcome,
    showDailyTrend,
    setShowDailyTrend,

    // Budget vs Actual
    budgetVsActual,
    budgetVsActualVisible,
    budgetVsActualPage,
    budgetVsActualTotalPages,
    budgetVsActualPageRaw,
    setBudgetVsActualPageRaw,
    isSingleBudgetVsActualRow,
    hasBudgetSeriesValue,
    hasActualSeriesValue,
    budgetVsActualVisibleMap,

    // Recent transactions
    recentTransactions,

    // Chart styling
    tooltipStyle,
    tooltipLabelStyle,
    tooltipItemStyle,
    chartTooltipCursor,
    mobileActiveBarStyle,
    smallActiveDot,
    mediumActiveDot,
    strongActiveDot,

    // Formatting
    val,
    currencyFormatter,
    HIDDEN_VALUE,
  };
}
