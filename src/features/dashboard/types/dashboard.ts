export interface DashboardWallet {
  id: number;
  name: string;
  balance: number;
  excludeFromTotal: boolean;
}

export interface DashboardBudget {
  id: number;
  name: string;
  amount: number;
  month: string;
  category: string;
  type: 'income' | 'outcome' | 'carryover';
  isDone: boolean;
}

export interface DashboardCashLog {
  id: number;
  date: string;
  description: string;
  amount: number;
  walletName: string;
  categoryId: number;
  excludeFromReport: boolean;
  category: {
    id: number;
    name: string;
    type: 'income' | 'outcome';
    parentId: number | null;
  } | null;
}

export interface DashboardCategory {
  id: number;
  name: string;
  type: 'income' | 'outcome';
  parentId: number | null;
}

export interface MonthlyTrend {
  month: string;
  label: string;
  income: number;
  outcome: number;
  balance: number;
}

export interface CategoryBreakdown {
  name: string;
  amount: number;
  fill: string;
}
