export type WalletKind = 'basic' | 'goal' | 'credit_card';

export interface WalletsInput {
  name: string;
  balance: number;
  excludeFromTotal: boolean;
  walletKind: WalletKind;
  goalAmount: number | null;
  goalStartMonth: string | null;
  goalDueMonth: string | null;
  creditLimit: number | null;
  statementDay: number | null;
  dueDay: number | null;
}
