import type { WalletListItem } from '@/cli/services/walletsCliService';

export function formatRupiah(value: number) {
  const prefix = value < 0 ? '-Rp ' : 'Rp ';
  return `${prefix}${Math.abs(value).toLocaleString('id-ID')}`;
}

export function getWalletKindLabel(walletKind: WalletListItem['walletKind']) {
  if (walletKind === 'goal') {
    return 'Goal';
  }

  if (walletKind === 'credit_card') {
    return 'Credit Card';
  }

  return 'Basic';
}
