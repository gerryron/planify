import { NextRequest, NextResponse } from 'next/server';
import {
  BudgetInput,
  BudgetResponse,
} from '@/features/monthly-budget/types/budget';
import { prisma } from '@/core/db/prisma';
import { ok } from '@/core/http/apiResponse';
import { requireAuth } from '@/core/auth/requireAuth';
import {
  ValidationError,
  NotFoundError,
  handleApiError,
} from '@/core/http/apiErrors';

type MonthlyBudgetRecord = {
  id: number;
  name: string;
  amount: number;
  month: string;
  category: string;
  type: string;
  isDone: boolean;
  sortOrder: number;
};

import { toId } from '@/shared/utils/routeHelpers';

function toBudgetResponse(budget: MonthlyBudgetRecord): BudgetResponse {
  return {
    id: budget.id,
    name: budget.name,
    amount: budget.amount,
    month: budget.month,
    category: budget.category,
    type: budget.type as BudgetInput['type'],
    isDone: budget.isDone,
  };
}

// Create monthly budget
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const { name, amount, month, category, type }: Partial<BudgetInput> =
      await req.json();
    if (!name || amount === undefined || !month || !category || !type) {
      throw new ValidationError('BUDGET_VALIDATION', 'All fields are required');
    }
    if (type !== 'income' && type !== 'outcome' && type !== 'carryover') {
      throw new ValidationError('BUDGET_VALIDATION', 'Type must be income, outcome, or carryover');
    }

    const lastBudgetInMonth = await prisma.monthlyBudget.findFirst({
      where: { month, userId: auth.user.sub },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const createData: BudgetInput = {
      name,
      amount,
      month,
      category,
      type,
    };

    const budget = await prisma.monthlyBudget.create({
      data: {
        ...createData,
        userId: auth.user.sub,
        sortOrder: (lastBudgetInMonth?.sortOrder ?? -1) + 1,
      },
    });

    return ok(toBudgetResponse(budget as MonthlyBudgetRecord), 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// Get all monthly budgets
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const month = req.nextUrl.searchParams.get('month');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let budgets;
    if (!month) {
      budgets = await prisma.monthlyBudget.findMany({
        where: { userId: auth.user.sub },
        orderBy: [{ month: 'asc' }, { sortOrder: 'asc' }],
      });
    } else if (month === 'future') {
      budgets = await prisma.monthlyBudget.findMany({
        where: { userId: auth.user.sub, month: { gt: currentMonth } },
        orderBy: [{ month: 'asc' }, { sortOrder: 'asc' }],
      });
    } else if (month > currentMonth) {
      budgets = await prisma.monthlyBudget.findMany({
        where: { userId: auth.user.sub },
        orderBy: [{ month: 'asc' }, { sortOrder: 'asc' }],
      });
    } else {
      budgets = await prisma.monthlyBudget.findMany({
        where: { month, userId: auth.user.sub },
        orderBy: { sortOrder: 'asc' },
      });
    }

    return ok(
      (budgets as MonthlyBudgetRecord[]).map((budget) =>
        toBudgetResponse(budget),
      ),
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// Update monthly budget
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const payload: Partial<BudgetInput> & {
      id?: number | string;
      isDone?: boolean;
      orderedIds?: Array<number | string>;
    } = await req.json();

    if (Array.isArray(payload.orderedIds)) {
      const orderedIds = payload.orderedIds
        .map((item) => toId(item))
        .filter((item): item is number => item !== null);

      if (orderedIds.length === 0) {
        throw new ValidationError('BUDGET_VALIDATION', 'orderedIds is required');
      }

      const ownedCount = await prisma.monthlyBudget.count({
        where: {
          userId: auth.user.sub,
          id: { in: orderedIds },
        },
      });

      if (ownedCount !== orderedIds.length) {
        throw new NotFoundError('BUDGET_NOT_FOUND', 'Budget');
      }

      await prisma.$transaction(
        orderedIds.map((budgetId, index) =>
          prisma.monthlyBudget.update({
            where: { id: budgetId },
            data: { sortOrder: index },
          }),
        ),
      );

      return ok({ success: true });
    }

    const { id, isDone, ...data } = payload;
    const numericId = toId(id);

    if (!numericId) throw new ValidationError('BUDGET_VALIDATION', 'ID is required');
    if (
      data.type &&
      data.type !== 'income' &&
      data.type !== 'outcome' &&
      data.type !== 'carryover'
    ) {
      throw new ValidationError('BUDGET_VALIDATION', 'Type must be income, outcome, or carryover');
    }

    const owned = await prisma.monthlyBudget.findFirst({
      where: { id: numericId, userId: auth.user.sub },
      select: { id: true },
    });

    if (!owned) {
      throw new NotFoundError('BUDGET_NOT_FOUND', 'Budget');
    }

    const updateData: Record<string, unknown> = { ...data };
    if (typeof isDone === 'boolean') {
      updateData.isDone = isDone;
    }

    const budget = await prisma.monthlyBudget.update({
      where: { id: numericId },
      data: updateData,
    });
    return ok(toBudgetResponse(budget as MonthlyBudgetRecord));
  } catch (error) {
    return handleApiError(error);
  }
}

// Delete monthly budget
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const raw = (await req.json()) as { id?: number | string };
    const id = toId(raw.id);
    if (!id) throw new ValidationError('BUDGET_VALIDATION', 'ID is required');

    const owned = await prisma.monthlyBudget.findFirst({
      where: { id, userId: auth.user.sub },
      select: { id: true },
    });

    if (!owned) {
      throw new NotFoundError('BUDGET_NOT_FOUND', 'Budget');
    }

    await prisma.monthlyBudget.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
