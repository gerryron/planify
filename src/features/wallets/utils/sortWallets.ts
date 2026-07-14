import type { Wallets } from '@/features/wallets/services/walletsService';

export function buildNextWallets(
  wallets: Wallets[],
  fromId: number,
  targetIncludeFromTotal: boolean,
  toId?: number,
): Wallets[] | null {
  const fromIndex = wallets.findIndex((wallet) => wallet.id === fromId);
  if (fromIndex < 0) return null;

  const sourceWallet = wallets[fromIndex];
  if (sourceWallet.walletKind === 'credit_card' && targetIncludeFromTotal) {
    return null;
  }
  const withoutMoved = wallets.filter((wallet) => wallet.id !== fromId);

  let insertIndex = withoutMoved.length;
  if (toId) {
    const targetIndexInCurrent = wallets.findIndex((wallet) => wallet.id === toId);
    const targetIndex = withoutMoved.findIndex((wallet) => wallet.id === toId);
    if (targetIndexInCurrent < 0 || targetIndex < 0) return null;

    const movingWithinSameSection =
      !sourceWallet.excludeFromTotal === targetIncludeFromTotal;
    const movingDown = fromIndex < targetIndexInCurrent;

    insertIndex =
      movingWithinSameSection && movingDown ? targetIndex + 1 : targetIndex;
  } else if (targetIncludeFromTotal) {
    const firstExcludeIndex = withoutMoved.findIndex(
      (wallet) => wallet.excludeFromTotal,
    );
    insertIndex = firstExcludeIndex >= 0 ? firstExcludeIndex : withoutMoved.length;
  }

  const movedAfterDrop = {
    ...sourceWallet,
    excludeFromTotal: !targetIncludeFromTotal,
  };

  const nextWallets = [...withoutMoved];
  nextWallets.splice(insertIndex, 0, movedAfterDrop);
  return nextWallets;
}
