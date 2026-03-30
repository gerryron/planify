'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SavingsIcon from '@mui/icons-material/Savings';
import {
  BarChart,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

function monthLabel(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function shortMonthLabel(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

const EXPENSE_CATEGORY_COLORS = ['#ef4444', '#f59e0b'];

const HIDDEN_VALUE = '••••••';
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

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateWithSafeDay(
  year: number,
  monthIndex: number,
  day: number,
): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const safeDay = Math.max(1, Math.min(day, lastDay));
  return new Date(year, monthIndex, safeDay);
}

function getNextDueDate(baseDate: Date, dueDay: number): Date {
  const currentMonthDue = getDateWithSafeDay(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    dueDay,
  );

  if (baseDate <= currentMonthDue) {
    return currentMonthDue;
  }

  return getDateWithSafeDay(
    baseDate.getFullYear(),
    baseDate.getMonth() + 1,
    dueDay,
  );
}

function getCycleWindow(selectedMonth: string, statementDay: number) {
  const [yearText, monthText] = selectedMonth.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  const cycleEndDate = getDateWithSafeDay(year, monthIndex, statementDay);
  const previousStatementDate = getDateWithSafeDay(
    year,
    monthIndex - 1,
    statementDay,
  );
  const cycleStartDate = new Date(previousStatementDate);
  cycleStartDate.setDate(cycleStartDate.getDate() + 1);

  return {
    cycleStart: toIsoDate(cycleStartDate),
    cycleEnd: toIsoDate(cycleEndDate),
    cycleEndDate,
  };
}

function buildTop5WithOther(expenseMap: Record<string, number>) {
  const ranked = Object.entries(expenseMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const withAlternatingColors = (
    items: Array<{ name: string; amount: number }>,
  ) =>
    items.map((item, index) => ({
      ...item,
      fill: EXPENSE_CATEGORY_COLORS[index % EXPENSE_CATEGORY_COLORS.length],
    }));

  if (ranked.length <= 5) {
    return withAlternatingColors(ranked);
  }

  const topFive = ranked.slice(0, 5);
  const otherAmount = ranked
    .slice(5)
    .reduce((sum, item) => sum + item.amount, 0);

  return withAlternatingColors([
    ...topFive,
    {
      name: 'Other',
      amount: otherAmount,
    },
  ]);
}

function buildAllExpenses(expenseMap: Record<string, number>) {
  return Object.entries(expenseMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .map((item, index) => ({
      ...item,
      fill: EXPENSE_CATEGORY_COLORS[index % EXPENSE_CATEGORY_COLORS.length],
    }));
}

function getOutcomeCategoryLabels(log: CashLog, categories: Category[]) {
  const category = log.category;
  if (!category || category.type !== 'outcome') {
    return { parentName: 'Other', childName: 'Other' };
  }

  if (category.parentId === null) {
    return { parentName: category.name, childName: 'Other' };
  }

  const parentCategory = categories.find(
    (item) => item.id === category.parentId,
  );
  return {
    parentName: parentCategory?.name ?? category.name,
    childName: category.name,
  };
}

function getBudgetParentCategoryName(
  categoryName: string,
  type: 'income' | 'outcome',
  categories: Category[],
): string {
  const category = categories.find(
    (item) => item.type === type && item.name === categoryName,
  );

  if (!category) return categoryName;
  if (category.parentId === null) return category.name;

  const parentCategory = categories.find(
    (item) => item.id === category.parentId,
  );
  return parentCategory?.name ?? category.name;
}

function getLogParentCategoryName(
  log: CashLog,
  categories: Category[],
): string {
  const category = log.category;
  if (!category) return 'Other';
  if (category.parentId === null) return category.name;

  const parentCategory = categories.find(
    (item) => item.id === category.parentId,
  );
  return parentCategory?.name ?? category.name;
}

// ─── Data derivation ───

function getMonthLogs(logs: CashLog[], month: string) {
  return logs.filter((l) => l.date.startsWith(month) && !l.excludeFromReport);
}

function getMonthBudgets(budgets: Budget[], month: string) {
  return budgets.filter((b) => b.month === month);
}

function calcIncome(logs: CashLog[]) {
  return logs
    .filter((l) => l.category?.type === 'income' && !l.excludeFromReport)
    .reduce((s, l) => s + l.amount, 0);
}

function calcOutcome(logs: CashLog[]) {
  return logs
    .filter((l) => l.category?.type === 'outcome' && !l.excludeFromReport)
    .reduce((s, l) => s + l.amount, 0);
}

function getRecentMonths(count: number, currentMonth: string): string[] {
  const [y, m] = currentMonth.split('-').map(Number);
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    );
  }
  return months;
}

// ─── Component ───

export default function DashboardView() {
  const DASHBOARD_SNAPSHOT_KEY = 'dashboard-offline-snapshot-v1';
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedWalletId, setSelectedWalletId] = useState<'all' | number>(
    'all',
  );
  const [showNominal, setShowNominal] = useState(true);
  const [mode, setMode] = useState<DashboardMode>('month');
  const [isDark, setIsDark] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [showDailyIncome, setShowDailyIncome] = useState(true);
  const [showDailyOutcome, setShowDailyOutcome] = useState(true);
  const [showDailyTrend, setShowDailyTrend] = useState(true);
  const [selectedMonthlyParent, setSelectedMonthlyParent] = useState<
    string | null
  >(null);
  const [monthlyExpenseDrillMode, setMonthlyExpenseDrillMode] =
    useState<ExpenseDrillMode>('top');
  const [monthlyChildFromOther, setMonthlyChildFromOther] = useState(false);
  const [selectedSummaryParent, setSelectedSummaryParent] = useState<
    string | null
  >(null);
  const [summaryExpenseDrillMode, setSummaryExpenseDrillMode] =
    useState<ExpenseDrillMode>('top');
  const [summaryChildFromOther, setSummaryChildFromOther] = useState(false);
  const [budgetVsActualPageRaw, setBudgetVsActualPageRaw] = useState(0);
  const [wallets, setWallets] = useState<Wallets[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [cashLogs, setCashLogs] = useState<CashLog[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

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

  // ─── Derived data ───
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

  // 6-month trend
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
          const cycleWindow = getCycleWindow(
            month,
            Number(wallet.statementDay),
          );
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
    const atRiskMonths = activeMonths.filter(
      (item) => item.carryover > 0,
    ).length;
    const totalBilled = activeMonths.reduce(
      (sum, item) => sum + item.billed,
      0,
    );
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

  // Cumulative balance trend
  const balanceTrend = useMemo(() => {
    const result: Array<(typeof monthlyTrend)[number] & { balance: number }> =
      [];
    let acc = 0;
    for (const m of monthlyTrend) {
      acc += m.net;
      result.push({ ...m, balance: acc });
    }
    return result;
  }, [monthlyTrend]);

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
        const { parentName, childName } = getOutcomeCategoryLabels(
          log,
          categories,
        );
        if (parentName !== selectedMonthlyParent) return;
        map[childName] = (map[childName] || 0) + log.amount;
      });

    return buildAllExpenses(map);
  }, [monthLogs, selectedMonthlyParent, categories]);

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
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        },
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
    const maxValue = dailyTrend.reduce(
      (max, item) => Math.max(max, item.income),
      0,
    );
    return Math.max(maxValue, 1);
  }, [dailyTrend]);

  const dailyOutcomeMax = useMemo(() => {
    const maxValue = dailyTrend.reduce(
      (max, item) => Math.max(max, item.outcome),
      0,
    );
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

  const monthlyExpenseChartHeight = Math.max(
    360,
    monthlyExpenseChartData.length * 42,
  );

  const selectedMonthlyParentAmount = useMemo(() => {
    if (!selectedMonthlyParent) return 0;
    return (
      monthlyAllParentExpenses.find(
        (item) => item.name === selectedMonthlyParent,
      )?.amount ?? 0
    );
  }, [monthlyAllParentExpenses, selectedMonthlyParent]);

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
        const key = parentName;
        expenseMap[key] = (expenseMap[key] || 0) + log.amount;
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
        const { parentName, childName } = getOutcomeCategoryLabels(
          log,
          categories,
        );
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

  const summaryExpenseChartHeight = Math.max(
    280,
    summaryExpenseChartData.length * 42,
  );

  const selectedSummaryParentAmount = useMemo(() => {
    if (!selectedSummaryParent) return 0;
    return (
      summaryAllParentExpenses.find(
        (item) => item.name === selectedSummaryParent,
      )?.amount ?? 0
    );
  }, [selectedSummaryParent, summaryAllParentExpenses]);

  // Budget vs Actual
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
          budgetMap[parentCategory] =
            (budgetMap[parentCategory] || 0) + budget.amount;
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
  const budgetVsActualPage = Math.min(
    budgetVsActualPageRaw,
    budgetVsActualTotalPages - 1,
  );
  const budgetVsActualVisible = useMemo(() => {
    const start = budgetVsActualPage * budgetVsActualPageSize;
    return budgetVsActual.slice(start, start + budgetVsActualPageSize);
  }, [budgetVsActual, budgetVsActualPage]);
  const isSingleBudgetVsActualRow = budgetVsActualVisible.length === 1;
  const hasBudgetSeriesValue = budgetVsActualVisible.some(
    (item) => item.budget > 0,
  );
  const hasActualSeriesValue = budgetVsActualVisible.some(
    (item) => item.actual > 0,
  );
  const budgetVsActualVisibleMap = useMemo(
    () => new Map(budgetVsActualVisible.map((item) => [item.rowKey, item])),
    [budgetVsActualVisible],
  );

  const budgetVsActualTick = useCallback(
    ({
      x,
      y,
      payload,
    }: {
      x?: string | number;
      y?: string | number;
      payload?: { value?: string | number };
    }) => {
      const key = String(payload?.value ?? '');
      const item = budgetVsActualVisibleMap.get(key);
      const label = item?.category ?? key;
      const fill = item
        ? item.type === 'income'
          ? isDark
            ? '#86efac'
            : '#15803d'
          : isDark
            ? '#fca5a5'
            : '#b91c1c'
        : isDark
          ? '#94a3b8'
          : '#64748b';

      return (
        <text
          x={Number(x ?? 0) - 6}
          y={Number(y ?? 0)}
          dy={4}
          textAnchor='end'
          fill={fill}
          fontSize={11}
        >
          {label}
        </text>
      );
    },
    [budgetVsActualVisibleMap, isDark],
  );

  // Recent transactions (10 latest)
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
          s +
          (b.type === 'income' || b.type === 'carryover'
            ? b.amount
            : -b.amount),
        0,
      ),
    [monthBudgets],
  );

  const val = (v: number) => (showNominal ? formatCurrency(v) : HIDDEN_VALUE);

  const monthlySummaryCards = [
    {
      key: 'income',
      icon: <TrendingUpIcon />,
      label: 'Income',
      value: val(totalIncome),
      color: 'green' as const,
    },
    {
      key: 'outcome',
      icon: <TrendingDownIcon />,
      label: 'Outcome',
      value: val(totalOutcome),
      color: 'red' as const,
    },
    {
      key: 'net',
      icon: <SavingsIcon />,
      label: 'Net',
      value: val(netBalance),
      color: (netBalance >= 0 ? 'green' : 'red') as 'green' | 'red',
    },
    {
      key: 'tx',
      icon: <ReceiptLongIcon />,
      label: 'Total Transactions',
      value: txCount.toString(),
      color: 'blue' as const,
    },
  ];

  const overallSummaryCards = [
    {
      key: 'assets',
      icon: <AccountBalanceWalletIcon />,
      label: 'Total Assets',
      value: val(totalAssets),
      color: 'emerald' as const,
    },
    {
      key: 'debt',
      icon: <ReceiptLongIcon />,
      label: 'Total Debt',
      value: val(totalDebt),
      color: 'red' as const,
    },
    {
      key: 'networth',
      icon: <SavingsIcon />,
      label: 'Net Worth',
      value: val(netWorth),
      color: (netWorth >= 0 ? 'green' : 'red') as 'green' | 'red',
    },
    {
      key: 'avg-income',
      icon: <TrendingUpIcon />,
      label: 'Average Income (6 Months)',
      value: val(Math.round(avgIncome6Months)),
      color: 'green' as const,
    },
    {
      key: 'avg-outcome',
      icon: <TrendingDownIcon />,
      label: 'Average Outcome (6 Months)',
      value: val(Math.round(avgOutcome6Months)),
      color: 'red' as const,
    },
    {
      key: 'net-acc',
      icon: <SavingsIcon />,
      label: 'Net Accumulation (6 Months)',
      value: val(net6Months),
      color: (net6Months >= 0 ? 'green' : 'red') as 'green' | 'red',
    },
  ];

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
        const cycleWindow = getCycleWindow(
          selectedMonth,
          Number(wallet.statementDay),
        );
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

  // ─── Tooltip formatters ───
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
    ? {
        fill: isDark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(16, 185, 129, 0.12)',
      }
    : false;

  const mobileActiveBarStyle = {
    stroke: isDark ? '#cbd5e1' : '#0f172a',
    strokeWidth: isMobileViewport ? 2 : 1,
    strokeOpacity: isMobileViewport ? 0.6 : 0.3,
  };

  const smallActiveDot = {
    r: isMobileViewport ? 6 : 3,
    strokeWidth: isMobileViewport ? 2 : 1,
  };

  const mediumActiveDot = {
    r: isMobileViewport ? 7 : 5,
    strokeWidth: isMobileViewport ? 2 : 1,
  };

  const strongActiveDot = {
    r: isMobileViewport ? 8 : 6,
    strokeWidth: isMobileViewport ? 2 : 1,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currencyFormatter = (value: any) => {
    if (value === undefined) return '';
    return showNominal ? formatCurrency(Number(value)) : HIDDEN_VALUE;
  };

  if (loadingData) {
    return <div className='text-slate-500 dark:text-slate-400'>Loading...</div>;
  }

  if (dataError) {
    return <div className='text-red-500'>{dataError}</div>;
  }

  return (
    <div className='space-y-6'>
      {/* ─── Header ─── */}
      <div className='md:sticky md:top-0 z-40 bg-emerald-50 dark:bg-slate-900 pt-1 pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2'>
        <div className='flex flex-col gap-2 w-full md:w-auto'>
          <div className='flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap'>
            <h1 className='text-2xl font-bold text-emerald-700 dark:text-slate-100 mr-1'>
              Dashboard
            </h1>

            <div className='relative w-full sm:w-auto'>
              <select
                value={selectedWalletId}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedWalletId(value === 'all' ? 'all' : Number(value));
                  setBudgetVsActualPageRaw(0);
                  setMonthlyExpenseDrillMode('top');
                  setSelectedMonthlyParent(null);
                  setMonthlyChildFromOther(false);
                  setSummaryExpenseDrillMode('top');
                  setSelectedSummaryParent(null);
                  setSummaryChildFromOther(false);
                }}
                className='w-full sm:w-auto min-h-11 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:min-w-44'
                aria-label='Wallet filter'
              >
                <option value='all'>All Wallets</option>
                {groupedWallets.included.length > 0 && (
                  <optgroup label='Included from total'>
                    {groupedWallets.included.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {groupedWallets.excluded.length > 0 && (
                  <optgroup label='Excluded from total'>
                    {groupedWallets.excluded.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <input
              type='month'
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setBudgetVsActualPageRaw(0);
                setMonthlyExpenseDrillMode('top');
                setSelectedMonthlyParent(null);
                setMonthlyChildFromOther(false);
                setSummaryExpenseDrillMode('top');
                setSelectedSummaryParent(null);
                setSummaryChildFromOther(false);
              }}
              className='w-full sm:w-auto min-h-11 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500'
            />
          </div>
        </div>
        <div className='w-full md:w-auto flex items-center gap-3'>
          <div className='flex-1 md:flex-none inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden'>
            <button
              type='button'
              onClick={() => setMode('month')}
              className={`flex-1 md:flex-none px-3 py-2 text-sm transition-colors ${
                mode === 'month'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
              }`}
            >
              Monthly
            </button>
            <button
              type='button'
              onClick={() => setMode('summary')}
              className={`flex-1 md:flex-none px-3 py-2 text-sm transition-colors ${
                mode === 'summary'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
              }`}
            >
              6-Month Summary
            </button>
          </div>

          {/* Privacy toggle */}
          <button
            onClick={() => setShowNominal((v) => !v)}
            className='p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors'
            aria-label='Toggle nominal visibility'
          >
            {showNominal ? (
              <LockOpenIcon fontSize='small' />
            ) : (
              <LockIcon fontSize='small' />
            )}
          </button>
        </div>
      </div>

      {mode === 'month' ? (
        <section className='space-y-4'>
          <div className='flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-6'>
            <h2 className='text-lg font-semibold text-slate-800 dark:text-slate-100'>
              Selected Month Data
            </h2>
            <span className='text-sm text-slate-500 dark:text-slate-400'>
              {monthLabel(selectedMonth)}
            </span>
          </div>

          <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
            {monthlySummaryCards.map((card, index) => (
              <div
                key={card.key}
                className={`min-w-0 ${
                  monthlySummaryCards.length % 2 === 1 &&
                  index === monthlySummaryCards.length - 1
                    ? 'col-span-2'
                    : ''
                }`}
              >
                <SummaryCard
                  icon={card.icon}
                  label={card.label}
                  value={card.value}
                  color={card.color}
                />
              </div>
            ))}
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <ChartCard title='Credit Card Due Reminder'>
              {creditCardDueReminders.length === 0 ? (
                <p className='text-sm text-slate-500 dark:text-slate-400'>
                  No credit card due reminder for current data.
                </p>
              ) : (
                <div className='space-y-2'>
                  {creditCardDueReminders.map((item) => (
                    <div
                      key={item.id}
                      className='flex items-center justify-between rounded border border-slate-200 dark:border-slate-700 px-3 py-2'
                    >
                      <div>
                        <p className='text-sm font-semibold text-slate-800 dark:text-slate-200'>
                          {item.name}
                        </p>
                        <p className='text-xs text-slate-500 dark:text-slate-400'>
                          Due: {item.dueDate}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p
                          className={`text-xs font-semibold ${
                            item.severity === 'overdue'
                              ? 'text-red-600 dark:text-red-400'
                              : item.severity === 'due-soon'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.severity === 'overdue'
                            ? `${Math.abs(item.days)} day(s) overdue`
                            : `${item.days} day(s) remaining`}
                        </p>
                        <p className='text-xs text-slate-500 dark:text-slate-400'>
                          Outstanding: {val(item.outstanding)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>

            <ChartCard title='Credit Card Billing Cycle (Selected Month)'>
              {creditCardCycleSummaries.length === 0 ? (
                <p className='text-sm text-slate-500 dark:text-slate-400'>
                  Billing cycle data is unavailable. Add credit card wallet with
                  statement and due day.
                </p>
              ) : (
                <div className='space-y-3'>
                  {creditCardCycleSummaries.map((item) => (
                    <div
                      key={item.id}
                      className='rounded border border-slate-200 dark:border-slate-700 p-3'
                    >
                      <div className='mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                        <p className='text-sm font-semibold text-slate-800 dark:text-slate-200'>
                          {item.name}
                        </p>
                        <p className='text-xs text-slate-500 dark:text-slate-400'>
                          Utilization {item.utilization.toFixed(1)}%
                        </p>
                      </div>
                      <p className='text-xs text-slate-500 dark:text-slate-400 wrap-break-word'>
                        Cycle: {item.cycleStart} to {item.cycleEnd} - Due{' '}
                        {item.dueDate}
                      </p>
                      <p className='text-xs text-slate-500 dark:text-slate-400 wrap-break-word'>
                        Payment window: {item.cycleEnd} to {item.dueDate}
                      </p>
                      <div className='mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs'>
                        <p className='text-slate-600 dark:text-slate-300 wrap-break-word'>
                          Spent: {val(item.spent)}
                        </p>
                        <p className='text-slate-600 dark:text-slate-300 wrap-break-word'>
                          Paid: {val(item.paid)}
                        </p>
                        <p className='text-slate-600 dark:text-slate-300 wrap-break-word'>
                          Cycle net: {val(item.netChange)}
                        </p>
                        <p className='text-slate-600 dark:text-slate-300 wrap-break-word'>
                          Outstanding: {val(item.outstanding)}
                        </p>
                        <p className='text-slate-600 dark:text-slate-300 wrap-break-word'>
                          Limit: {val(item.creditLimit)}
                        </p>
                        <p className='text-slate-600 dark:text-slate-300 wrap-break-word'>
                          Remaining: {val(item.remainingLimit)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          </div>

          <div className='grid grid-cols-1 gap-6'>
            <ChartCard title='Daily Trend (Selected Month)'>
              <ResponsiveContainer width='100%' height={280}>
                <ComposedChart data={dailyTrend}>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke={isDark ? '#334155' : '#e2e8f0'}
                  />
                  <XAxis
                    dataKey='day'
                    tick={{
                      fontSize: 10,
                      fill: isDark ? '#94a3b8' : '#64748b',
                    }}
                    interval={3}
                  />
                  <YAxis
                    yAxisId='trend'
                    hide
                    tickFormatter={(v: number) =>
                      showNominal ? formatCompact(Math.abs(v)) : '•••'
                    }
                    domain={[-dailyTrendMaxAbs, dailyTrendMaxAbs]}
                  />
                  <YAxis
                    yAxisId='left'
                    domain={[0, dailyOutcomeMax]}
                    tickFormatter={(v: number) =>
                      showNominal ? formatCompact(v) : '•••'
                    }
                    tick={{
                      fontSize: 10,
                      fill: isDark ? '#fca5a5' : '#dc2626',
                    }}
                  />
                  <YAxis
                    yAxisId='right'
                    orientation='right'
                    domain={[0, dailyIncomeMax]}
                    tickFormatter={(v: number) =>
                      showNominal ? formatCompact(v) : '•••'
                    }
                    tick={{
                      fontSize: 10,
                      fill: isDark ? '#86efac' : '#059669',
                    }}
                  />
                  <ReferenceLine
                    yAxisId='trend'
                    y={0}
                    stroke={isDark ? '#64748b' : '#94a3b8'}
                    strokeDasharray='4 4'
                  />
                  <Tooltip
                    content={
                      <DailyTrendTooltip
                        isDark={isDark}
                        showNominal={showNominal}
                      />
                    }
                    cursor={chartTooltipCursor}
                  />
                  <Line
                    type='monotone'
                    yAxisId='trend'
                    dataKey='incomeTrend'
                    name='Income Trend'
                    hide={!showDailyTrend}
                    stroke='#10b981'
                    strokeWidth={1.8}
                    strokeDasharray='5 3'
                    dot={false}
                    activeDot={smallActiveDot}
                  />
                  <Line
                    type='monotone'
                    yAxisId='trend'
                    dataKey='outcomeTrend'
                    name='Outcome Trend'
                    hide={!showDailyTrend}
                    stroke='#ef4444'
                    strokeWidth={1.8}
                    strokeDasharray='5 3'
                    dot={false}
                    activeDot={smallActiveDot}
                  />
                  <Bar
                    yAxisId='left'
                    dataKey='outcome'
                    name='Outcome'
                    hide={!showDailyOutcome}
                    fill='#ef4444'
                    radius={[4, 4, 0, 0]}
                    activeBar={mobileActiveBarStyle}
                  />
                  <Bar
                    yAxisId='right'
                    dataKey='income'
                    name='Income'
                    hide={!showDailyIncome}
                    fill='#10b981'
                    radius={[4, 4, 0, 0]}
                    activeBar={mobileActiveBarStyle}
                  />
                </ComposedChart>
              </ResponsiveContainer>

              <div className='mt-3 flex items-center justify-center gap-6 text-sm'>
                <button
                  type='button'
                  onClick={() => setShowDailyIncome((value) => !value)}
                  className='flex items-center gap-2 text-slate-700 dark:text-slate-300'
                >
                  <span className='inline-block w-3 h-3 rounded-sm bg-emerald-500' />
                  <span
                    className={showDailyIncome ? '' : 'line-through opacity-60'}
                  >
                    Income
                  </span>
                </button>

                <button
                  type='button'
                  onClick={() => setShowDailyOutcome((value) => !value)}
                  className='flex items-center gap-2 text-slate-700 dark:text-slate-300'
                >
                  <span className='inline-block w-3 h-3 rounded-sm bg-red-500' />
                  <span
                    className={
                      showDailyOutcome ? '' : 'line-through opacity-60'
                    }
                  >
                    Outcome
                  </span>
                </button>

                <button
                  type='button'
                  onClick={() => setShowDailyTrend((value) => !value)}
                  className='flex items-center gap-2 text-slate-700 dark:text-slate-300'
                >
                  <span className='inline-flex flex-col gap-1 w-4'>
                    <span className='block w-4 border-t-2 border-dashed border-emerald-500' />
                    <span className='block w-4 border-t-2 border-dashed border-red-500' />
                  </span>
                  <span
                    className={showDailyTrend ? '' : 'line-through opacity-60'}
                  >
                    Trend
                  </span>
                </button>
              </div>
            </ChartCard>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <ChartCard title='Top 5 Expenses (Selected Month)'>
              {monthlyExpenseDrillMode !== 'top' && (
                <div className='mb-2 flex items-center justify-between'>
                  <p className='text-xs text-slate-500 dark:text-slate-400'>
                    {monthlyExpenseDrillMode === 'child' &&
                    selectedMonthlyParent
                      ? `Child categories of ${selectedMonthlyParent} (${val(selectedMonthlyParentAmount)})`
                      : 'Parent categories outside Top 5'}
                  </p>
                  <div className='flex items-center gap-3'>
                    {monthlyExpenseDrillMode === 'child' &&
                      monthlyChildFromOther && (
                        <button
                          type='button'
                          onClick={() => {
                            setMonthlyExpenseDrillMode('top');
                            setSelectedMonthlyParent(null);
                            setMonthlyChildFromOther(false);
                          }}
                          className='text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline'
                        >
                          Back to Top 5
                        </button>
                      )}
                    <button
                      type='button'
                      onClick={() => {
                        if (monthlyExpenseDrillMode === 'child') {
                          if (monthlyChildFromOther) {
                            setMonthlyExpenseDrillMode('other');
                          } else {
                            setMonthlyExpenseDrillMode('top');
                          }
                          setSelectedMonthlyParent(null);
                          setMonthlyChildFromOther(false);
                          return;
                        }

                        setMonthlyExpenseDrillMode('top');
                      }}
                      className='text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline'
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
              <ResponsiveContainer
                width='100%'
                height={monthlyExpenseChartHeight}
              >
                <BarChart data={monthlyExpenseChartData} layout='vertical'>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke={isDark ? '#334155' : '#e2e8f0'}
                  />
                  <XAxis
                    type='number'
                    domain={[0, 'dataMax']}
                    tickFormatter={(v) =>
                      showNominal ? formatCompact(v) : '•••'
                    }
                    tick={{
                      fontSize: 11,
                      fill: isDark ? '#94a3b8' : '#64748b',
                    }}
                  />
                  <YAxis
                    dataKey='name'
                    type='category'
                    width={100}
                    tick={{
                      fontSize: 11,
                      fill: isDark ? '#94a3b8' : '#64748b',
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    formatter={currencyFormatter}
                    cursor={chartTooltipCursor}
                  />
                  <Bar
                    dataKey='amount'
                    name='Amount'
                    radius={[0, 4, 4, 0]}
                    activeBar={mobileActiveBarStyle}
                  >
                    {monthlyExpenseChartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.fill}
                        className={
                          monthlyExpenseDrillMode !== 'child' &&
                          (entry.name !== 'Other' ||
                            monthlyOtherParentExpenses.length > 0)
                            ? 'cursor-pointer'
                            : ''
                        }
                        onClick={() => {
                          if (monthlyExpenseDrillMode === 'child') return;

                          if (monthlyExpenseDrillMode === 'top') {
                            if (entry.name === 'Other') {
                              if (monthlyOtherParentExpenses.length === 0)
                                return;
                              setMonthlyExpenseDrillMode('other');
                              return;
                            }

                            setMonthlyChildFromOther(false);
                          } else {
                            setMonthlyChildFromOther(true);
                          }

                          setSelectedMonthlyParent(entry.name);
                          setMonthlyExpenseDrillMode('child');
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title='Budget vs Actual (Selected Month)'>
              <ResponsiveContainer width='100%' height={340}>
                <BarChart
                  data={budgetVsActualVisible}
                  layout='vertical'
                  barGap={2}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke={isDark ? '#334155' : '#e2e8f0'}
                  />
                  <XAxis
                    type='number'
                    tickFormatter={(v) =>
                      showNominal ? formatCompact(v) : '•••'
                    }
                    tick={{
                      fontSize: 11,
                      fill: isDark ? '#94a3b8' : '#64748b',
                    }}
                  />
                  <YAxis
                    dataKey='rowKey'
                    type='category'
                    width={100}
                    padding={
                      isSingleBudgetVsActualRow
                        ? { top: 80, bottom: 80 }
                        : undefined
                    }
                    tick={budgetVsActualTick}
                  />
                  <Tooltip
                    content={
                      <TopExpenseTooltip
                        isDark={isDark}
                        showNominal={showNominal}
                      />
                    }
                    cursor={chartTooltipCursor}
                  />
                  {hasBudgetSeriesValue && (
                    <Bar
                      dataKey='budget'
                      name='Budget'
                      fill='#3b82f6'
                      radius={[0, 4, 4, 0]}
                      maxBarSize={isSingleBudgetVsActualRow ? 26 : undefined}
                      activeBar={mobileActiveBarStyle}
                    />
                  )}
                  {hasActualSeriesValue && (
                    <Bar
                      dataKey='actual'
                      name='Actual'
                      fill='#f59e0b'
                      radius={[0, 4, 4, 0]}
                      maxBarSize={isSingleBudgetVsActualRow ? 26 : undefined}
                      activeBar={mobileActiveBarStyle}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>

              <div className='mt-2 flex items-center justify-between gap-3 flex-wrap'>
                <div className='flex items-center gap-4 text-xs'>
                  <span className='flex items-center gap-1 text-slate-600 dark:text-slate-300'>
                    <span className='inline-block w-3 h-3 rounded-sm bg-blue-500' />
                    Budget
                  </span>
                  <span className='flex items-center gap-1 text-slate-600 dark:text-slate-300'>
                    <span className='inline-block w-3 h-3 rounded-sm bg-amber-500' />
                    Actual
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <button
                    type='button'
                    onClick={() =>
                      setBudgetVsActualPageRaw((value) =>
                        Math.max(0, value - 1),
                      )
                    }
                    disabled={budgetVsActualPage === 0}
                    className='px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
                    aria-label='Previous page'
                  >
                    <NavigateBeforeIcon fontSize='small' />
                  </button>
                  <span className='text-xs text-slate-500 dark:text-slate-400 min-w-14 text-center'>
                    {budgetVsActualPage + 1}/{budgetVsActualTotalPages}
                  </span>
                  <button
                    type='button'
                    onClick={() =>
                      setBudgetVsActualPageRaw((value) =>
                        Math.min(budgetVsActualTotalPages - 1, value + 1),
                      )
                    }
                    disabled={
                      budgetVsActualPage >= budgetVsActualTotalPages - 1
                    }
                    className='px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
                    aria-label='Next page'
                  >
                    <NavigateNextIcon fontSize='small' />
                  </button>
                </div>
              </div>
            </ChartCard>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <ChartCard title='Recent Transactions (Selected Month)'>
              <div className='overflow-x-auto max-h-90 overflow-y-auto'>
                <table className='w-full text-sm'>
                  <thead className='sticky top-0 bg-white dark:bg-slate-800'>
                    <tr className='text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700'>
                      <th className='py-2 pr-2'>Date</th>
                      <th className='py-2 pr-2'>Description</th>
                      <th className='py-2 pr-2'>Category</th>
                      <th className='py-2 pr-2'>Wallet</th>
                      <th className='py-2 text-right'>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className='border-b border-slate-100 dark:border-slate-700/50 last:border-b-0'
                      >
                        <td className='py-2 pr-2 whitespace-nowrap text-slate-600 dark:text-slate-400'>
                          {tx.date.slice(5)}
                        </td>
                        <td className='py-2 pr-2 text-slate-800 dark:text-slate-200 truncate max-w-40'>
                          {tx.description}
                        </td>
                        <td className='py-2 pr-2 text-slate-500 dark:text-slate-400'>
                          {tx.category?.name ?? '-'}
                        </td>
                        <td className='py-2 pr-2 text-slate-500 dark:text-slate-400'>
                          {tx.walletName}
                        </td>
                        <td
                          className={`py-2 text-right font-mono whitespace-nowrap ${
                            tx.category?.type === 'income'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {showNominal
                            ? formatCurrency(tx.amount)
                            : HIDDEN_VALUE}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard title='Budget Summary (Selected Month)'>
              <div className='overflow-x-auto max-h-90 overflow-y-auto'>
                <table className='w-full text-sm'>
                  <thead className='sticky top-0 bg-white dark:bg-slate-800'>
                    <tr className='text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700'>
                      <th className='py-2 pr-2'>Item</th>
                      <th className='py-2 pr-2'>Type</th>
                      <th className='py-2 text-right'>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthBudgets.map((b) => (
                      <tr
                        key={b.id}
                        className='border-b border-slate-100 dark:border-slate-700/50 last:border-b-0'
                      >
                        <td className='py-2 pr-2 text-slate-800 dark:text-slate-200'>
                          {b.name}
                        </td>
                        <td className='py-2 pr-2'>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              b.type === 'income' || b.type === 'carryover'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {b.type}
                          </span>
                        </td>
                        <td
                          className={`py-2 text-right font-mono ${
                            b.type === 'income' || b.type === 'carryover'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {val(b.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className='flex items-center justify-between border-t-2 border-slate-300 dark:border-slate-600 mt-2 pt-2 font-bold'>
                <span className='text-slate-800 dark:text-slate-200'>
                  Total Budget
                </span>
                <span className='font-mono text-emerald-700 dark:text-emerald-400'>
                  {val(totalBudget)}
                </span>
              </div>
            </ChartCard>
          </div>
        </section>
      ) : (
        <section className='space-y-4'>
          <div className='flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-6'>
            <h2 className='text-lg font-semibold text-slate-800 dark:text-slate-100'>
              Overall Summary
            </h2>
            <span className='text-sm text-slate-500 dark:text-slate-400'>
              Cross-month overview
            </span>
          </div>

          <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
            {overallSummaryCards.map((card, index) => (
              <div
                key={card.key}
                className={`min-w-0 ${
                  overallSummaryCards.length % 2 === 1 &&
                  index === overallSummaryCards.length - 1
                    ? 'col-span-2'
                    : ''
                }`}
              >
                <SummaryCard
                  icon={card.icon}
                  label={card.label}
                  value={card.value}
                  color={card.color}
                />
              </div>
            ))}
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <ChartCard title='Income vs Outcome (6 Months)'>
              <ResponsiveContainer width='100%' height={280}>
                <BarChart data={monthlyTrend} barGap={4}>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke={isDark ? '#334155' : '#e2e8f0'}
                  />
                  <XAxis
                    dataKey='label'
                    tick={{
                      fontSize: 12,
                      fill: isDark ? '#94a3b8' : '#64748b',
                    }}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      showNominal ? formatCompact(v) : '•••'
                    }
                    tick={{
                      fontSize: 11,
                      fill: isDark ? '#94a3b8' : '#64748b',
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={currencyFormatter}
                    cursor={chartTooltipCursor}
                  />
                  <Bar
                    dataKey='income'
                    name='Income'
                    fill='#10b981'
                    radius={[4, 4, 0, 0]}
                    activeBar={mobileActiveBarStyle}
                  />
                  <Bar
                    dataKey='outcome'
                    name='Outcome'
                    fill='#ef4444'
                    radius={[4, 4, 0, 0]}
                    activeBar={mobileActiveBarStyle}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title='Cashflow & Net Trend (6 Months)'>
              <ResponsiveContainer width='100%' height={280}>
                <LineChart data={balanceTrend}>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke={isDark ? '#334155' : '#e2e8f0'}
                  />
                  <XAxis
                    dataKey='label'
                    tick={{
                      fontSize: 12,
                      fill: isDark ? '#94a3b8' : '#64748b',
                    }}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      showNominal ? formatCompact(v) : '•••'
                    }
                    tick={{
                      fontSize: 11,
                      fill: isDark ? '#94a3b8' : '#64748b',
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={currencyFormatter}
                    cursor={chartTooltipCursor}
                  />
                  <Legend />
                  <Line
                    type='monotone'
                    dataKey='income'
                    name='Income'
                    stroke='#10b981'
                    strokeWidth={2}
                    strokeDasharray='5 4'
                    dot={false}
                    activeDot={mediumActiveDot}
                  />
                  <Line
                    type='monotone'
                    dataKey='outcome'
                    name='Outcome'
                    stroke='#ef4444'
                    strokeWidth={2}
                    strokeDasharray='5 4'
                    dot={false}
                    activeDot={mediumActiveDot}
                  />
                  <Line
                    type='monotone'
                    dataKey='balance'
                    name='Net Balance'
                    stroke='#38bdf8'
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#38bdf8' }}
                    activeDot={strongActiveDot}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6'>
            <ChartCard title='Credit Utilization Trend (6 Months)'>
              {creditCardMonths6.every((item) => item.billed === 0) ? (
                <p className='text-sm text-slate-500 dark:text-slate-400'>
                  No billed credit card activity in the last 6 months.
                </p>
              ) : (
                <ResponsiveContainer
                  width='100%'
                  height={isMobileViewport ? 200 : 240}
                >
                  <LineChart data={creditCardMonths6}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      stroke={isDark ? '#334155' : '#e2e8f0'}
                    />
                    <XAxis
                      dataKey='label'
                      interval={isMobileViewport ? 1 : 0}
                      tick={{
                        fontSize: isMobileViewport ? 10 : 12,
                        fill: isDark ? '#94a3b8' : '#64748b',
                      }}
                    />
                    <YAxis
                      tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                      tick={{
                        fontSize: isMobileViewport ? 10 : 11,
                        fill: isDark ? '#94a3b8' : '#64748b',
                      }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => `${Number(value).toFixed(1)}%`}
                    />
                    <ReferenceLine
                      y={30}
                      stroke='#10b981'
                      strokeDasharray='4 4'
                    />
                    <ReferenceLine
                      y={80}
                      stroke='#ef4444'
                      strokeDasharray='4 4'
                    />
                    <Line
                      type='monotone'
                      dataKey='cycleUtilization'
                      name='Cycle Utilization'
                      stroke='#f59e0b'
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#f59e0b' }}
                      activeDot={strongActiveDot}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title='Statement vs Payment (6 Months)'>
              {creditCardMonths6.every(
                (item) => item.billed === 0 && item.paid === 0,
              ) ? (
                <p className='text-sm text-slate-500 dark:text-slate-400'>
                  No statement or payment activity in the last 6 months.
                </p>
              ) : (
                <ResponsiveContainer
                  width='100%'
                  height={isMobileViewport ? 200 : 240}
                >
                  <ComposedChart data={creditCardMonths6}>
                    <CartesianGrid
                      strokeDasharray='3 3'
                      stroke={isDark ? '#334155' : '#e2e8f0'}
                    />
                    <XAxis
                      dataKey='label'
                      interval={isMobileViewport ? 1 : 0}
                      tick={{
                        fontSize: isMobileViewport ? 10 : 12,
                        fill: isDark ? '#94a3b8' : '#64748b',
                      }}
                    />
                    <YAxis
                      tickFormatter={(v) =>
                        showNominal ? formatCompact(v) : '•••'
                      }
                      tick={{
                        fontSize: isMobileViewport ? 10 : 11,
                        fill: isDark ? '#94a3b8' : '#64748b',
                      }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={currencyFormatter}
                      cursor={chartTooltipCursor}
                    />
                    {!isMobileViewport && <Legend />}
                    <Bar
                      dataKey='billed'
                      name='Statement (Billed)'
                      fill='#ef4444'
                      radius={[4, 4, 0, 0]}
                      activeBar={mobileActiveBarStyle}
                    />
                    <Bar
                      dataKey='paid'
                      name='Paid'
                      fill='#10b981'
                      radius={[4, 4, 0, 0]}
                      activeBar={mobileActiveBarStyle}
                    />
                    <Line
                      type='monotone'
                      dataKey='carryover'
                      name='Carryover'
                      stroke='#f59e0b'
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#f59e0b' }}
                      activeDot={mediumActiveDot}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title='Payment Discipline (6 Months)'>
              <div className='space-y-2 sm:space-y-3'>
                <div className='grid grid-cols-2 gap-2 sm:gap-3 text-[11px] sm:text-xs'>
                  <div className='rounded-lg border border-slate-200 dark:border-slate-700 p-2 sm:p-2.5'>
                    <p className='text-slate-500 dark:text-slate-400'>
                      Active Months
                    </p>
                    <p className='mt-1 font-semibold text-slate-700 dark:text-slate-200'>
                      {paymentDisciplineSummary.activeMonths}
                    </p>
                  </div>
                  <div className='rounded-lg border border-slate-200 dark:border-slate-700 p-2 sm:p-2.5'>
                    <p className='text-slate-500 dark:text-slate-400'>
                      On-Track Months
                    </p>
                    <p className='mt-1 font-semibold text-emerald-600 dark:text-emerald-400'>
                      {paymentDisciplineSummary.onTrackMonths}
                    </p>
                  </div>
                  <div className='rounded-lg border border-slate-200 dark:border-slate-700 p-2 sm:p-2.5'>
                    <p className='text-slate-500 dark:text-slate-400'>
                      At-Risk Months
                    </p>
                    <p className='mt-1 font-semibold text-red-600 dark:text-red-400'>
                      {paymentDisciplineSummary.atRiskMonths}
                    </p>
                  </div>
                  <div className='rounded-lg border border-slate-200 dark:border-slate-700 p-2 sm:p-2.5'>
                    <p className='text-slate-500 dark:text-slate-400'>
                      Avg Coverage
                    </p>
                    <p className='mt-1 font-semibold text-blue-600 dark:text-blue-400'>
                      {paymentDisciplineSummary.avgCoverage.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className='rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 text-[11px] sm:text-xs'>
                  <p className='text-slate-500 dark:text-slate-400'>
                    Total Statement (6 months)
                  </p>
                  <p className='mt-1 font-semibold text-slate-700 dark:text-slate-200'>
                    {val(paymentDisciplineSummary.totalBilled)}
                  </p>
                  <p className='mt-2 text-slate-500 dark:text-slate-400'>
                    Total Paid
                  </p>
                  <p className='mt-1 font-semibold text-emerald-600 dark:text-emerald-400'>
                    {val(paymentDisciplineSummary.totalPaid)}
                  </p>
                </div>
              </div>
            </ChartCard>
          </div>

          <div className='grid grid-cols-1 gap-6'>
            <ChartCard title='Top 5 Expenses (Last 6 Months)'>
              {summaryExpenseDrillMode !== 'top' && (
                <div className='mb-2 flex items-center justify-between'>
                  <p className='text-xs text-slate-500 dark:text-slate-400'>
                    {summaryExpenseDrillMode === 'child' &&
                    selectedSummaryParent
                      ? `Child categories of ${selectedSummaryParent} (${val(selectedSummaryParentAmount)})`
                      : 'Parent categories outside Top 5'}
                  </p>
                  <div className='flex items-center gap-3'>
                    {summaryExpenseDrillMode === 'child' &&
                      summaryChildFromOther && (
                        <button
                          type='button'
                          onClick={() => {
                            setSummaryExpenseDrillMode('top');
                            setSelectedSummaryParent(null);
                            setSummaryChildFromOther(false);
                          }}
                          className='text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline'
                        >
                          Back to Top 5
                        </button>
                      )}
                    <button
                      type='button'
                      onClick={() => {
                        if (summaryExpenseDrillMode === 'child') {
                          if (summaryChildFromOther) {
                            setSummaryExpenseDrillMode('other');
                          } else {
                            setSummaryExpenseDrillMode('top');
                          }
                          setSelectedSummaryParent(null);
                          setSummaryChildFromOther(false);
                          return;
                        }

                        setSummaryExpenseDrillMode('top');
                      }}
                      className='text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline'
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
              <ResponsiveContainer
                width='100%'
                height={summaryExpenseChartHeight}
              >
                <BarChart data={summaryExpenseChartData} layout='vertical'>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke={isDark ? '#334155' : '#e2e8f0'}
                  />
                  <XAxis
                    type='number'
                    tickFormatter={(v) =>
                      showNominal ? formatCompact(v) : '•••'
                    }
                    tick={{
                      fontSize: 11,
                      fill: isDark ? '#94a3b8' : '#64748b',
                    }}
                  />
                  <YAxis
                    dataKey='name'
                    type='category'
                    width={120}
                    tick={{
                      fontSize: 11,
                      fill: isDark ? '#94a3b8' : '#64748b',
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={currencyFormatter}
                    cursor={chartTooltipCursor}
                  />
                  <Bar
                    dataKey='amount'
                    name='Amount'
                    radius={[0, 4, 4, 0]}
                    activeBar={mobileActiveBarStyle}
                  >
                    {summaryExpenseChartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.fill}
                        className={
                          summaryExpenseDrillMode !== 'child' &&
                          (entry.name !== 'Other' ||
                            summaryOtherParentExpenses.length > 0)
                            ? 'cursor-pointer'
                            : ''
                        }
                        onClick={() => {
                          if (summaryExpenseDrillMode === 'child') return;

                          if (summaryExpenseDrillMode === 'top') {
                            if (entry.name === 'Other') {
                              if (summaryOtherParentExpenses.length === 0)
                                return;
                              setSummaryExpenseDrillMode('other');
                              return;
                            }

                            setSummaryChildFromOther(false);
                          } else {
                            setSummaryChildFromOther(true);
                          }

                          setSelectedSummaryParent(entry.name);
                          setSummaryExpenseDrillMode('child');
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Sub-components ───

function TopExpenseTooltip({
  active,
  payload,
  label,
  isDark,
  showNominal,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    payload?: { category?: string };
  }>;
  label?: string;
  isDark: boolean;
  showNominal: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const budgetValue = Number(
    payload.find((item) => item.name === 'Budget')?.value ?? 0,
  );
  const actualValue = Number(
    payload.find((item) => item.name === 'Actual')?.value ?? 0,
  );
  const categoryLabel = payload[0]?.payload?.category ?? label ?? 'Category';

  return (
    <div
      className={`rounded-lg border px-3 py-2 shadow-md ${
        isDark
          ? 'bg-slate-800 border-slate-600 text-slate-100'
          : 'bg-white border-slate-300 text-slate-900'
      }`}
    >
      <div className='font-semibold'>{categoryLabel}</div>
      <div className={isDark ? 'text-slate-200' : 'text-slate-700'}>
        Budget : {showNominal ? formatCurrency(budgetValue) : HIDDEN_VALUE}
      </div>
      <div className={isDark ? 'text-slate-200' : 'text-slate-700'}>
        Actual : {showNominal ? formatCurrency(actualValue) : HIDDEN_VALUE}
      </div>
    </div>
  );
}

function DailyTrendTooltip({
  active,
  payload,
  isDark,
  showNominal,
}: {
  active?: boolean;
  payload?: Array<{
    value?: number | string;
    name?: string;
    payload?: { fullDate?: string };
  }>;
  isDark: boolean;
  showNominal: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const dateLabel = payload[0]?.payload?.fullDate ?? '';
  const incomeRaw = payload.find((item) => item.name === 'Income')?.value ?? 0;
  const outcomeRaw =
    payload.find((item) => item.name === 'Outcome')?.value ?? 0;

  const incomeValue = Number(incomeRaw);
  const outcomeValue = Math.abs(Number(outcomeRaw));

  return (
    <div
      className={`rounded-lg border px-3 py-2 shadow-md ${
        isDark
          ? 'bg-slate-800 border-slate-600 text-slate-100'
          : 'bg-white border-slate-300 text-slate-900'
      }`}
    >
      <div className='font-semibold'>{dateLabel}</div>
      <div className={isDark ? 'text-slate-200' : 'text-slate-700'}>
        Income : {showNominal ? formatCurrency(incomeValue) : HIDDEN_VALUE}
      </div>
      <div className={isDark ? 'text-slate-200' : 'text-slate-700'}>
        Outcome : {showNominal ? formatCurrency(outcomeValue) : HIDDEN_VALUE}
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'emerald' | 'green' | 'red' | 'blue';
  highlight?: boolean;
}) {
  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
      value: 'text-emerald-700 dark:text-emerald-300',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      icon: 'text-green-600 dark:text-green-400',
      value: 'text-green-700 dark:text-green-300',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      icon: 'text-red-600 dark:text-red-400',
      value: 'text-red-700 dark:text-red-300',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      icon: 'text-blue-600 dark:text-blue-400',
      value: 'text-blue-700 dark:text-blue-300',
    },
  };

  const c = colorMap[color];

  return (
    <div
      className={`h-full min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4 shadow-sm flex flex-col justify-between ${
        highlight ? 'ring-2 ring-emerald-400/40 dark:ring-emerald-500/30' : ''
      }`}
    >
      <div className='flex items-start gap-2 sm:gap-3 min-w-0'>
        <div className={`p-1.5 sm:p-2 rounded-lg ${c.bg}`}>
          <span className={c.icon}>{icon}</span>
        </div>
        <span className='min-w-0 text-[10px] sm:text-xs leading-tight font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide wrap-break-word'>
          {label}
        </span>
      </div>
      <div
        className={`mt-2 min-w-0 text-sm sm:text-lg leading-snug font-bold font-mono ${c.value} wrap-break-word`}
      >
        {value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className='rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm'>
      <h3 className='text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4'>
        {title}
      </h3>
      {children}
    </div>
  );
}
