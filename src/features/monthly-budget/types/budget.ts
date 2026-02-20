export type BudgetInput = {
  name: string;
  amount: number;
  month: string;
  category: string;
  type: 'income' | 'outcome' | 'carryover';
};

export type BudgetResponse = BudgetInput & {
  id: string;
};
