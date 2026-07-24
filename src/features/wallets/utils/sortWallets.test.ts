import { buildNextWallets } from './sortWallets';
import type { Wallets } from '@/features/wallets/services/walletsService';

function makeWallet(overrides: Partial<Wallets> & { id: number }): Wallets {
  return {
    name: 'Wallet',
    balance: 0,
    excludeFromTotal: false,
    walletKind: 'basic',
    goalAmount: null,
    goalStartMonth: null,
    goalDueMonth: null,
    creditLimit: null,
    statementDay: null,
    dueDay: null,
    ...overrides,
  };
}

describe('buildNextWallets', () => {
  describe('empty array', () => {
    it('returns null when the wallet is not found', () => {
      const result = buildNextWallets([], 1, false);
      expect(result).toBeNull();
    });
  });

  describe('single wallet', () => {
    it('returns the wallet with toggled excludeFromTotal when section unchanged', () => {
      const wallets = [makeWallet({ id: 1, name: 'Cash', excludeFromTotal: false })];
      const result = buildNextWallets(wallets, 1, false);
      expect(result).toHaveLength(1);
      expect(result![0].id).toBe(1);
      // excludeFromTotal gets toggled to !targetIncludeFromTotal
      expect(result![0].excludeFromTotal).toBe(true);
    });

    it('returns null when moving a credit card to "include in total"', () => {
      const wallets = [
        makeWallet({ id: 1, name: 'Card', walletKind: 'credit_card' }),
      ];
      const result = buildNextWallets(wallets, 1, true);
      expect(result).toBeNull();
    });
  });

  describe('two wallets with sortOrder', () => {
    it('reorders when moving within same excluded section', () => {
      const wallets = [
        makeWallet({ id: 1, name: 'Cash', excludeFromTotal: true }),
        makeWallet({ id: 2, name: 'Savings', excludeFromTotal: true }),
      ];
      // targetIncludeFromTotal=false means target section is "excluded"
      // source.excludeFromTotal=true, so !true===false → same section as target
      const result = buildNextWallets(wallets, 1, false, 2);
      expect(result).toHaveLength(2);
      expect(result![1].id).toBe(1);
    });

    it('reorders when moving second to first position (same included section)', () => {
      const wallets = [
        makeWallet({ id: 1, name: 'Cash', excludeFromTotal: false }),
        makeWallet({ id: 2, name: 'Savings', excludeFromTotal: false }),
      ];
      // targetIncludeFromTotal=true means target section is "included"
      // source.excludeFromTotal=false, so !false===true → same section
      const result = buildNextWallets(wallets, 2, true, 1);
      expect(result).toHaveLength(2);
      expect(result![0].id).toBe(2);
    });
  });

  describe('edge case: first wallet moved to last', () => {
    it('moves wallet within same included section to target position', () => {
      const wallets = [
        makeWallet({ id: 1, name: 'Cash', excludeFromTotal: false }),
        makeWallet({ id: 2, name: 'Savings', excludeFromTotal: false }),
        makeWallet({ id: 3, name: 'Investment', excludeFromTotal: false }),
      ];
      // Same included section: source.exc=false, targetInclude=true → same
      const result = buildNextWallets(wallets, 1, true, 3);
      expect(result).toHaveLength(3);
      // Wallet 1 moves after wallet 3 (since moving down within same section)
      expect(result![2].id).toBe(1);
    });
  });

  describe('moving between sections (excludeFromTotal toggle)', () => {
    it('moves a wallet from included to excluded section', () => {
      const wallets = [
        makeWallet({ id: 1, name: 'Cash', excludeFromTotal: false }),
        makeWallet({ id: 2, name: 'Hidden', excludeFromTotal: true }),
      ];
      const result = buildNextWallets(wallets, 1, true, 2);
      expect(result).toHaveLength(2);
      expect(result![1].excludeFromTotal).toBe(false);
    });
  });

  describe('target wallet not found', () => {
    it('returns null when toId does not exist', () => {
      const wallets = [
        makeWallet({ id: 1, name: 'Cash', excludeFromTotal: false }),
        makeWallet({ id: 2, name: 'Savings', excludeFromTotal: false }),
      ];
      const result = buildNextWallets(wallets, 1, false, 999);
      expect(result).toBeNull();
    });
  });

  describe('from wallet not found', () => {
    it('returns null when fromId does not exist', () => {
      const wallets = [
        makeWallet({ id: 1, name: 'Cash', excludeFromTotal: false }),
      ];
      const result = buildNextWallets(wallets, 999, false);
      expect(result).toBeNull();
    });
  });

  describe('no toId and targetIncludeFromTotal is true', () => {
    it('places the wallet at the beginning of excluded section', () => {
      const wallets = [
        makeWallet({ id: 1, name: 'Cash', excludeFromTotal: false }),
        makeWallet({ id: 2, name: 'Hidden', excludeFromTotal: true }),
        makeWallet({ id: 3, name: 'Savings', excludeFromTotal: false }),
      ];
      const result = buildNextWallets(wallets, 3, true);
      expect(result).toHaveLength(3);
      expect(result![1].id).toBe(3);
      expect(result![1].excludeFromTotal).toBe(false);
    });
  });
});
