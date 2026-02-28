export type CashLogInput = {
  date: string;
  description: string;
  amount: number;
  walletName: string;
  categoryId: string;
};

export type CashLogCategory = {
  id: string;
  name: string;
  type: 'income' | 'outcome';
  parentId: string | null;
};

export type CashLogResponse = CashLogInput & {
  id: string;
  category: CashLogCategory | null;
};
