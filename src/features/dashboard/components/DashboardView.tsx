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
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedWalletId, setSelectedWalletId] = useState<'all' | number>(
    'all',
  );
  const [showNominal, setShowNominal] = useState(true);
  const [mode, setMode] = useState<DashboardMode>('month');
  const [isDark, setIsDark] = useState(false);
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

  // ─── Derived data ───
  const groupedWallets = useMemo(() => {
    const included = wallets.filter(
      (wallet) => !wallet.excludeFromTotal && wallet.walletKind !== 'goal',
    );
    const excluded = wallets.filter(
      (wallet) => wallet.excludeFromTotal || wallet.walletKind === 'goal',
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

  const totalWalletBalance = useMemo(() => {
    if (selectedWallet) return selectedWallet.balance;

    return wallets
      .filter((w) => !w.excludeFromTotal && w.walletKind !== 'goal')
      .reduce((s, w) => s + w.balance, 0);
  }, [selectedWallet, wallets]);

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
      <div className='sticky top-0 z-40 bg-emerald-50 dark:bg-slate-900 pt-4 pb-3 flex items-center justify-between flex-wrap gap-4'>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-3 flex-wrap'>
            <h1 className='text-2xl font-bold text-emerald-700 dark:text-slate-100 mr-1'>
              Dashboard
            </h1>

            <div className='relative'>
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
                className='bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-44'
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
              className='bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500'
            />
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <div className='inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden'>
            <button
              type='button'
              onClick={() => setMode('month')}
              className={`px-3 py-1.5 text-sm transition-colors ${
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
              className={`px-3 py-1.5 text-sm transition-colors ${
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

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            <SummaryCard
              icon={<TrendingUpIcon />}
              label='Income'
              value={val(totalIncome)}
              color='green'
            />
            <SummaryCard
              icon={<TrendingDownIcon />}
              label='Outcome'
              value={val(totalOutcome)}
              color='red'
            />
            <SummaryCard
              icon={<SavingsIcon />}
              label='Net'
              value={val(netBalance)}
              color={netBalance >= 0 ? 'green' : 'red'}
            />
            <SummaryCard
              icon={<ReceiptLongIcon />}
              label='Total Transactions'
              value={txCount.toString()}
              color='blue'
            />
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
                    cursor={false}
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
                    activeDot={{ r: 3 }}
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
                    activeDot={{ r: 3 }}
                  />
                  <Bar
                    yAxisId='left'
                    dataKey='outcome'
                    name='Outcome'
                    hide={!showDailyOutcome}
                    fill='#ef4444'
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId='right'
                    dataKey='income'
                    name='Income'
                    hide={!showDailyIncome}
                    fill='#10b981'
                    radius={[4, 4, 0, 0]}
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
                    cursor={false}
                  />
                  <Bar dataKey='amount' name='Amount' radius={[0, 4, 4, 0]}>
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
                    cursor={false}
                  />
                  {hasBudgetSeriesValue && (
                    <Bar
                      dataKey='budget'
                      name='Budget'
                      fill='#3b82f6'
                      radius={[0, 4, 4, 0]}
                      maxBarSize={isSingleBudgetVsActualRow ? 26 : undefined}
                    />
                  )}
                  {hasActualSeriesValue && (
                    <Bar
                      dataKey='actual'
                      name='Actual'
                      fill='#f59e0b'
                      radius={[0, 4, 4, 0]}
                      maxBarSize={isSingleBudgetVsActualRow ? 26 : undefined}
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

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            <SummaryCard
              icon={<AccountBalanceWalletIcon />}
              label='Total Wallet'
              value={val(totalWalletBalance)}
              color='emerald'
            />
            <SummaryCard
              icon={<TrendingUpIcon />}
              label='Average Income (6 Months)'
              value={val(Math.round(avgIncome6Months))}
              color='green'
            />
            <SummaryCard
              icon={<TrendingDownIcon />}
              label='Average Outcome (6 Months)'
              value={val(Math.round(avgOutcome6Months))}
              color='red'
            />
            <SummaryCard
              icon={<SavingsIcon />}
              label='Net Accumulation (6 Months)'
              value={val(net6Months)}
              color={net6Months >= 0 ? 'green' : 'red'}
            />
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
                    cursor={false}
                  />
                  <Bar
                    dataKey='income'
                    name='Income'
                    fill='#10b981'
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey='outcome'
                    name='Outcome'
                    fill='#ef4444'
                    radius={[4, 4, 0, 0]}
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
                    cursor={false}
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
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type='monotone'
                    dataKey='outcome'
                    name='Outcome'
                    stroke='#ef4444'
                    strokeWidth={2}
                    strokeDasharray='5 4'
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type='monotone'
                    dataKey='balance'
                    name='Net Balance'
                    stroke='#38bdf8'
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#38bdf8' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
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
                    cursor={false}
                  />
                  <Bar dataKey='amount' name='Amount' radius={[0, 4, 4, 0]}>
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
      className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm ${
        highlight ? 'ring-2 ring-emerald-400/40 dark:ring-emerald-500/30' : ''
      }`}
    >
      <div className='flex items-center gap-3 mb-2'>
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <span className={c.icon}>{icon}</span>
        </div>
        <span className='text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider'>
          {label}
        </span>
      </div>
      <div className={`text-lg font-bold font-mono ${c.value}`}>{value}</div>
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
