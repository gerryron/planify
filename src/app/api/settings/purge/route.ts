import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { badRequest, ok } from '@/core/http/apiResponse';
import { requireAuth } from '@/core/auth/requireAuth';
import {
  buildSeedCategoryKey,
  seedCategoryKeys,
} from '@/features/settings/constants/seedCategories';

type DeleteScope = 'none' | 'months' | 'all';

type PurgePayload = {
  cashLog?: {
    scope?: DeleteScope;
    months?: string[];
  };
  monthlyBudget?: {
    scope?: DeleteScope;
    months?: string[];
  };
  deleteWallets?: boolean;
  deleteUserCategories?: boolean;
};

function normalizeScope(value: unknown): DeleteScope {
  if (value === 'all' || value === 'months' || value === 'none') return value;
  return 'none';
}

function isValidMonth(month: string) {
  return /^\d{4}-\d{2}$/.test(month);
}

function buildMonthFilters(months: string[]) {
  return months.map((month) => ({ startsWith: month }));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const payload = (await req.json()) as PurgePayload;

    const cashLogScope = normalizeScope(payload.cashLog?.scope);
    const monthlyBudgetScope = normalizeScope(payload.monthlyBudget?.scope);
    const cashLogMonths = Array.isArray(payload.cashLog?.months)
      ? payload.cashLog!.months!.filter(isValidMonth)
      : [];
    const monthlyBudgetMonths = Array.isArray(payload.monthlyBudget?.months)
      ? payload.monthlyBudget!.months!.filter(isValidMonth)
      : [];

    const deleteWallets = payload.deleteWallets === true;
    const deleteUserCategories = payload.deleteUserCategories === true;

    const hasAnyAction =
      cashLogScope !== 'none' ||
      monthlyBudgetScope !== 'none' ||
      deleteWallets ||
      deleteUserCategories;

    if (!hasAnyAction) {
      return badRequest('No deletion action selected');
    }

    if (cashLogScope === 'months' && cashLogMonths.length === 0) {
      return badRequest('cashLog.months must contain at least one valid month');
    }

    if (monthlyBudgetScope === 'months' && monthlyBudgetMonths.length === 0) {
      return badRequest(
        'monthlyBudget.months must contain at least one valid month',
      );
    }

    const summary = await prisma.$transaction(async (tx) => {
      let cashLogDeleted = 0;
      let cashLogDeletedByWallet = 0;
      let monthlyBudgetDeleted = 0;
      let walletDeleted = 0;
      let userCategoryDeleted = 0;

      if (cashLogScope === 'all') {
        const deleted = await tx.cashLog.deleteMany({
          where: { userId: auth.user.sub },
        });
        cashLogDeleted = deleted.count;
      } else if (cashLogScope === 'months') {
        const deleted = await tx.cashLog.deleteMany({
          where: {
            userId: auth.user.sub,
            OR: buildMonthFilters(cashLogMonths).map((item) => ({
              date: item,
            })),
          },
        });
        cashLogDeleted = deleted.count;
      }

      if (monthlyBudgetScope === 'all') {
        const deleted = await tx.monthlyBudget.deleteMany({
          where: { userId: auth.user.sub },
        });
        monthlyBudgetDeleted = deleted.count;
      } else if (monthlyBudgetScope === 'months') {
        const deleted = await tx.monthlyBudget.deleteMany({
          where: {
            userId: auth.user.sub,
            OR: buildMonthFilters(monthlyBudgetMonths).map((item) => ({
              month: item,
            })),
          },
        });
        monthlyBudgetDeleted = deleted.count;
      }

      if (deleteWallets) {
        const wallets = await tx.wallet.findMany({
          where: { userId: auth.user.sub },
          select: { name: true },
        });
        const walletNames = wallets.map((item) => item.name);

        if (walletNames.length > 0) {
          const deletedLogs = await tx.cashLog.deleteMany({
            where: {
              userId: auth.user.sub,
              walletName: { in: walletNames },
            },
          });
          cashLogDeletedByWallet = deletedLogs.count;
        }

        const deletedWallets = await tx.wallet.deleteMany({
          where: { userId: auth.user.sub },
        });
        walletDeleted = deletedWallets.count;

        await tx.wallet.create({
          data: {
            userId: auth.user.sub,
            name: 'Cash',
            balance: 0,
            excludeFromTotal: false,
            sortOrder: 0,
          },
        });
      }

      if (deleteUserCategories) {
        const categories = await tx.category.findMany({
          where: {
            OR: [{ userId: auth.user.sub }, { systemDefault: true }],
          },
          include: {
            parent: {
              select: { name: true },
            },
          },
        });

        const userCategoryIds = categories
          .filter((category) => {
            const key = buildSeedCategoryKey(
              category.type,
              category.name,
              category.parent?.name ?? null,
            );
            return (
              category.userId === auth.user.sub && !seedCategoryKeys.has(key)
            );
          })
          .map((category) => category.id);

        if (userCategoryIds.length > 0) {
          const deletedCategories = await tx.category.deleteMany({
            where: {
              id: { in: userCategoryIds },
            },
          });
          userCategoryDeleted = deletedCategories.count;
        }
      }

      return {
        cashLogDeleted,
        cashLogDeletedByWallet,
        monthlyBudgetDeleted,
        walletDeleted,
        userCategoryDeleted,
      };
    });

    return ok({ success: true, summary });
  } catch {
    return badRequest('Failed to purge selected data');
  }
}
