import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { ok } from '@/core/http/apiResponse';
import { requireAuth } from '@/core/auth/requireAuth';
import {
  ValidationError,
  NotFoundError,
  handleApiError,
} from '@/core/http/apiErrors';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const { ids, targetMonth }: { ids?: number[]; targetMonth?: string } =
      await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError(
        'BUDGET_VALIDATION',
        'ids must be a non-empty array',
      );
    }

    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
      throw new ValidationError(
        'BUDGET_VALIDATION',
        'targetMonth must be in YYYY-MM format',
      );
    }

    const numericIds = ids
      .map((id) =>
        Number.isInteger(id) && id > 0
          ? id
          : Number.isInteger(Number(id)) && Number(id) > 0
            ? Number(id)
            : null,
      )
      .filter((n): n is number => n !== null);

    if (numericIds.length !== ids.length) {
      throw new ValidationError(
        'BUDGET_VALIDATION',
        'All ids must be positive integers',
      );
    }

    // Verify all IDs belong to the user
    const ownedCount = await prisma.monthlyBudget.count({
      where: { userId: auth.user.sub, id: { in: numericIds } },
    });

    if (ownedCount !== numericIds.length) {
      throw new NotFoundError('BUDGET_NOT_FOUND', 'Budget');
    }

    // Fetch source budgets
    const sources = await prisma.monthlyBudget.findMany({
      where: { id: { in: numericIds } },
    });

    // Compute next sort order in target month
    const lastInTarget = await prisma.monthlyBudget.findFirst({
      where: { month: targetMonth, userId: auth.user.sub },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    let nextSortOrder = (lastInTarget?.sortOrder ?? -1) + 1;

    // Create copies in a transaction
    const created = await prisma.$transaction(
      sources.map((source) =>
        prisma.monthlyBudget.create({
          data: {
            name: source.name,
            amount: source.amount,
            month: targetMonth,
            category: source.category,
            type: source.type,
            userId: auth.user.sub,
            sortOrder: nextSortOrder++,
            isDone: false,
          },
        }),
      ),
    );

    return ok(created, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
