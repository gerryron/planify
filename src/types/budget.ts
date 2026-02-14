export type BudgetInput = {
  name: string;
  amount: number;
  month: string;
  category: string;
  type: 'income' | 'outcome' | 'carryover';
};
