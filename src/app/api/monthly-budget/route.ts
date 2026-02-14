import { NextRequest, NextResponse } from 'next/server';
import { BudgetInput } from '@/types/budget';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, serverError } from '@/lib/apiResponse';

// Create monthly budget
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { name, amount, month, category, type }: BudgetInput =
      await req.json();
    if (!name || amount === undefined || !month || !category || !type) {
      return badRequest('All fields are required');
    }
    if (type !== 'income' && type !== 'outcome') {
      return badRequest('Type must be income or outcome');
    }
    const createData: BudgetInput = { name, amount, month, category, type };
    const budget = await prisma.monthlyBudget.create({
      data: createData,
    });
    return ok(budget, 201);
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
      budgets = await prisma.monthlyBudget.findMany();
    } else if (month === 'future') {
      budgets = await prisma.monthlyBudget.findMany({
        where: { month: { gt: currentMonth } },
      });
    } else if (month > currentMonth) {
      budgets = await prisma.monthlyBudget.findMany();
    } else {
      budgets = await prisma.monthlyBudget.findMany({
        where: { month },
      });
    }

    return ok(budgets);
  } catch (error) {
    console.error('GET /api/monthly-budget error:', error);
    const message = error instanceof Error ? error.message : undefined;
    return serverError(message);
  }
}

// Update monthly budget
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  try {
    const { id, ...data }: Partial<BudgetInput> & { id: string } =
      await req.json();
    if (!id) return badRequest('ID is required');
    if (data.type && data.type !== 'income' && data.type !== 'outcome') {
      return badRequest('Type must be income or outcome');
    }
    const budget = await prisma.monthlyBudget.update({
      where: { id },
      data,
    });
    return ok(budget);
  } catch {
    return badRequest('Failed to update budget');
  }
}

// Delete monthly budget
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const { id }: { id: string } = await req.json();
    if (!id) return badRequest('ID is required');
    await prisma.monthlyBudget.delete({ where: { id } });
    return ok({ success: true });
  } catch {
    return badRequest('Failed to delete budget');
  }
}
