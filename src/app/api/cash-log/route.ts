import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { badRequest, notFound, ok } from '@/core/http/apiResponse';
import { requireAuth } from '@/core/auth/requireAuth';
import { CashLogInput } from '@/features/cash-log/types/cashLog';

type CashLogRecord = CashLogInput & {
  id: number;
};

const TRANSFER_IN_NAMES = new Set(['Wallet Transfer In', 'Transfer In']);
const TRANSFER_OUT_NAMES = new Set(['Wallet Transfer Out', 'Transfer Out']);

type TransferCandidate = {
  id: number;
  date: string;
  amount: number;
  walletName: string;
  transferGroupId: string | null;
  description: string;
  excludeFromReport: boolean;
  category: {
    type: 'income' | 'outcome';
    name: string;
  } | null;
};

function isTransferCategory(
  type: 'income' | 'outcome' | null,
  name: string | null,
) {
  if (!type || !name) return false;
  if (type === 'income') return TRANSFER_IN_NAMES.has(name);
  return TRANSFER_OUT_NAMES.has(name);
}

function extractCounterpartyWallet(description: string) {
  const trimmed = description.trim();
  if (trimmed.startsWith('Transfer to ')) {
    return trimmed.slice('Transfer to '.length).trim() || null;
  }
  if (trimmed.startsWith('Transfer from ')) {
    return trimmed.slice('Transfer from '.length).trim() || null;
  }
  return null;
}

function selectLinkedCandidate(
  source: TransferCandidate,
  candidates: TransferCandidate[],
) {
  if (candidates.length === 0) return null;

  const preferredWallet = extractCounterpartyWallet(source.description);
  const narrowed = preferredWallet
    ? candidates.filter((candidate) => candidate.walletName === preferredWallet)
    : candidates;

  const list = narrowed.length > 0 ? narrowed : candidates;

  return [...list].sort(
    (a, b) => Math.abs(a.id - source.id) - Math.abs(b.id - source.id),
  )[0];
}

async function findLinkedTransferEntry(
  tx: {
    cashLog: {
      findMany: (args: {
        where: {
          userId: string;
          id: { not: number };
          date: string;
          amount: number;
          excludeFromReport: boolean;
          transferGroupId?: string;
        };
        include: {
          category: {
            select: {
              type: true;
              name: true;
            };
          };
        };
      }) => Promise<TransferCandidate[]>;
      findFirst: (args: {
        where: {
          userId: string;
          id: { not: number };
          transferGroupId: string;
        };
        include: {
          category: {
            select: {
              type: true;
              name: true;
            };
          };
        };
      }) => Promise<TransferCandidate | null>;
    };
  },
  userId: string,
  source: TransferCandidate,
) {
  if (
    !source.excludeFromReport ||
    !isTransferCategory(
      source.category?.type ?? null,
      source.category?.name ?? null,
    )
  ) {
    return null;
  }

  const oppositeType =
    source.category?.type === 'income' ? 'outcome' : 'income';

  if (source.transferGroupId) {
    const grouped = await tx.cashLog.findFirst({
      where: {
        userId,
        id: { not: source.id },
        transferGroupId: source.transferGroupId,
      },
      include: {
        category: {
          select: {
            type: true,
            name: true,
          },
        },
      },
    });

    if (
      grouped &&
      grouped.category?.type === oppositeType &&
      isTransferCategory(
        grouped.category?.type ?? null,
        grouped.category?.name ?? null,
      )
    ) {
      return grouped;
    }
  }

  const candidates = await tx.cashLog.findMany({
    where: {
      userId,
      id: { not: source.id },
      date: source.date,
      amount: source.amount,
      excludeFromReport: true,
    },
    include: {
      category: {
        select: {
          type: true,
          name: true,
        },
      },
    },
  });

  const filtered = candidates.filter(
    (candidate) =>
      candidate.category?.type === oppositeType &&
      isTransferCategory(
        candidate.category?.type ?? null,
        candidate.category?.name ?? null,
      ),
  );

  return selectLinkedCandidate(source, filtered);
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

function getWalletDelta(amount: number, type: 'income' | 'outcome') {
  const nominal = Math.abs(amount);
  return type === 'income' ? nominal : -nominal;
}

function shouldAffectWallet(
  categoryType: 'income' | 'outcome' | null,
  description: string,
  excludeFromReport: boolean,
) {
  if (!categoryType) return false;
  const normalizedDescription = description.trim().toLowerCase();
  if (
    excludeFromReport &&
    (normalizedDescription === 'adjustment balance' ||
      normalizedDescription === 'adjust balance')
  ) {
    return false;
  }
  return true;
}

function validateCreatePayload(payload: Partial<CashLogInput>) {
  if (
    !payload.date ||
    payload.amount === undefined ||
    !payload.walletName?.trim() ||
    payload.categoryId === undefined
  ) {
    return 'date, amount, walletName, and categoryId are required';
  }

  if (!Number.isFinite(payload.amount) || Number(payload.amount) <= 0) {
    return 'amount must be greater than 0';
  }

  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const payload: Partial<CashLogInput> = await req.json();
    const validationError = validateCreatePayload(payload);

    if (validationError) {
      return badRequest(validationError);
    }

    const category = await prisma.category.findFirst({
      where: {
        id: payload.categoryId!,
        OR: [{ systemDefault: true }, { userId: auth.user.sub }],
      },
      select: { id: true, type: true },
    });

    if (!category) {
      return badRequest('categoryId is invalid');
    }

    const walletName = payload.walletName!.trim();
    const walletDelta = getWalletDelta(payload.amount!, category.type);

    const record = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId_name: { userId: auth.user.sub, name: walletName } },
        select: { id: true, balance: true },
      });

      if (!wallet) {
        throw new Error('WALLET_NOT_FOUND');
      }

      const created = await tx.cashLog.create({
        data: {
          userId: auth.user.sub,
          date: payload.date!,
          description: payload.description?.trim() ?? '',
          amount: payload.amount!,
          walletName,
          categoryId: payload.categoryId!,
          excludeFromReport: payload.excludeFromReport ?? false,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              parentId: true,
            },
          },
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance + walletDelta },
      });

      return created;
    });

    return ok(record as CashLogRecord, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'WALLET_NOT_FOUND') {
      return badRequest('walletName is invalid');
    }
    return badRequest();
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const date = req.nextUrl.searchParams.get('date');
    const month = req.nextUrl.searchParams.get('month');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextMonthStart = `${now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()}-${String(((now.getMonth() + 1) % 12) + 1).padStart(2, '0')}-01`;

    if (date) {
      const logs = await prisma.cashLog.findMany({
        where: { date, userId: auth.user.sub },
        orderBy: [{ id: 'desc' }, { date: 'desc' }],
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              parentId: true,
            },
          },
        },
      });
      return ok(logs);
    }

    if (month === 'future') {
      const logs = await prisma.cashLog.findMany({
        where: { userId: auth.user.sub, date: { gte: nextMonthStart } },
        orderBy: [{ id: 'desc' }, { date: 'desc' }],
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              parentId: true,
            },
          },
        },
      });
      return ok(logs);
    }

    if (month && month > currentMonth) {
      const logs = await prisma.cashLog.findMany({
        where: { userId: auth.user.sub },
        orderBy: [{ id: 'desc' }, { date: 'desc' }],
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              parentId: true,
            },
          },
        },
      });
      return ok(logs);
    }

    if (month) {
      const logs = await prisma.cashLog.findMany({
        where: { userId: auth.user.sub, date: { startsWith: month } },
        orderBy: [{ id: 'desc' }, { date: 'desc' }],
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              parentId: true,
            },
          },
        },
      });
      return ok(logs);
    }

    const logs = await prisma.cashLog.findMany({
      where: { userId: auth.user.sub },
      orderBy: [{ id: 'desc' }, { date: 'desc' }],
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            parentId: true,
          },
        },
      },
    });

    return ok(logs);
  } catch {
    return badRequest();
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const rawPayload: Partial<CashLogInput> & { id?: number | string } =
      await req.json();
    const payload = {
      ...rawPayload,
      id: toId(rawPayload.id),
    };

    if (!payload.id) {
      return badRequest('ID is required');
    }

    if (
      payload.amount !== undefined &&
      (!Number.isFinite(payload.amount) || payload.amount <= 0)
    ) {
      return badRequest('amount must be greater than 0');
    }

    const logId = payload.id;

    if (payload.walletName !== undefined && !payload.walletName.trim()) {
      return badRequest('walletName is required');
    }

    if (payload.categoryId !== undefined) {
      const category = await prisma.category.findFirst({
        where: {
          id: payload.categoryId,
          OR: [{ systemDefault: true }, { userId: auth.user.sub }],
        },
        select: { id: true, type: true },
      });

      if (!category) {
        return badRequest('categoryId is invalid');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.cashLog.findFirst({
        where: { id: logId, userId: auth.user.sub },
        select: {
          id: true,
          date: true,
          amount: true,
          walletName: true,
          transferGroupId: true,
          description: true,
          excludeFromReport: true,
          categoryId: true,
          category: {
            select: {
              type: true,
              name: true,
            },
          },
        },
      });

      if (!existing) {
        throw new Error('CASH_LOG_NOT_FOUND');
      }

      const linkedTransfer = await findLinkedTransferEntry(
        tx,
        auth.user.sub,
        existing as TransferCandidate,
      );

      if (linkedTransfer && payload.walletName !== undefined) {
        throw new Error('LINKED_TRANSFER_IMMUTABLE_WALLET');
      }

      if (linkedTransfer && payload.categoryId !== undefined) {
        throw new Error('LINKED_TRANSFER_IMMUTABLE_CATEGORY');
      }

      let nextCategoryType = existing.category?.type ?? null;
      if (payload.categoryId !== undefined) {
        const nextCategory = await tx.category.findFirst({
          where: {
            id: payload.categoryId,
            OR: [{ systemDefault: true }, { userId: auth.user.sub }],
          },
          select: { type: true },
        });
        if (!nextCategory) {
          throw new Error('CATEGORY_NOT_FOUND');
        }
        nextCategoryType = nextCategory.type;
      }

      const nextWalletName = payload.walletName?.trim() ?? existing.walletName;
      const nextDescription =
        payload.description?.trim() ?? existing.description;
      const nextExcludeFromReport =
        payload.excludeFromReport ?? existing.excludeFromReport;
      const nextAmount = payload.amount ?? existing.amount;

      if (linkedTransfer) {
        const linkedNextDescription =
          payload.description?.trim() ?? linkedTransfer.description;
        const linkedNextExcludeFromReport =
          payload.excludeFromReport ?? linkedTransfer.excludeFromReport;
        const linkedNextAmount = payload.amount ?? linkedTransfer.amount;

        const transferEntries = [
          {
            id: existing.id,
            walletName: existing.walletName,
            categoryType: existing.category?.type ?? null,
            oldAmount: existing.amount,
            oldDescription: existing.description,
            oldExclude: existing.excludeFromReport,
            newAmount: nextAmount,
            newDescription: nextDescription,
            newExclude: nextExcludeFromReport,
          },
          {
            id: linkedTransfer.id,
            walletName: linkedTransfer.walletName,
            categoryType: linkedTransfer.category?.type ?? null,
            oldAmount: linkedTransfer.amount,
            oldDescription: linkedTransfer.description,
            oldExclude: linkedTransfer.excludeFromReport,
            newAmount: linkedNextAmount,
            newDescription: linkedNextDescription,
            newExclude: linkedNextExcludeFromReport,
          },
        ];

        for (const entry of transferEntries) {
          const oldAffects = shouldAffectWallet(
            entry.categoryType,
            entry.oldDescription,
            entry.oldExclude,
          );
          const newAffects = shouldAffectWallet(
            entry.categoryType,
            entry.newDescription,
            entry.newExclude,
          );

          const oldDelta =
            oldAffects && entry.categoryType
              ? getWalletDelta(entry.oldAmount, entry.categoryType)
              : 0;
          const newDelta =
            newAffects && entry.categoryType
              ? getWalletDelta(entry.newAmount, entry.categoryType)
              : 0;

          const balanceDelta = newDelta - oldDelta;
          if (balanceDelta !== 0) {
            const wallet = await tx.wallet.findUnique({
              where: {
                userId_name: {
                  userId: auth.user.sub,
                  name: entry.walletName,
                },
              },
              select: { id: true, balance: true },
            });

            if (!wallet) {
              throw new Error('WALLET_NOT_FOUND');
            }

            await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: wallet.balance + balanceDelta },
            });
          }
        }

        await tx.cashLog.update({
          where: { id: linkedTransfer.id },
          data: {
            ...(payload.date !== undefined ? { date: payload.date } : {}),
            ...(payload.description !== undefined
              ? { description: linkedNextDescription }
              : {}),
            ...(payload.amount !== undefined
              ? { amount: linkedNextAmount }
              : {}),
            ...(payload.excludeFromReport !== undefined
              ? { excludeFromReport: linkedNextExcludeFromReport }
              : {}),
          },
        });

        return tx.cashLog.update({
          where: { id: logId },
          data: {
            ...(payload.date !== undefined ? { date: payload.date } : {}),
            ...(payload.description !== undefined
              ? { description: nextDescription }
              : {}),
            ...(payload.amount !== undefined ? { amount: nextAmount } : {}),
            ...(payload.excludeFromReport !== undefined
              ? { excludeFromReport: nextExcludeFromReport }
              : {}),
          },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                type: true,
                parentId: true,
              },
            },
          },
        });
      }

      const oldAffects = shouldAffectWallet(
        existing.category?.type ?? null,
        existing.description,
        existing.excludeFromReport,
      );
      const nextAffects = shouldAffectWallet(
        nextCategoryType,
        nextDescription,
        nextExcludeFromReport,
      );

      const oldDelta =
        oldAffects && existing.category?.type
          ? getWalletDelta(existing.amount, existing.category.type)
          : 0;
      const nextDelta =
        nextAffects && nextCategoryType
          ? getWalletDelta(nextAmount, nextCategoryType)
          : 0;

      if (existing.walletName === nextWalletName) {
        const wallet = await tx.wallet.findUnique({
          where: {
            userId_name: { userId: auth.user.sub, name: nextWalletName },
          },
          select: { id: true, balance: true },
        });
        if (!wallet) {
          throw new Error('WALLET_NOT_FOUND');
        }

        const balanceDelta = nextDelta - oldDelta;
        if (balanceDelta !== 0) {
          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: wallet.balance + balanceDelta },
          });
        }
      } else {
        const oldWallet = await tx.wallet.findUnique({
          where: {
            userId_name: { userId: auth.user.sub, name: existing.walletName },
          },
          select: { id: true, balance: true },
        });
        const newWallet = await tx.wallet.findUnique({
          where: {
            userId_name: { userId: auth.user.sub, name: nextWalletName },
          },
          select: { id: true, balance: true },
        });

        if (!oldWallet || !newWallet) {
          throw new Error('WALLET_NOT_FOUND');
        }

        if (oldDelta !== 0) {
          await tx.wallet.update({
            where: { id: oldWallet.id },
            data: { balance: oldWallet.balance - oldDelta },
          });
        }

        if (nextDelta !== 0) {
          await tx.wallet.update({
            where: { id: newWallet.id },
            data: { balance: newWallet.balance + nextDelta },
          });
        }
      }

      return tx.cashLog.update({
        where: { id: logId },
        data: {
          ...(payload.date !== undefined ? { date: payload.date } : {}),
          ...(payload.description !== undefined
            ? { description: payload.description.trim() }
            : {}),
          ...(payload.amount !== undefined ? { amount: payload.amount } : {}),
          ...(payload.walletName !== undefined
            ? { walletName: payload.walletName.trim() }
            : {}),
          ...(payload.categoryId !== undefined
            ? { categoryId: payload.categoryId }
            : {}),
          ...(payload.excludeFromReport !== undefined
            ? { excludeFromReport: payload.excludeFromReport }
            : {}),
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              type: true,
              parentId: true,
            },
          },
        },
      });
    });

    return ok(updated);
  } catch (error) {
    if (error instanceof Error && error.message === 'CASH_LOG_NOT_FOUND') {
      return notFound('Cash log not found');
    }
    if (error instanceof Error && error.message === 'CATEGORY_NOT_FOUND') {
      return badRequest('categoryId is invalid');
    }
    if (error instanceof Error && error.message === 'WALLET_NOT_FOUND') {
      return badRequest('walletName is invalid');
    }
    if (
      error instanceof Error &&
      error.message === 'LINKED_TRANSFER_IMMUTABLE_WALLET'
    ) {
      return badRequest('Linked transfer wallet cannot be edited individually');
    }
    if (
      error instanceof Error &&
      error.message === 'LINKED_TRANSFER_IMMUTABLE_CATEGORY'
    ) {
      return badRequest(
        'Linked transfer category cannot be edited individually',
      );
    }
    return badRequest('Failed to update cash log');
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const raw = (await req.json()) as { id?: number | string };
    const id = toId(raw.id);

    if (!id) {
      return badRequest('ID is required');
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.cashLog.findFirst({
        where: { id, userId: auth.user.sub },
        select: {
          id: true,
          date: true,
          amount: true,
          walletName: true,
          transferGroupId: true,
          description: true,
          excludeFromReport: true,
          category: {
            select: {
              type: true,
              name: true,
            },
          },
        },
      });

      if (!existing) {
        throw new Error('CASH_LOG_NOT_FOUND');
      }

      const linkedTransfer = await findLinkedTransferEntry(
        tx,
        auth.user.sub,
        existing as TransferCandidate,
      );

      const entries = [existing, ...(linkedTransfer ? [linkedTransfer] : [])];

      for (const entry of entries) {
        const affects = shouldAffectWallet(
          entry.category?.type ?? null,
          entry.description,
          entry.excludeFromReport,
        );

        if (affects && entry.category?.type) {
          const delta = getWalletDelta(entry.amount, entry.category.type);
          const wallet = await tx.wallet.findUnique({
            where: {
              userId_name: { userId: auth.user.sub, name: entry.walletName },
            },
            select: { id: true, balance: true },
          });

          if (!wallet) {
            throw new Error('WALLET_NOT_FOUND');
          }

          await tx.wallet.update({
            where: { id: wallet.id },
            data: { balance: wallet.balance - delta },
          });
        }
      }

      await tx.cashLog.delete({ where: { id } });
      if (linkedTransfer) {
        await tx.cashLog.delete({ where: { id: linkedTransfer.id } });
      }
    });

    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'CASH_LOG_NOT_FOUND') {
      return notFound('Cash log not found');
    }
    if (error instanceof Error && error.message === 'WALLET_NOT_FOUND') {
      return badRequest('walletName is invalid');
    }
    return badRequest('Failed to delete cash log');
  }
}
