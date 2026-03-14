import { NextRequest, NextResponse } from 'next/server';
import {
  BudgetInput,
  BudgetResponse,
} from '@/features/monthly-budget/types/budget';
import { prisma } from '@/core/db/prisma';
import { ok, badRequest, serverError } from '@/core/http/apiResponse';

type MonthlyBudgetRecord = {
  id: number;
  name: string;
  amount: number;
  month: string;
  category: string;
  type: string;
  sortOrder: number;
};

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

function toBudgetResponse(budget: MonthlyBudgetRecord): BudgetResponse {
  return {
    id: budget.id,
    name: budget.name,
    amount: budget.amount,
    month: budget.month,
    category: budget.category,
    type: budget.type as BudgetInput['type'],
  };
}

// Create monthly budget
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { name, amount, month, category, type }: Partial<BudgetInput> =
      await req.json();
    if (!name || amount === undefined || !month || !category || !type) {
      return badRequest('All fields are required');
    }
    if (type !== 'income' && type !== 'outcome' && type !== 'carryover') {
      return badRequest('Type must be income, outcome, or carryover');
    }

    const lastBudgetInMonth = await prisma.monthlyBudget.findFirst({
      where: { month },
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
        sortOrder: (lastBudgetInMonth?.sortOrder ?? -1) + 1,
      },
    });

    return ok(toBudgetResponse(budget as MonthlyBudgetRecord), 201);
  } catch {
    return badRequest();
  }
}

// Get all monthly budgets
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const month = req.nextUrl.searchParams.get('month');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let budgets;
    if (!month) {
      budgets = await prisma.monthlyBudget.findMany({
        orderBy: [{ month: 'asc' }, { sortOrder: 'asc' }],
      });
    } else if (month === 'future') {
      budgets = await prisma.monthlyBudget.findMany({
        where: { month: { gt: currentMonth } },
        orderBy: [{ month: 'asc' }, { sortOrder: 'asc' }],
      });
    } else if (month > currentMonth) {
      budgets = await prisma.monthlyBudget.findMany({
        orderBy: [{ month: 'asc' }, { sortOrder: 'asc' }],
      });
    } else {
      budgets = await prisma.monthlyBudget.findMany({
        where: { month },
        orderBy: { sortOrder: 'asc' },
      });
    }

    return ok(
      (budgets as MonthlyBudgetRecord[]).map((budget) =>
        toBudgetResponse(budget),
      ),
    );
  } catch (error) {
    console.error('GET /api/monthly-budget error:', error);
    const message = error instanceof Error ? error.message : undefined;
    return serverError(message);
  }
}

// Update monthly budget
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const payload: Partial<BudgetInput> & {
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
        orderedIds.map((budgetId, index) =>
          prisma.monthlyBudget.update({
            where: { id: budgetId },
            data: { sortOrder: index },
          }),
        ),
      );

      return ok({ success: true });
    }

    const { id, ...data } = payload;
    const numericId = toId(id);

    if (!numericId) return badRequest('ID is required');
    if (
      data.type &&
      data.type !== 'income' &&
      data.type !== 'outcome' &&
      data.type !== 'carryover'
    ) {
      return badRequest('Type must be income, outcome, or carryover');
    }

    const budget = await prisma.monthlyBudget.update({
      where: { id: numericId },
      data,
    });
    return ok(toBudgetResponse(budget as MonthlyBudgetRecord));
  } catch {
    return badRequest('Failed to update budget');
  }
}

// Delete monthly budget
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const raw = (await req.json()) as { id?: number | string };
    const id = toId(raw.id);
    if (!id) return badRequest('ID is required');
    await prisma.monthlyBudget.delete({ where: { id } });
    return ok({ success: true });
  } catch {
    return badRequest('Failed to delete budget');
  }
}
