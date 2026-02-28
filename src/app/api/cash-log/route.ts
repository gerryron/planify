import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { badRequest, notFound, ok } from '@/core/http/apiResponse';
import { CashLogInput } from '@/features/cash-log/types/cashLog';

type CashLogRecord = CashLogInput & {
  id: string;
};

function validateCreatePayload(payload: Partial<CashLogInput>) {
  if (
    !payload.date ||
    !payload.description?.trim() ||
    payload.amount === undefined ||
    !payload.walletName?.trim() ||
    !payload.categoryId?.trim()
  ) {
    return 'date, description, amount, walletName, and categoryId are required';
  }

  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const payload: Partial<CashLogInput> = await req.json();
    const validationError = validateCreatePayload(payload);

    if (validationError) {
      return badRequest(validationError);
    }

    const category = await prisma.category.findUnique({
      where: { id: payload.categoryId! },
      select: { id: true },
    });

    if (!category) {
      return badRequest('categoryId is invalid');
    }

    const record = await prisma.cashLog.create({
      data: {
        date: payload.date!,
        description: payload.description!.trim(),
        amount: payload.amount!,
        walletName: payload.walletName!.trim(),
        categoryId: payload.categoryId!,
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

    return ok(record as CashLogRecord, 201);
  } catch {
    return badRequest();
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const date = req.nextUrl.searchParams.get('date');
    const month = req.nextUrl.searchParams.get('month');
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (date) {
      const logs = await prisma.cashLog.findMany({
        where: { date },
        orderBy: [{ date: 'asc' }, { description: 'asc' }],
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
        where: { date: { gt: currentMonth } },
        orderBy: [{ date: 'asc' }, { description: 'asc' }],
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
        orderBy: [{ date: 'asc' }, { description: 'asc' }],
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
        where: { date: { startsWith: month } },
        orderBy: [{ date: 'asc' }, { description: 'asc' }],
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
      orderBy: [{ date: 'asc' }, { description: 'asc' }],
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
  try {
    const payload: Partial<CashLogInput> & { id?: string } = await req.json();

    if (!payload.id) {
      return badRequest('ID is required');
    }

    if (payload.walletName !== undefined && !payload.walletName.trim()) {
      return badRequest('walletName is required');
    }

    if (payload.categoryId !== undefined && !payload.categoryId.trim()) {
      return badRequest('categoryId is required');
    }

    if (payload.categoryId !== undefined) {
      const category = await prisma.category.findUnique({
        where: { id: payload.categoryId },
        select: { id: true },
      });

      if (!category) {
        return badRequest('categoryId is invalid');
      }
    }

    const existing = await prisma.cashLog.findUnique({
      where: { id: payload.id },
      select: { id: true },
    });

    if (!existing) {
      return notFound('Cash log not found');
    }

    const updated = await prisma.cashLog.update({
      where: { id: payload.id },
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

    return ok(updated);
  } catch {
    return badRequest('Failed to update cash log');
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const { id }: { id?: string } = await req.json();

    if (!id) {
      return badRequest('ID is required');
    }

    const exists = await prisma.cashLog.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) {
      return notFound('Cash log not found');
    }

    await prisma.cashLog.delete({ where: { id } });

    return ok({ success: true });
  } catch {
    return badRequest('Failed to delete cash log');
  }
}
