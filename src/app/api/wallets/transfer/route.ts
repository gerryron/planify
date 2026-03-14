import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { badRequest, ok } from '@/core/http/apiResponse';

type FeePayer = 'sender' | 'receiver';

type TransferPayload = {
  fromWalletId?: number | string;
  toWalletId?: number | string;
  amount?: number;
  date?: string;
  transferNote?: string;
  enableFee?: boolean;
  feeAmount?: number;
  feePayer?: FeePayer;
  feeNote?: string;
};

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function toId(value: unknown): number | null {
  const parsed = toNumber(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const payload = (await req.json()) as TransferPayload;

    const fromWalletId = toId(payload.fromWalletId);
    const toWalletId = toId(payload.toWalletId);
    const amount = toNumber(payload.amount);
    const date = payload.date?.trim();
    const transferNote = payload.transferNote?.trim();

    const enableFee = payload.enableFee ?? false;
    const feeAmount = enableFee ? toNumber(payload.feeAmount) : 0;
    const feePayer: FeePayer =
      payload.feePayer === 'receiver' ? 'receiver' : 'sender';
    const feeNote = payload.feeNote?.trim();

    if (!fromWalletId || !toWalletId) {
      return badRequest('Source and destination wallets are required');
    }

    if (fromWalletId === toWalletId) {
      return badRequest('Source and destination wallets cannot be the same');
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return badRequest('Transfer amount must be greater than 0');
    }

    if (!date || !isIsoDate(date)) {
      return badRequest('date must be in YYYY-MM-DD format');
    }

    if (enableFee) {
      if (!Number.isFinite(feeAmount) || feeAmount <= 0) {
        return badRequest('Fee amount must be greater than 0');
      }

      if (feePayer === 'receiver' && amount <= feeAmount) {
        return badRequest(
          'Transfer amount must be greater than fee when receiver pays fee',
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const [fromWallet, toWallet] = await Promise.all([
        tx.wallet.findUnique({
          where: { id: fromWalletId },
          select: { id: true, name: true, balance: true },
        }),
        tx.wallet.findUnique({
          where: { id: toWalletId },
          select: { id: true, name: true, balance: true },
        }),
      ]);

      if (!fromWallet || !toWallet) {
        throw new Error('WALLET_NOT_FOUND');
      }

      const senderDebit =
        amount + (enableFee && feePayer === 'sender' ? feeAmount : 0);
      if (fromWallet.balance < senderDebit) {
        throw new Error('INSUFFICIENT_SENDER_BALANCE');
      }

      const transferInCategory =
        (await tx.category.findFirst({
          where: {
            type: 'income',
            name: 'Wallet Transfer In',
          },
          select: { id: true },
        })) ??
        (await tx.category.findFirst({
          where: {
            type: 'income',
            name: 'Transfer In',
          },
          select: { id: true },
        }));

      const transferOutCategory =
        (await tx.category.findFirst({
          where: {
            type: 'outcome',
            name: 'Wallet Transfer Out',
          },
          select: { id: true },
        })) ??
        (await tx.category.findFirst({
          where: {
            type: 'outcome',
            name: 'Transfer Out',
          },
          select: { id: true },
        }));

      if (!transferInCategory || !transferOutCategory) {
        throw new Error('TRANSFER_CATEGORY_NOT_FOUND');
      }

      let feeCategoryId: number | null = null;
      if (enableFee) {
        const existingFeeCategory = await tx.category.findFirst({
          where: {
            type: 'outcome',
            name: 'Transfer Fee',
          },
          select: { id: true },
        });

        if (existingFeeCategory) {
          feeCategoryId = existingFeeCategory.id;
        } else {
          const transferParent = await tx.category.findFirst({
            where: {
              type: 'outcome',
              name: 'Transfer',
              parentId: null,
            },
            select: { id: true },
          });

          try {
            const createdFeeCategory = await tx.category.create({
              data: {
                name: 'Transfer Fee',
                type: 'outcome',
                parentId: transferParent?.id ?? null,
              },
              select: { id: true },
            });

            feeCategoryId = createdFeeCategory.id;
          } catch {
            const reloadedFeeCategory = await tx.category.findFirst({
              where: {
                type: 'outcome',
                name: 'Transfer Fee',
              },
              select: { id: true },
            });

            if (!reloadedFeeCategory) {
              throw new Error('TRANSFER_FEE_CATEGORY_CREATE_FAILED');
            }

            feeCategoryId = reloadedFeeCategory.id;
          }
        }
      }

      const nextFromBalance = fromWallet.balance - senderDebit;
      const receiverGrossCredit = amount;
      const receiverFeeDebit =
        enableFee && feePayer === 'receiver' ? feeAmount : 0;
      const nextToBalance =
        toWallet.balance + receiverGrossCredit - receiverFeeDebit;

      await tx.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: nextFromBalance },
      });

      await tx.wallet.update({
        where: { id: toWallet.id },
        data: { balance: nextToBalance },
      });

      const transferOutDescription =
        transferNote && transferNote.length > 0
          ? transferNote
          : `Transfer to ${toWallet.name}`;
      const transferInDescription =
        transferNote && transferNote.length > 0
          ? transferNote
          : `Transfer from ${fromWallet.name}`;

      await tx.cashLog.create({
        data: {
          date,
          description: transferOutDescription,
          amount: -amount,
          walletName: fromWallet.name,
          excludeFromReport: true,
          categoryId: transferOutCategory.id,
        },
      });

      await tx.cashLog.create({
        data: {
          date,
          description: transferInDescription,
          amount,
          walletName: toWallet.name,
          excludeFromReport: true,
          categoryId: transferInCategory.id,
        },
      });

      if (enableFee && feeCategoryId) {
        const feeWallet = feePayer === 'sender' ? fromWallet : toWallet;
        const feeDescription =
          feeNote && feeNote.length > 0
            ? feeNote
            : `Transfer fee - ${fromWallet.name} to ${toWallet.name}`;

        await tx.cashLog.create({
          data: {
            date,
            description: feeDescription,
            amount: -feeAmount,
            walletName: feeWallet.name,
            excludeFromReport: true,
            categoryId: feeCategoryId,
          },
        });
      }

      return {
        success: true,
        fromWallet: {
          id: fromWallet.id,
          name: fromWallet.name,
          balance: nextFromBalance,
        },
        toWallet: {
          id: toWallet.id,
          name: toWallet.name,
          balance: nextToBalance,
        },
      };
    });

    return ok(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'WALLET_NOT_FOUND') {
      return badRequest('Wallet not found');
    }

    if (
      error instanceof Error &&
      error.message === 'INSUFFICIENT_SENDER_BALANCE'
    ) {
      return badRequest('Insufficient sender wallet balance');
    }

    if (
      error instanceof Error &&
      error.message === 'TRANSFER_CATEGORY_NOT_FOUND'
    ) {
      return badRequest('Transfer category not found');
    }

    if (
      error instanceof Error &&
      error.message === 'TRANSFER_FEE_CATEGORY_CREATE_FAILED'
    ) {
      return badRequest('Failed to create transfer fee category');
    }

    return badRequest('Failed to transfer between wallets');
  }
}
