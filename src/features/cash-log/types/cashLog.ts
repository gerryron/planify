export type CashLogInput = {
  date: string;
  description: string;
  amount: number;
  walletName: string;
};

export type CashLogResponse = CashLogInput & {
  id: string;
};
