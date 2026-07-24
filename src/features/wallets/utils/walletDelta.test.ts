import { getWalletDelta, assertCreditLimit } from './walletDelta';
import { ValidationError } from '@/core/http/apiErrors';

describe('getWalletDelta', () => {
  describe('basic wallet', () => {
    it('returns positive delta for income', () => {
      expect(getWalletDelta(1000, 'income', 'basic')).toBe(1000);
      expect(getWalletDelta(500, 'income', 'basic')).toBe(500);
    });

    it('returns negative delta for outcome', () => {
      expect(getWalletDelta(1000, 'outcome', 'basic')).toBe(-1000);
      expect(getWalletDelta(500, 'outcome', 'basic')).toBe(-500);
    });
  });

  describe('credit card wallet', () => {
    it('returns negative delta for income (payment reduces outstanding)', () => {
      expect(getWalletDelta(1000, 'income', 'credit_card')).toBe(-1000);
    });

    it('returns positive delta for outcome (purchase increases outstanding)', () => {
      expect(getWalletDelta(1000, 'outcome', 'credit_card')).toBe(1000);
    });
  });

  it('uses absolute value of amount (negative amounts are normalised)', () => {
    expect(getWalletDelta(-500, 'income', 'basic')).toBe(500);
    expect(getWalletDelta(-500, 'outcome', 'basic')).toBe(-500);
  });
});

describe('assertCreditLimit', () => {
  describe('non-credit-card wallet', () => {
    it('does not throw for a basic wallet', () => {
      expect(() => assertCreditLimit(10000, 'basic', null)).not.toThrow();
    });

    it('does not throw for a goal wallet', () => {
      expect(() => assertCreditLimit(10000, 'goal', null)).not.toThrow();
    });
  });

  describe('credit card within limit', () => {
    it('does not throw when next balance is under the limit', () => {
      expect(() => assertCreditLimit(5000, 'credit_card', 10000)).not.toThrow();
    });

    it('does not throw when next balance equals the limit', () => {
      expect(() => assertCreditLimit(10000, 'credit_card', 10000)).not.toThrow();
    });
  });

  describe('credit card exceeding limit', () => {
    it('throws ValidationError when next balance exceeds the limit', () => {
      expect(() => assertCreditLimit(15000, 'credit_card', 10000)).toThrow(ValidationError);
    });

    it('throws with the correct error code and message', () => {
      try {
        assertCreditLimit(15000, 'credit_card', 10000);
        fail('Expected ValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe('WALLET_VALIDATION');
        expect((error as ValidationError).message).toBe(
          'Credit card outstanding cannot exceed credit limit',
        );
      }
    });
  });

  describe('credit card missing credit limit', () => {
    it('throws ValidationError when credit limit is null', () => {
      expect(() => assertCreditLimit(5000, 'credit_card', null)).toThrow(ValidationError);
    });

    it('throws with the correct error code and message for missing limit', () => {
      try {
        assertCreditLimit(5000, 'credit_card', null);
        fail('Expected ValidationError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).code).toBe('WALLET_VALIDATION');
        expect((error as ValidationError).message).toBe(
          'Credit card wallet is missing credit limit',
        );
      }
    });
  });
});
