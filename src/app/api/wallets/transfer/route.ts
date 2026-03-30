import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { prisma } from '@/core/db/prisma';
import { badRequest, ok } from '@/core/http/apiResponse';
import { requireAuth } from '@/core/auth/requireAuth';
import { WalletKind } from '@/features/wallets/types/wallets';

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

function isGoalAchieved(balance: number, goalAmount: number | null) {
  return goalAmount !== null && balance >= goalAmount;
}

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

function getWalletDelta(
  amount: number,
  type: 'income' | 'outcome',
  walletKind: WalletKind,
) {
  const nominal = Math.abs(amount);
  const delta = type === 'income' ? nominal : -nominal;
  return walletKind === 'credit_card' ? -delta : delta;
}

function assertCreditLimit(
  nextBalance: number,
  walletKind: WalletKind,
  creditLimit: number | null,
) {
  if (walletKind !== 'credit_card') return;
  if (typeof creditLimit !== 'number') {
    throw new Error('CREDIT_LIMIT_NOT_SET');
  }
  if (nextBalance > creditLimit) {
    throw new Error('CREDIT_LIMIT_EXCEEDED');
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

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
      const transferGroupId = randomUUID();

      const [fromWallet, toWallet] = await Promise.all([
        tx.wallet.findFirst({
          where: { id: fromWalletId, userId: auth.user.sub },
          select: {
            id: true,
            name: true,
            balance: true,
            walletKind: true,
            goalAmount: true,
            creditLimit: true,
          },
        }),
        tx.wallet.findFirst({
          where: { id: toWalletId, userId: auth.user.sub },
          select: {
            id: true,
            name: true,
            balance: true,
            walletKind: true,
            goalAmount: true,
            creditLimit: true,
          },
        }),
      ]);

      if (!fromWallet || !toWallet) {
        throw new Error('WALLET_NOT_FOUND');
      }

      if (fromWallet.walletKind === 'goal' && !fromWallet.goalAmount) {
        throw new Error('GOAL_WALLET_INVALID');
      }

      if (toWallet.walletKind === 'goal' && !toWallet.goalAmount) {
        throw new Error('GOAL_WALLET_INVALID');
      }

      if (
        fromWallet.walletKind === 'goal' &&
        !isGoalAchieved(fromWallet.balance, fromWallet.goalAmount)
      ) {
        throw new Error('GOAL_WITHDRAWAL_LOCKED');
      }

      if (
        toWallet.walletKind === 'goal' &&
        isGoalAchieved(toWallet.balance, toWallet.goalAmount)
      ) {
        throw new Error('GOAL_ALREADY_ACHIEVED');
      }

      const senderDebit =
        amount + (enableFee && feePayer === 'sender' ? feeAmount : 0);
      if (
        fromWallet.walletKind !== 'credit_card' &&
        fromWallet.balance < senderDebit
      ) {
        throw new Error('INSUFFICIENT_SENDER_BALANCE');
      }

      const transferInCategory =
        (await tx.category.findFirst({
          where: {
            OR: [{ systemDefault: true }, { userId: auth.user.sub }],
            type: 'income',
            name: 'Wallet Transfer In',
          },
          select: { id: true },
        })) ??
        (await tx.category.findFirst({
          where: {
            OR: [{ systemDefault: true }, { userId: auth.user.sub }],
            type: 'income',
            name: 'Transfer In',
          },
          select: { id: true },
        }));

      const transferOutCategory =
        (await tx.category.findFirst({
          where: {
            OR: [{ systemDefault: true }, { userId: auth.user.sub }],
            type: 'outcome',
            name: 'Wallet Transfer Out',
          },
          select: { id: true },
        })) ??
        (await tx.category.findFirst({
          where: {
            OR: [{ systemDefault: true }, { userId: auth.user.sub }],
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
            OR: [{ systemDefault: true }, { userId: auth.user.sub }],
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
              OR: [{ systemDefault: true }, { userId: auth.user.sub }],
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
                userId: auth.user.sub,
                systemDefault: false,
              },
              select: { id: true },
            });

            feeCategoryId = createdFeeCategory.id;
          } catch {
            const reloadedFeeCategory = await tx.category.findFirst({
              where: {
                OR: [{ systemDefault: true }, { userId: auth.user.sub }],
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

      const fromTransferDelta = getWalletDelta(
        amount,
        'outcome',
        fromWallet.walletKind,
      );
      const fromFeeDelta =
        enableFee && feePayer === 'sender'
          ? getWalletDelta(feeAmount, 'outcome', fromWallet.walletKind)
          : 0;
      const nextFromBalance =
        fromWallet.balance + fromTransferDelta + fromFeeDelta;

      const toTransferDelta = getWalletDelta(
        amount,
        'income',
        toWallet.walletKind,
      );
      const toFeeDelta =
        enableFee && feePayer === 'receiver'
          ? getWalletDelta(feeAmount, 'outcome', toWallet.walletKind)
          : 0;
      const nextToBalance = toWallet.balance + toTransferDelta + toFeeDelta;

      assertCreditLimit(
        nextFromBalance,
        fromWallet.walletKind,
        fromWallet.creditLimit,
      );
      assertCreditLimit(
        nextToBalance,
        toWallet.walletKind,
        toWallet.creditLimit,
      );

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
          userId: auth.user.sub,
          transferGroupId,
          date,
          description: transferOutDescription,
          amount,
          walletName: fromWallet.name,
          excludeFromReport: true,
          categoryId: transferOutCategory.id,
        },
      });

      await tx.cashLog.create({
        data: {
          userId: auth.user.sub,
          transferGroupId,
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
            userId: auth.user.sub,
            transferGroupId,
            date,
            description: feeDescription,
            amount: feeAmount,
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

    if (error instanceof Error && error.message === 'GOAL_WITHDRAWAL_LOCKED') {
      return badRequest(
        'Goal Wallet is locked. Withdrawal is available after target is achieved',
      );
    }

    if (error instanceof Error && error.message === 'GOAL_ALREADY_ACHIEVED') {
      return badRequest(
        'Goal Wallet already achieved its target and cannot receive transfer',
      );
    }

    if (error instanceof Error && error.message === 'GOAL_WALLET_INVALID') {
      return badRequest('Goal Wallet is missing goal configuration');
    }

    if (error instanceof Error && error.message === 'CREDIT_LIMIT_NOT_SET') {
      return badRequest('Credit card wallet is missing credit limit');
    }

    if (error instanceof Error && error.message === 'CREDIT_LIMIT_EXCEEDED') {
      return badRequest('Credit card outstanding cannot exceed credit limit');
    }

    return badRequest('Failed to transfer between wallets');
  }
}
