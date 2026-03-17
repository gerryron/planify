import { NextRequest, NextResponse } from 'next/server';
import { WalletsInput } from '@/features/wallets/types/wallets';
import { prisma } from '@/core/db/prisma';
import { ok, badRequest, serverError } from '@/core/http/apiResponse';

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
    const { name, balance, excludeFromTotal }: Partial<WalletsInput> =
      await req.json();
    if (!name?.trim() || balance === undefined) {
      return badRequest('All fields are required');
    }

    const wallet = await prisma.$transaction(async (tx) => {
      const lastWallet = await tx.wallet.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });

      const created = await tx.wallet.create({
        data: {
          name: name.trim(),
          balance,
          excludeFromTotal: excludeFromTotal ?? false,
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
        select: { id: true, name: true, balance: true },
      });

      if (!existing) {
        throw new Error('WALLET_NOT_FOUND');
      }

      const updated = await tx.wallet.update({
        where: { id: numericId },
        data,
      });

      if (data.balance !== undefined && data.balance !== existing.balance) {
        const today = new Date().toISOString().slice(0, 10);
        const adjustmentAmount = data.balance - existing.balance;
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
