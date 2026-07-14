import { validateWalletFields } from './validation';

describe('validateWalletFields', () => {
  // ─── POST (isUpdate=false) ───

  describe('POST — required fields', () => {
    it('passes basic wallet with name and balance', () => {
      const result = validateWalletFields({
        name: 'My Wallet',
        balance: 100000,
        walletKind: 'basic',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when name is missing', () => {
      const result = validateWalletFields({ balance: 1000, walletKind: 'basic' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nama wallet harus diisi');
    });

    it('fails when name is empty string', () => {
      const result = validateWalletFields({ name: '  ', balance: 1000, walletKind: 'basic' });
      expect(result.valid).toBe(false);
    });

    it('fails when balance is missing', () => {
      const result = validateWalletFields({ name: 'Wallet', walletKind: 'basic' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Balance harus diisi');
    });

    it('fails when walletKind is missing', () => {
      const result = validateWalletFields({ name: 'Wallet', balance: 1000 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Wallet kind harus diisi');
    });
  });

  // ─── Goal wallet validation ───

  describe('POST — goal wallet', () => {
    it('passes with valid goal fields', () => {
      const result = validateWalletFields({
        name: 'Emergency',
        balance: 0,
        walletKind: 'goal',
        goalAmount: 5000000,
        goalDueMonth: '2026-12',
      });
      expect(result.valid).toBe(true);
    });

    it('fails when goalAmount is missing for goal wallet', () => {
      const result = validateWalletFields({
        name: 'Goal', balance: 0, walletKind: 'goal', goalDueMonth: '2026-12',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Savings Goal must be greater than 0');
    });

    it('fails when goalAmount is 0', () => {
      const result = validateWalletFields({
        name: 'Goal', balance: 0, walletKind: 'goal', goalAmount: 0, goalDueMonth: '2026-12',
      });
      expect(result.valid).toBe(false);
    });

    it('fails when goalAmount is negative', () => {
      const result = validateWalletFields({
        name: 'Goal', balance: 0, walletKind: 'goal', goalAmount: -100, goalDueMonth: '2026-12',
      });
      expect(result.valid).toBe(false);
    });

    it('fails when goalDueMonth is missing for goal wallet', () => {
      const result = validateWalletFields({
        name: 'Goal', balance: 0, walletKind: 'goal', goalAmount: 5000,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Due Month must be in YYYY-MM format');
    });

    it('fails when goalDueMonth has invalid format', () => {
      const result = validateWalletFields({
        name: 'Goal', balance: 0, walletKind: 'goal', goalAmount: 5000, goalDueMonth: '13-2026',
      });
      expect(result.valid).toBe(false);
    });

    it('fails when credit card fields are provided for goal wallet', () => {
      const result = validateWalletFields({
        name: 'Goal', balance: 0, walletKind: 'goal', goalAmount: 5000, goalDueMonth: '2026-12',
        creditLimit: 10000,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Credit card fields are not allowed for Goal Wallet');
    });
  });

  // ─── Credit card wallet validation ───

  describe('POST — credit card wallet', () => {
    it('passes with valid credit card fields', () => {
      const result = validateWalletFields({
        name: 'Visa', balance: 0, walletKind: 'credit_card',
        creditLimit: 10000000, statementDay: 15, dueDay: 5,
      });
      expect(result.valid).toBe(true);
    });

    it('fails when creditLimit is missing for credit card', () => {
      const result = validateWalletFields({
        name: 'Card', balance: 0, walletKind: 'credit_card', statementDay: 15, dueDay: 5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Credit limit must be greater than 0');
    });

    it('fails when creditLimit is 0', () => {
      const result = validateWalletFields({
        name: 'Card', balance: 0, walletKind: 'credit_card',
        creditLimit: 0, statementDay: 15, dueDay: 5,
      });
      expect(result.valid).toBe(false);
    });

    it('fails when statementDay is missing', () => {
      const result = validateWalletFields({
        name: 'Card', balance: 0, walletKind: 'credit_card',
        creditLimit: 5000, dueDay: 5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Statement day must be between 1 and 31');
    });

    it('fails when statementDay is out of range (>31)', () => {
      const result = validateWalletFields({
        name: 'Card', balance: 0, walletKind: 'credit_card',
        creditLimit: 5000, statementDay: 32, dueDay: 5,
      });
      expect(result.valid).toBe(false);
    });

    it('fails when dueDay is out of range (0)', () => {
      const result = validateWalletFields({
        name: 'Card', balance: 0, walletKind: 'credit_card',
        creditLimit: 5000, statementDay: 15, dueDay: 0,
      });
      expect(result.valid).toBe(false);
    });

    it('fails when balance exceeds credit limit', () => {
      const result = validateWalletFields({
        name: 'Card', balance: 6000, walletKind: 'credit_card',
        creditLimit: 5000, statementDay: 15, dueDay: 5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Outstanding balance cannot exceed credit limit');
    });
  });

  // ─── Cross-kind field rejection ───

  describe('cross-kind field rejection', () => {
    it('rejects goal fields on basic wallet', () => {
      const result = validateWalletFields({
        name: 'Basic', balance: 100, walletKind: 'basic', goalAmount: 5000,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Goal fields are only allowed for Goal Wallet');
    });

    it('rejects credit card fields on basic wallet', () => {
      const result = validateWalletFields({
        name: 'Basic', balance: 100, walletKind: 'basic', creditLimit: 5000,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Credit card fields are only allowed for Credit Card Wallet');
    });
  });

  // ─── PATCH (isUpdate=true) ───

  describe('PATCH — partial updates', () => {
    it('passes with only name update', () => {
      const result = validateWalletFields({ name: 'Renamed' }, true);
      expect(result.valid).toBe(true);
    });

    it('passes with only balance update', () => {
      const result = validateWalletFields({ balance: 50000 }, true);
      expect(result.valid).toBe(true);
    });

    it('validates goalAmount when provided in update', () => {
      const result = validateWalletFields({ goalAmount: 0, walletKind: 'goal' }, true);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Savings Goal must be greater than 0');
    });

    it('validates creditLimit when provided in update', () => {
      const result = validateWalletFields({ creditLimit: -100, walletKind: 'credit_card' }, true);
      expect(result.valid).toBe(false);
    });

    it('allows partial credit card update without requiring statement day', () => {
      const result = validateWalletFields({ creditLimit: 10000, walletKind: 'credit_card' }, true);
      expect(result.valid).toBe(true);
    });

    it('allows partial goal update without requiring due month', () => {
      const result = validateWalletFields({ goalAmount: 5000, walletKind: 'goal' }, true);
      expect(result.valid).toBe(true);
    });
  });
});
