import { WalletKind } from '@/features/wallets/types/wallets';
import { ValidationError } from '@/core/http/apiErrors';

/**
 * Calculate the net balance delta for a wallet given a cash-log entry.
 *
 * For credit-card wallets the sign is inverted because:
 * - "income" (payment) reduces the outstanding balance
 * - "outcome" (purchase) increases the outstanding balance
 *
 * Extracted from duplicated definitions in:
 * - src/app/api/cash-log/route.ts
 * - src/app/api/wallets/transfer/route.ts
 */
export function getWalletDelta(
  amount: number,
  type: 'income' | 'outcome',
  walletKind: WalletKind,
): number {
  const nominal = Math.abs(amount);
  const delta = type === 'income' ? nominal : -nominal;
  return walletKind === 'credit_card' ? -delta : delta;
}

/**
 * Assert that a credit-card wallet's next balance does not exceed its credit limit.
 * No-op for non-credit-card wallets.
 */
export function assertCreditLimit(
  nextBalance: number,
  walletKind: WalletKind,
  creditLimit: number | null,
): void {
  if (walletKind !== 'credit_card') return;
  if (typeof creditLimit !== 'number') {
    throw new ValidationError(
      'WALLET_VALIDATION',
      'Credit card wallet is missing credit limit',
    );
  }
  if (nextBalance > creditLimit) {
    throw new ValidationError(
      'WALLET_VALIDATION',
      'Credit card outstanding cannot exceed credit limit',
    );
  }
}
