// ---------------------------------------------------------------------------
// Shared wallet validation – used by both POST and PATCH routes.
// Eliminates the duplicated validation logic that was copy‑pasted between
// the two handlers (~120 lines each → <20 lines each).
// ---------------------------------------------------------------------------

import { WalletKind } from '@/features/wallets/types/wallets';

export interface WalletFields {
  name?: string;
  balance?: number;
  walletKind?: WalletKind;
  goalAmount?: number | null;
  goalStartMonth?: string | null;
  goalDueMonth?: string | null;
  creditLimit?: number | null;
  statementDay?: number | null;
  dueDay?: number | null;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isValidDueMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isValidDayOfMonth(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 31;
}

/** A field is "present" only if it is neither undefined nor explicit null. */
function isPresent<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}

// ---------------------------------------------------------------------------
// Main validator
// ---------------------------------------------------------------------------

/**
 * Validate wallet input fields.
 *
 * @param fields   - The wallet fields to validate.
 * @param isUpdate - If true, only validates fields that are present (partial update).
 *                    If false (POST), validates required fields.
 */
export function validateWalletFields(
  fields: WalletFields,
  isUpdate = false,
): ValidationResult {
  const errors: string[] = [];

  // --- Common required fields (POST only) ---
  if (!isUpdate) {
    if (!fields.name?.trim()) {
      errors.push('Nama wallet harus diisi');
    }
    if (!isPresent(fields.balance)) {
      errors.push('Balance harus diisi');
    }
    if (!fields.walletKind) {
      errors.push('Wallet kind harus diisi');
    }
  }

  const kind = fields.walletKind;

  // --- Goal wallet validation ---
  if (kind === 'goal') {
    if (isPresent(fields.goalAmount)) {
      if (
        typeof fields.goalAmount !== 'number' ||
        !Number.isInteger(fields.goalAmount) ||
        fields.goalAmount <= 0
      ) {
        errors.push('Savings Goal must be greater than 0');
      }
    } else if (!isUpdate) {
      errors.push('Savings Goal must be greater than 0');
    }

    if (isPresent(fields.goalDueMonth)) {
      if (!fields.goalDueMonth || !isValidDueMonth(fields.goalDueMonth)) {
        errors.push('Due Month must be in YYYY-MM format');
      }
    } else if (!isUpdate) {
      errors.push('Due Month must be in YYYY-MM format');
    }

    // Credit card fields not allowed for goal wallets (explicit null is OK – JSON null)
    if (
      isPresent(fields.creditLimit) ||
      isPresent(fields.statementDay) ||
      isPresent(fields.dueDay)
    ) {
      errors.push('Credit card fields are not allowed for Goal Wallet');
    }
  }

  // --- Credit card wallet validation ---
  if (kind === 'credit_card') {
    const limit = fields.creditLimit;
    const stmt = fields.statementDay;
    const due = fields.dueDay;

    if (isPresent(limit)) {
      if (
        typeof limit !== 'number' ||
        !Number.isInteger(limit) ||
        limit <= 0
      ) {
        errors.push('Credit limit must be greater than 0');
      }
    } else if (!isUpdate) {
      errors.push('Credit limit must be greater than 0');
    }

    if (isPresent(stmt)) {
      if (
        typeof stmt !== 'number' ||
        !Number.isInteger(stmt) ||
        !isValidDayOfMonth(stmt)
      ) {
        errors.push('Statement day must be between 1 and 31');
      }
    } else if (!isUpdate) {
      errors.push('Statement day must be between 1 and 31');
    }

    if (isPresent(due)) {
      if (
        typeof due !== 'number' ||
        !Number.isInteger(due) ||
        !isValidDayOfMonth(due)
      ) {
        errors.push('Due day must be between 1 and 31');
      }
    } else if (!isUpdate) {
      errors.push('Due day must be between 1 and 31');
    }

    // Balance vs credit limit
    if (
      typeof fields.balance === 'number' &&
      typeof limit === 'number' &&
      fields.balance > limit
    ) {
      errors.push('Outstanding balance cannot exceed credit limit');
    }
  }

  // --- Non-goal wallets should not have goal fields ---
  if (kind && kind !== 'goal') {
    if (
      isPresent(fields.goalAmount) ||
      isPresent(fields.goalStartMonth) ||
      isPresent(fields.goalDueMonth)
    ) {
      errors.push('Goal fields are only allowed for Goal Wallet');
    }
  }

  // --- Non-credit-card wallets should not have credit card fields ---
  if (kind && kind !== 'credit_card') {
    if (
      isPresent(fields.creditLimit) ||
      isPresent(fields.statementDay) ||
      isPresent(fields.dueDay)
    ) {
      errors.push('Credit card fields are only allowed for Credit Card Wallet');
    }
  }

  return { valid: errors.length === 0, errors };
}
