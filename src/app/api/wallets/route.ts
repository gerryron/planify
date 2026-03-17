import { NextRequest, NextResponse } from 'next/server';
import { WalletsInput } from '@/features/wallets/types/wallets';
import { prisma } from '@/core/db/prisma';
import { ok, badRequest, serverError } from '@/core/http/apiResponse';

function isValidDueMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function isWalletKind(value: unknown): value is WalletsInput['walletKind'] {
  return value === 'basic' || value === 'goal';
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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const {
      name,
      balance,
      excludeFromTotal,
      walletKind,
      goalAmount,
      goalStartMonth,
      goalDueMonth,
    }: Partial<WalletsInput> = await req.json();

    if (!name?.trim() || balance === undefined || !isWalletKind(walletKind)) {
      return badRequest('All fields are required');
    }

    if (walletKind === 'goal') {
      if (!Number.isInteger(goalAmount) || goalAmount <= 0) {
        return badRequest('Savings Goal must be greater than 0');
      }
      if (!goalDueMonth || !isValidDueMonth(goalDueMonth)) {
        return badRequest('Due Month must be in YYYY-MM format');
      }
    }

    const wallet = await prisma.$transaction(async (tx) => {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const lastWallet = await tx.wallet.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });

      const created = await tx.wallet.create({
        data: {
          name: name.trim(),
          balance,
          excludeFromTotal:
            walletKind === 'goal' ? true : (excludeFromTotal ?? false),
          walletKind,
          goalAmount: walletKind === 'goal' ? goalAmount : null,
          goalStartMonth:
            walletKind === 'goal' ? (goalStartMonth ?? currentMonth) : null,
          goalDueMonth: walletKind === 'goal' ? goalDueMonth : null,
          sortOrder: (lastWallet?.sortOrder ?? -1) + 1,
        },
      });

      if (balance !== 0) {
        const today = new Date().toISOString().slice(0, 10);
        const targetCategory = await tx.category.findFirst({
          where: {
            name: balance > 0 ? 'Transfer In' : 'Transfer Out',
            type: balance > 0 ? 'income' : 'outcome',
          },
          select: { id: true },
        });

        if (!targetCategory) {
          throw new Error('TRANSFER_CATEGORY_NOT_FOUND');
        }

        await tx.cashLog.create({
          data: {
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

export async function GET(): Promise<NextResponse> {
  try {
    const wallets = await prisma.wallet.findMany({
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
      const existing = await tx.wallet.findUnique({
        where: { id: numericId },
        select: {
          id: true,
          name: true,
          balance: true,
          walletKind: true,
          goalAmount: true,
          goalStartMonth: true,
          goalDueMonth: true,
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
          if (!Number.isInteger(data.goalAmount) || data.goalAmount <= 0) {
            throw new Error('GOAL_AMOUNT_INVALID');
          }
        }

        if (data.goalDueMonth !== undefined) {
          if (!data.goalDueMonth || !isValidDueMonth(data.goalDueMonth)) {
            throw new Error('GOAL_DUE_MONTH_INVALID');
          }
        }

        if (data.goalStartMonth !== undefined) {
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

      const updateData: Partial<WalletsInput> = { ...data };
      delete updateData.walletKind;

      if (existing.walletKind === 'goal') {
        updateData.excludeFromTotal = true;
        updateData.goalStartMonth = existing.goalStartMonth;
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
        const targetCategory = await tx.category.findFirst({
          where: {
            name: adjustmentAmount > 0 ? 'Transfer In' : 'Transfer Out',
            type: adjustmentAmount > 0 ? 'income' : 'outcome',
          },
          select: { id: true },
        });

        if (!targetCategory) {
          throw new Error('TRANSFER_CATEGORY_NOT_FOUND');
        }

        await tx.cashLog.create({
          data: {
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
  try {
    const raw = (await req.json()) as { id?: number | string };
    const id = toId(raw.id);
    if (!id) return badRequest('ID is required');

    const totalWallets = await prisma.wallet.count();
    if (totalWallets <= 1) {
      return badRequest('Wallet must be at least 1');
    }

    await prisma.wallet.delete({ where: { id } });

    return ok({ success: true });
  } catch {
    return badRequest('Failed to delete wallet');
  }
}
