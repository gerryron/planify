import { NextRequest, NextResponse } from 'next/server';
import { BudgetInput } from '@/types/budget';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, serverError } from '@/lib/apiResponse';

// Create monthly budget
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { name, amount, month, category }: BudgetInput = await req.json();
    if (!name || !amount || !month || !category) {
      return badRequest('All fields are required');
    }
    const budget = await prisma.monthlyBudget.create({
      data: { name, amount, month, category },
    });
    return ok(budget, 201);
  } catch {
    return badRequest();
  }
}

// Get all monthly budgets
export async function GET(): Promise<NextResponse> {
  try {
    const budgets = await prisma.monthlyBudget.findMany();
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
