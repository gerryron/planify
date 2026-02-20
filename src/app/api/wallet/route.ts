import { NextRequest, NextResponse } from 'next/server';
import { WalletInput } from '@/features/wallet/types/wallet';
import { prisma } from '@/core/db/prisma';
import { ok, badRequest, serverError } from '@/core/http/apiResponse';

async function ensureDefaultWallet() {
  await prisma.wallet.upsert({
    where: { name: 'Cash' },
    update: {},
    create: {
      name: 'Cash',
      balance: 0,
      includeFromTotal: true,
    },
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { name, balance, includeFromTotal }: Partial<WalletInput> =
      await req.json();
    if (!name?.trim() || balance === undefined) {
      return badRequest('All fields are required');
    }

    const lastWallet = await prisma.wallet.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const wallet = await prisma.wallet.create({
      data: {
        name: name.trim(),
        balance,
        includeFromTotal: includeFromTotal ?? true,
        sortOrder: (lastWallet?.sortOrder ?? -1) + 1,
      },
    });

    return ok(wallet, 201);
  } catch {
    return badRequest('Failed to create wallet');
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    await ensureDefaultWallet();
    const wallets = await prisma.wallet.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return ok(wallets);
  } catch (error) {
    console.error('GET /api/wallet error:', error);
    const message = error instanceof Error ? error.message : undefined;
    return serverError(message);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const payload: Partial<WalletInput> & {
      id?: string;
      orderedIds?: string[];
    } = await req.json();

    if (Array.isArray(payload.orderedIds)) {
      const orderedIds = payload.orderedIds.filter(Boolean);

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

    if (!id) return badRequest('ID is required');

    const wallet = await prisma.wallet.update({
      where: { id },
      data,
    });

    return ok(wallet);
  } catch {
    return badRequest('Failed to update wallet');
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const { id }: { id: string } = await req.json();
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
