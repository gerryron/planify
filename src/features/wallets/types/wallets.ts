export type WalletKind = 'basic' | 'goal';

export interface WalletsInput {
  name: string;
  balance: number;
  excludeFromTotal: boolean;
  walletKind: WalletKind;
  goalAmount: number | null;
  goalStartMonth: string | null;
  goalDueMonth: string | null;
}
