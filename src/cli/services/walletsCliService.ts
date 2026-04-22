import { prisma } from '@/core/db/prisma';

export type WalletListItem = {
  id: number;
  name: string;
  balance: number;
  excludeFromTotal: boolean;
  walletKind: 'basic' | 'goal' | 'credit_card';
  goalAmount: number | null;
  goalDueMonth: string | null;
  creditLimit: number | null;
};

export type WalletListSnapshot = {
  wallets: WalletListItem[];
  trackedTotalBalance: number;
  trackedWalletCount: number;
  excludedWalletCount: number;
};

export async function listWalletsForUser(
  userId: number,
): Promise<WalletListSnapshot> {
  const wallets = await prisma.wallet.findMany({
    where: { userId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      balance: true,
      excludeFromTotal: true,
      walletKind: true,
      goalAmount: true,
      goalDueMonth: true,
      creditLimit: true,
    },
  });

  return {
    wallets,
    trackedTotalBalance: wallets
      .filter((wallet) => !wallet.excludeFromTotal)
      .reduce((sum, wallet) => sum + wallet.balance, 0),
    trackedWalletCount: wallets.filter((wallet) => !wallet.excludeFromTotal)
      .length,
    excludedWalletCount: wallets.filter((wallet) => wallet.excludeFromTotal)
      .length,
  };
}
