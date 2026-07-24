import { NextRequest, NextResponse } from 'next/server';
import { WalletsInput } from '@/features/wallets/types/wallets';
import { prisma } from '@/core/db/prisma';
import { ok, badRequest } from '@/core/http/apiResponse';
import { requireAuth } from '@/core/auth/requireAuth';
import { WalletKind } from '@/features/wallets/types/wallets';
import {
  validateWalletFields,
} from '@/features/wallets/utils/validation';
import {
  AppError,
  ValidationError,
  NotFoundError,
  handleApiError,
} from '@/core/http/apiErrors';
import { toId } from '@/shared/utils/routeHelpers';

function isWalletKind(value: unknown): value is WalletKind {
  return value === 'basic' || value === 'goal' || value === 'credit_card';
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

// ---------------------------------------------------------------------------
// POST – Create wallet
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as Partial<WalletsInput>;
    const { name, balance, excludeFromTotal, walletKind, goalAmount, goalStartMonth, goalDueMonth, creditLimit, statementDay, dueDay } = body;

    if (!isWalletKind(walletKind)) {
      return badRequest('All fields are required');
    }

    // Shared validation (replaces ~80 lines of inline checks)
    const validation = validateWalletFields({
      name,
      balance,
      walletKind,
      goalAmount,
      goalStartMonth,
      goalDueMonth,
      creditLimit,
      statementDay,
      dueDay,
    });

    if (!validation.valid) {
      return badRequest(validation.errors[0]);
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
          name: name!.trim(),
          balance: balance!,
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
        const adjustmentCategoryType = getAdjustmentCategoryType(balance!, created.walletKind);
        const targetCategory = await tx.category.findFirst({
          where: {
            OR: [{ systemDefault: true }, { userId: auth.user.sub }],
            name: adjustmentCategoryType === 'income' ? 'Transfer In' : 'Transfer Out',
            type: adjustmentCategoryType,
          },
          select: { id: true },
        });

        if (!targetCategory) {
          throw new AppError('CATEGORY_DEFAULT_PROTECTED', 'Transfer category not found', 400);
        }

        await tx.cashLog.create({
          data: {
            userId: auth.user.sub,
            walletId: created.id,
            date: today,
            description: 'Adjust Balance',
            amount: Math.abs(balance!),
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
    return handleApiError(error);
  }
}

// ---------------------------------------------------------------------------
// GET – List wallets
// ---------------------------------------------------------------------------
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
    return handleApiError(error);
  }
}

// ---------------------------------------------------------------------------
// PATCH – Update wallet or reorder
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const payload: Partial<WalletsInput> & {
      id?: number | string;
      orderedIds?: Array<number | string>;
    } = await req.json();

    // -- Reorder branch --
    if (Array.isArray(payload.orderedIds)) {
      const orderedIds = payload.orderedIds
        .map((item) => toId(item))
        .filter((item): item is number => item !== null);

      if (orderedIds.length === 0) {
        throw new ValidationError('WALLET_VALIDATION', 'orderedIds is required');
      }

      const ownedCount = await prisma.wallet.count({
        where: { userId: auth.user.sub, id: { in: orderedIds } },
      });

      if (ownedCount !== orderedIds.length) {
        throw new ValidationError('WALLET_VALIDATION', 'Some wallets are not found for current user');
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

    // -- Update branch --
    const { id, ...data } = payload;
    const numericId = toId(id);

    if (!numericId) {
      throw new ValidationError('WALLET_VALIDATION', 'ID is required');
    }

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
        throw new NotFoundError('WALLET_NOT_FOUND', 'Wallet');
      }

      // Wallet kind is immutable
      if (data.walletKind !== undefined && data.walletKind !== existing.walletKind) {
        throw new ValidationError('WALLET_VALIDATION', 'Wallet type cannot be changed once created');
      }

      // Goal start month is immutable
      if (
        existing.walletKind === 'goal' &&
        data.goalStartMonth !== undefined &&
        data.goalStartMonth !== existing.goalStartMonth
      ) {
        throw new ValidationError('WALLET_VALIDATION', 'Goal start month cannot be changed');
      }

      // Shared validation for partial update
      const validation = validateWalletFields(
        {
          walletKind: existing.walletKind,
          goalAmount: data.goalAmount,
          goalDueMonth: data.goalDueMonth,
          creditLimit: data.creditLimit,
          statementDay: data.statementDay,
          dueDay: data.dueDay,
          balance: data.balance !== undefined ? data.balance : existing.balance,
        },
        true, // isUpdate
      );

      if (!validation.valid) {
        throw new ValidationError('WALLET_VALIDATION', validation.errors.join('; '));
      }

      // Credit card: merge existing fields for validation
      if (existing.walletKind === 'credit_card') {
        const nextCreditLimit = data.creditLimit !== undefined ? data.creditLimit : existing.creditLimit;
        const nextBalance = data.balance !== undefined ? data.balance : existing.balance;

        if (
          typeof nextCreditLimit === 'number' &&
          typeof nextBalance === 'number' &&
          nextBalance > nextCreditLimit
        ) {
          throw new ValidationError('WALLET_VALIDATION', 'Outstanding balance cannot exceed credit limit');
        }
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

      // Sync wallet name in cash logs
      if (updated.name !== existing.name) {
        await tx.cashLog.updateMany({
          where: { userId: auth.user.sub, walletName: existing.name },
          data: { walletName: updated.name },
        });
      }

      // Adjust balance: create adjustment cash log if balance changed
      if (updateData.balance !== undefined && updateData.balance !== existing.balance) {
        const today = new Date().toISOString().slice(0, 10);
        const adjustmentAmount = updateData.balance - existing.balance;
        const adjustmentCategoryType = getAdjustmentCategoryType(adjustmentAmount, existing.walletKind);
        const targetCategory = await tx.category.findFirst({
          where: {
            OR: [{ systemDefault: true }, { userId: auth.user.sub }],
            name: adjustmentCategoryType === 'income' ? 'Transfer In' : 'Transfer Out',
            type: adjustmentCategoryType,
          },
          select: { id: true },
        });

        if (!targetCategory) {
          throw new AppError('CATEGORY_DEFAULT_PROTECTED', 'Transfer category not found', 400);
        }

        await tx.cashLog.create({
          data: {
            userId: auth.user.sub,
            walletId: updated.id,
            date: today,
            description: 'Adjust Balance',
            amount: Math.abs(adjustmentAmount),
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
    return handleApiError(error);
  }
}

// ---------------------------------------------------------------------------
// DELETE – Delete wallet
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const raw = (await req.json()) as { id?: number | string };
    const id = toId(raw.id);
    if (!id) return badRequest('ID is required');

    const owned = await prisma.wallet.findFirst({
      where: { id, userId: auth.user.sub },
      select: { id: true, name: true },
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

    const deletedCashLogCount = await prisma.$transaction(async (tx) => {
      const deletedLogs = await tx.cashLog.deleteMany({
        where: { userId: auth.user.sub, walletId: owned.id },
      });
      await tx.wallet.delete({ where: { id } });
      return deletedLogs.count;
    });

    return ok({ success: true, deletedCashLogCount });
  } catch (error) {
    return handleApiError(error);
  }
}
