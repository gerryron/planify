import { NextRequest, NextResponse } from 'next/server';
import { WalletsInput } from '@/features/wallets/types/wallets';
import { prisma } from '@/core/db/prisma';
import { ok, badRequest, serverError } from '@/core/http/apiResponse';
import { requireAuth } from '@/core/auth/requireAuth';
import { WalletKind } from '@/features/wallets/types/wallets';

function isValidDueMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isWalletKind(value: unknown): value is WalletsInput['walletKind'] {
  return value === 'basic' || value === 'goal' || value === 'credit_card';
}

function isValidDayOfMonth(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 31;
}

function toId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function getAdjustmentCategoryType(
  balanceDelta: number,
  walletKind: WalletKind,
): 'income' | 'outcome' {
  if (walletKind === 'credit_card') {
    return balanceDelta > 0 ? 'outcome' : 'income';
  }

  return balanceDelta > 0 ? 'income' : 'outcome';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const {
      name,
      balance,
      excludeFromTotal,
      walletKind,
      goalAmount,
      goalStartMonth,
      goalDueMonth,
      creditLimit,
      statementDay,
      dueDay,
    }: Partial<WalletsInput> = await req.json();

    if (!name?.trim() || balance === undefined || !isWalletKind(walletKind)) {
      return badRequest('All fields are required');
    }

    if (walletKind === 'goal') {
      if (
        typeof goalAmount !== 'number' ||
        !Number.isInteger(goalAmount) ||
        goalAmount <= 0
      ) {
        return badRequest('Savings Goal must be greater than 0');
      }
      if (!goalDueMonth || !isValidDueMonth(goalDueMonth)) {
        return badRequest('Due Month must be in YYYY-MM format');
      }
      if (
        creditLimit !== undefined ||
        statementDay !== undefined ||
        dueDay !== undefined
      ) {
        return badRequest('Credit card fields are not allowed for Goal Wallet');
      }
    } else if (
      (goalAmount !== undefined && goalAmount !== null) ||
      (goalStartMonth !== undefined && goalStartMonth !== null) ||
      (goalDueMonth !== undefined && goalDueMonth !== null)
    ) {
      return badRequest('Goal fields are only allowed for Goal Wallet');
    }

    if (walletKind === 'credit_card') {
      if (
        typeof creditLimit !== 'number' ||
        !Number.isInteger(creditLimit) ||
        creditLimit <= 0
      ) {
        return badRequest('Credit limit must be greater than 0');
      }
      if (
        typeof statementDay !== 'number' ||
        !Number.isInteger(statementDay) ||
        !isValidDayOfMonth(statementDay)
      ) {
        return badRequest('Statement day must be between 1 and 31');
      }
      if (
        typeof dueDay !== 'number' ||
        !Number.isInteger(dueDay) ||
        !isValidDayOfMonth(dueDay)
      ) {
        return badRequest('Due day must be between 1 and 31');
      }
      if (
        typeof balance === 'number' &&
        typeof creditLimit === 'number' &&
        balance > creditLimit
      ) {
        return badRequest('Outstanding balance cannot exceed credit limit');
      }
    } else if (
      (creditLimit !== undefined && creditLimit !== null) ||
      (statementDay !== undefined && statementDay !== null) ||
      (dueDay !== undefined && dueDay !== null)
    ) {
      return badRequest(
        'Credit card fields are only allowed for Credit Card Wallet',
      );
    }

    const wallet = await prisma.$transaction(async (tx) => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const lastWallet = await tx.wallet.findFirst({
        where: { userId: auth.user.sub },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });

      const created = await tx.wallet.create({
        data: {
          userId: auth.user.sub,
          name: name.trim(),
          balance,
          excludeFromTotal:
            walletKind === 'goal' || walletKind === 'credit_card'
              ? true
              : (excludeFromTotal ?? false),
          walletKind,
          goalAmount: walletKind === 'goal' ? goalAmount : null,
          goalStartMonth:
            walletKind === 'goal' ? (goalStartMonth ?? currentMonth) : null,
          goalDueMonth: walletKind === 'goal' ? goalDueMonth : null,
          creditLimit: walletKind === 'credit_card' ? creditLimit : null,
          statementDay: walletKind === 'credit_card' ? statementDay : null,
          dueDay: walletKind === 'credit_card' ? dueDay : null,
          sortOrder: (lastWallet?.sortOrder ?? -1) + 1,
        },
      });

      if (balance !== 0) {
        const today = new Date().toISOString().slice(0, 10);
        const adjustmentCategoryType = getAdjustmentCategoryType(
          balance,
          created.walletKind,
        );
        const targetCategory = await tx.category.findFirst({
          where: {
            OR: [{ systemDefault: true }, { userId: auth.user.sub }],
            name:
              adjustmentCategoryType === 'income'
                ? 'Transfer In'
                : 'Transfer Out',
            type: adjustmentCategoryType,
          },
          select: { id: true },
        });

        if (!targetCategory) {
          throw new Error('TRANSFER_CATEGORY_NOT_FOUND');
        }

        await tx.cashLog.create({
          data: {
            userId: auth.user.sub,
            date: today,
            description: 'Adjust Balance',
            amount: Math.abs(balance),
            walletName: created.name,
            excludeFromReport: true,
            categoryId: targetCategory.id,
          },
        });
      }

      return created;
    });

    return ok(wallet, 201);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'TRANSFER_CATEGORY_NOT_FOUND'
    ) {
      return badRequest('Transfer category not found');
    }
    return badRequest('Failed to create wallet');
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId: auth.user.sub },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return ok(wallets);
  } catch (error) {
    console.error('GET /api/wallets error:', error);
    const message = error instanceof Error ? error.message : undefined;
    return serverError(message);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const payload: Partial<WalletsInput> & {
      id?: number | string;
      orderedIds?: Array<number | string>;
    } = await req.json();

    if (Array.isArray(payload.orderedIds)) {
      const orderedIds = payload.orderedIds
        .map((item) => toId(item))
        .filter((item): item is number => item !== null);

      if (orderedIds.length === 0) {
        return badRequest('orderedIds is required');
      }

      const ownedCount = await prisma.wallet.count({
        where: {
          userId: auth.user.sub,
          id: { in: orderedIds },
        },
      });

      if (ownedCount !== orderedIds.length) {
        return badRequest('Some wallets are not found for current user');
      }

      await prisma.$transaction(
        orderedIds.map((walletId, index) =>
          prisma.wallet.update({
            where: { id: walletId },
            data: { sortOrder: index },
          }),
        ),
      );

      return ok({ success: true });
    }

    const { id, ...data } = payload;
    const numericId = toId(id);

    if (!numericId) return badRequest('ID is required');

    const wallet = await prisma.$transaction(async (tx) => {
      const existing = await tx.wallet.findFirst({
        where: { id: numericId, userId: auth.user.sub },
        select: {
          id: true,
          name: true,
          balance: true,
          walletKind: true,
          goalAmount: true,
          goalStartMonth: true,
          goalDueMonth: true,
          creditLimit: true,
          statementDay: true,
          dueDay: true,
        },
      });

      if (!existing) {
        throw new Error('WALLET_NOT_FOUND');
      }

      if (
        data.walletKind !== undefined &&
        data.walletKind !== existing.walletKind
      ) {
        throw new Error('WALLET_KIND_IMMUTABLE');
      }

      if (existing.walletKind === 'goal') {
        if (data.goalAmount !== undefined) {
          if (
            typeof data.goalAmount !== 'number' ||
            !Number.isInteger(data.goalAmount) ||
            data.goalAmount <= 0
          ) {
            throw new Error('GOAL_AMOUNT_INVALID');
          }
        }

        if (data.goalDueMonth !== undefined) {
          if (!data.goalDueMonth || !isValidDueMonth(data.goalDueMonth)) {
            throw new Error('GOAL_DUE_MONTH_INVALID');
          }
        }

        if (
          data.goalStartMonth !== undefined &&
          data.goalStartMonth !== existing.goalStartMonth
        ) {
          throw new Error('GOAL_START_MONTH_IMMUTABLE');
        }
      } else {
        if (
          (data.goalAmount !== undefined && data.goalAmount !== null) ||
          (data.goalDueMonth !== undefined && data.goalDueMonth !== null) ||
          (data.goalStartMonth !== undefined && data.goalStartMonth !== null)
        ) {
          throw new Error('GOAL_FIELDS_NOT_ALLOWED');
        }
      }

      if (existing.walletKind === 'credit_card') {
        const nextCreditLimit =
          data.creditLimit !== undefined
            ? data.creditLimit
            : existing.creditLimit;
        const nextStatementDay =
          data.statementDay !== undefined
            ? data.statementDay
            : existing.statementDay;
        const nextDueDay =
          data.dueDay !== undefined ? data.dueDay : existing.dueDay;
        const nextBalance =
          data.balance !== undefined ? data.balance : existing.balance;

        if (
          typeof nextCreditLimit !== 'number' ||
          !Number.isInteger(nextCreditLimit) ||
          nextCreditLimit <= 0
        ) {
          throw new Error('CREDIT_LIMIT_INVALID');
        }

        if (
          typeof nextStatementDay !== 'number' ||
          !Number.isInteger(nextStatementDay) ||
          !isValidDayOfMonth(nextStatementDay)
        ) {
          throw new Error('STATEMENT_DAY_INVALID');
        }

        if (
          typeof nextDueDay !== 'number' ||
          !Number.isInteger(nextDueDay) ||
          !isValidDayOfMonth(nextDueDay)
        ) {
          throw new Error('DUE_DAY_INVALID');
        }

        if (
          typeof nextCreditLimit === 'number' &&
          typeof nextBalance === 'number' &&
          nextBalance > nextCreditLimit
        ) {
          throw new Error('CREDIT_LIMIT_EXCEEDED');
        }
      } else if (
        (data.creditLimit !== undefined && data.creditLimit !== null) ||
        (data.statementDay !== undefined && data.statementDay !== null) ||
        (data.dueDay !== undefined && data.dueDay !== null)
      ) {
        throw new Error('CREDIT_CARD_FIELDS_NOT_ALLOWED');
      }

      const updateData: Partial<WalletsInput> = { ...data };
      delete updateData.walletKind;

      if (existing.walletKind === 'goal') {
        updateData.excludeFromTotal = true;
        updateData.goalStartMonth = existing.goalStartMonth;
      } else if (existing.walletKind === 'credit_card') {
        updateData.excludeFromTotal = true;
      }

      const updated = await tx.wallet.update({
        where: { id: numericId },
        data: updateData,
      });

      if (
        updateData.balance !== undefined &&
        updateData.balance !== existing.balance
      ) {
        const today = new Date().toISOString().slice(0, 10);
        const adjustmentAmount = updateData.balance - existing.balance;
        const adjustmentNominal = Math.abs(adjustmentAmount);
        const adjustmentCategoryType = getAdjustmentCategoryType(
          adjustmentAmount,
          existing.walletKind,
        );
        const targetCategory = await tx.category.findFirst({
          where: {
            OR: [{ systemDefault: true }, { userId: auth.user.sub }],
            name:
              adjustmentCategoryType === 'income'
                ? 'Transfer In'
                : 'Transfer Out',
            type: adjustmentCategoryType,
          },
          select: { id: true },
        });

        if (!targetCategory) {
          throw new Error('TRANSFER_CATEGORY_NOT_FOUND');
        }

        await tx.cashLog.create({
          data: {
            userId: auth.user.sub,
            date: today,
            description: 'Adjust Balance',
            amount: adjustmentNominal,
            walletName: updated.name,
            excludeFromReport: true,
            categoryId: targetCategory.id,
          },
        });
      }

      return updated;
    });

    return ok(wallet);
  } catch (error) {
    if (error instanceof Error && error.message === 'WALLET_NOT_FOUND') {
      return badRequest('Wallet not found');
    }
    if (error instanceof Error && error.message === 'WALLET_KIND_IMMUTABLE') {
      return badRequest('Wallet type cannot be changed once created');
    }
    if (error instanceof Error && error.message === 'GOAL_AMOUNT_INVALID') {
      return badRequest('Savings Goal must be greater than 0');
    }
    if (error instanceof Error && error.message === 'GOAL_DUE_MONTH_INVALID') {
      return badRequest('Due Month must be in YYYY-MM format');
    }
    if (error instanceof Error && error.message === 'GOAL_FIELDS_NOT_ALLOWED') {
      return badRequest('Goal fields are only allowed for Goal Wallet');
    }
    if (
      error instanceof Error &&
      error.message === 'GOAL_START_MONTH_IMMUTABLE'
    ) {
      return badRequest('Goal start month cannot be changed');
    }
    if (error instanceof Error && error.message === 'CREDIT_LIMIT_INVALID') {
      return badRequest('Credit limit must be greater than 0');
    }
    if (error instanceof Error && error.message === 'STATEMENT_DAY_INVALID') {
      return badRequest('Statement day must be between 1 and 31');
    }
    if (error instanceof Error && error.message === 'DUE_DAY_INVALID') {
      return badRequest('Due day must be between 1 and 31');
    }
    if (error instanceof Error && error.message === 'CREDIT_LIMIT_EXCEEDED') {
      return badRequest('Outstanding balance cannot exceed credit limit');
    }
    if (
      error instanceof Error &&
      error.message === 'CREDIT_CARD_FIELDS_NOT_ALLOWED'
    ) {
      return badRequest(
        'Credit card fields are only allowed for Credit Card Wallet',
      );
    }
    if (
      error instanceof Error &&
      error.message === 'TRANSFER_CATEGORY_NOT_FOUND'
    ) {
      return badRequest('Transfer category not found');
    }
    return badRequest('Failed to update wallet');
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const raw = (await req.json()) as { id?: number | string };
    const id = toId(raw.id);
    if (!id) return badRequest('ID is required');

    const owned = await prisma.wallet.findFirst({
      where: { id, userId: auth.user.sub },
      select: { id: true },
    });

    if (!owned) {
      return badRequest('Wallet not found');
    }

    const totalWallets = await prisma.wallet.count({
      where: { userId: auth.user.sub },
    });
    if (totalWallets <= 1) {
      return badRequest('Wallet must be at least 1');
    }

    await prisma.wallet.delete({ where: { id } });

    return ok({ success: true });
  } catch {
    return badRequest('Failed to delete wallet');
  }
}
