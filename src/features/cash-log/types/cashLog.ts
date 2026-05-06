export type CashLogInput = {
  date: string;
  description: string;
  amount: number;
  walletName: string;
  categoryId: number;
  excludeFromReport: boolean;
};

export type CashLogCategory = {
  id: number;
  name: string;
  type: 'income' | 'outcome';
  parentId: number | null;
};

export type CashLogResponse = CashLogInput & {
  id: number;
  transferGroupId?: string | null;
  category: CashLogCategory | null;
};
