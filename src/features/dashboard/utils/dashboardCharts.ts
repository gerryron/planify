// ---------------------------------------------------------------------------
// Dashboard utility functions – extracted from DashboardView.tsx
// Pure helpers for currency formatting, date labels, expense aggregation,
// and credit-card cycle math.
// ---------------------------------------------------------------------------

import type { CashLog } from '@/features/cash-log/services/cashLogService';
import type { Budget } from '@/features/monthly-budget/services/monthlyBudgetService';
import type { Category } from '@/features/categories/types/category';

// ---- Formatting ----

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

export function monthLabel(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function shortMonthLabel(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ---- Date / credit-card helpers ----

export function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateWithSafeDay(year: number, monthIndex: number, day: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const safeDay = Math.max(1, Math.min(day, lastDay));
  return new Date(year, monthIndex, safeDay);
}

export function getNextDueDate(baseDate: Date, dueDay: number): Date {
  const currentMonthDue = getDateWithSafeDay(baseDate.getFullYear(), baseDate.getMonth(), dueDay);
  if (baseDate <= currentMonthDue) return currentMonthDue;
  return getDateWithSafeDay(baseDate.getFullYear(), baseDate.getMonth() + 1, dueDay);
}

export function getCycleWindow(selectedMonth: string, statementDay: number) {
  const [yearText, monthText] = selectedMonth.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;

  const cycleEndDate = getDateWithSafeDay(year, monthIndex, statementDay);
  const previousStatementDate = getDateWithSafeDay(year, monthIndex - 1, statementDay);
  const cycleStartDate = new Date(previousStatementDate);
  cycleStartDate.setDate(cycleStartDate.getDate() + 1);

  return { cycleStart: toIsoDate(cycleStartDate), cycleEnd: toIsoDate(cycleEndDate), cycleEndDate };
}

// ---- Expense aggregation ----

export const EXPENSE_CATEGORY_COLORS = ['#ef4444', '#f59e0b'];

export function buildTop5WithOther(expenseMap: Record<string, number>) {
  const ranked = Object.entries(expenseMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  const withAlternatingColors = (items: Array<{ name: string; amount: number }>) =>
    items.map((item, index) => ({
      ...item,
      fill: EXPENSE_CATEGORY_COLORS[index % EXPENSE_CATEGORY_COLORS.length],
    }));

  if (ranked.length <= 5) return withAlternatingColors(ranked);

  const topFive = ranked.slice(0, 5);
  const otherAmount = ranked.slice(5).reduce((sum, item) => sum + item.amount, 0);
  return withAlternatingColors([...topFive, { name: 'Other', amount: otherAmount }]);
}

export function buildAllExpenses(expenseMap: Record<string, number>) {
  return Object.entries(expenseMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .map((item, index) => ({
      ...item,
      fill: EXPENSE_CATEGORY_COLORS[index % EXPENSE_CATEGORY_COLORS.length],
    }));
}

// ---- Category helpers ----

export function getOutcomeCategoryLabels(log: CashLog, categories: Category[]) {
  const category = log.category;
  if (!category || category.type !== 'outcome') return { parentName: 'Other', childName: 'Other' };
  if (category.parentId === null) return { parentName: category.name, childName: 'Other' };
  const parentCategory = categories.find((item) => item.id === category.parentId);
  return { parentName: parentCategory?.name ?? category.name, childName: category.name };
}

export function getBudgetParentCategoryName(categoryName: string, type: 'income' | 'outcome', categories: Category[]): string {
  const category = categories.find((item) => item.type === type && item.name === categoryName);
  if (!category) return categoryName;
  if (category.parentId === null) return category.name;
  const parentCategory = categories.find((item) => item.id === category.parentId);
  return parentCategory?.name ?? category.name;
}

export function getLogParentCategoryName(log: CashLog, categories: Category[]): string {
  const category = log.category;
  if (!category) return 'Other';
  if (category.parentId === null) return category.name;
  const parentCategory = categories.find((item) => item.id === category.parentId);
  return parentCategory?.name ?? category.name;
}

// ---- Data derivation ----

export function getMonthLogs(logs: CashLog[], month: string) {
  return logs.filter((l) => l.date.startsWith(month) && !l.excludeFromReport);
}

export function getMonthBudgets(budgets: Budget[], month: string) {
  return budgets.filter((b) => b.month === month);
}

export function calcIncome(logs: CashLog[]) {
  return logs
    .filter((l) => l.category?.type === 'income' && !l.excludeFromReport)
    .reduce((s, l) => s + l.amount, 0);
}

export function calcOutcome(logs: CashLog[]) {
  return logs
    .filter((l) => l.category?.type === 'outcome' && !l.excludeFromReport)
    .reduce((s, l) => s + l.amount, 0);
}

export function getRecentMonths(count: number, currentMonth: string): string[] {
  const [yearText, monthText] = currentMonth.split('-');
  const end = new Date(Number(yearText), Number(monthText) - 1, 1);
  const months: string[] = [];
  const cursor = new Date(end);
  cursor.setMonth(cursor.getMonth() - (count - 1));
  while (cursor <= end) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}
