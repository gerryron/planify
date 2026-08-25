import { NextRequest } from 'next/server';
import { POST as createBudget } from '../route';
import { POST } from './route';
import { BudgetInput } from '@/features/monthly-budget/types/budget';

type Budget = BudgetInput & {
  id: number;
  isDone: boolean;
  sortOrder: number;
  userId?: number;
};

function getMonthOffset(offset: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

jest.mock('@/generated/prisma/client', () => {
  const budgets: Budget[] = [];

  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      monthlyBudget: {
        count: jest.fn(
          ({
            where,
          }: {
            where?: { userId?: number; id?: { in?: number[] } };
          }) => {
            let filtered = budgets;
            if (where?.userId) {
              filtered = filtered.filter(
                (budget) => budget.userId === where.userId,
              );
            }
            if (where?.id?.in) {
              filtered = filtered.filter((budget) =>
                where.id?.in?.includes(budget.id),
              );
            }
            return Promise.resolve(filtered.length);
          },
        ),
        findFirst: jest.fn(
          ({
            where,
            orderBy,
          }: {
            where?: { month?: string; id?: number; userId?: number };
            orderBy?: { sortOrder: 'desc' | 'asc' };
            select?: { sortOrder: boolean };
          }) => {
            let filtered = budgets;
            if (where?.month) {
              filtered = filtered.filter(
                (budget) => budget.month === where.month,
              );
            }
            if (where?.id) {
              filtered = filtered.filter((budget) => budget.id === where.id);
            }
            if (where?.userId) {
              filtered = filtered.filter(
                (budget) => budget.userId === where.userId,
              );
            }

            if (filtered.length === 0) return Promise.resolve(null);

            if (!orderBy) {
              return Promise.resolve({ id: filtered[0].id });
            }

            const sorted = [...filtered].sort((a, b) =>
              orderBy.sortOrder === 'desc'
                ? b.sortOrder - a.sortOrder
                : a.sortOrder - b.sortOrder,
            );
            return Promise.resolve({ sortOrder: sorted[0].sortOrder });
          },
        ),
        findMany: jest.fn(
          ({
            where,
          }: {
            where?: {
              userId?: number;
              month?: string;
              id?: { in?: number[] };
            };
          }) => {
            let filtered = budgets;
            if (where?.userId) {
              filtered = filtered.filter(
                (budget) => budget.userId === where.userId,
              );
            }
            if (where?.month) {
              filtered = filtered.filter(
                (budget) => budget.month === where.month,
              );
            }
            if (where?.id?.in) {
              filtered = filtered.filter((budget) =>
                where.id?.in?.includes(budget.id),
              );
            }
            return Promise.resolve(
              [...filtered].sort((a, b) => a.sortOrder - b.sortOrder),
            );
          },
        ),
        create: jest.fn(
          ({
            data,
          }: {
            data: BudgetInput & {
              userId?: number;
              sortOrder?: number;
              isDone?: boolean;
            };
          }) => {
            const budget: Budget = {
              ...data,
              id: budgets.length + 1,
              isDone: data.isDone ?? false,
              sortOrder: data.sortOrder ?? budgets.length,
            };
            budgets.push(budget);
            return Promise.resolve(budget);
          },
        ),
      },
      $transaction: jest.fn((actions: Promise<unknown>[]) =>
        Promise.all(actions),
      ),
    })),
  };
});

describe('Monthly Budget Copy API', () => {
  const prevMonth = getMonthOffset(-1);
  const currentMonth = getMonthOffset(0);

  async function seedBudget(
    name: string,
    month: string,
    type: 'income' | 'outcome',
  ): Promise<Budget> {
    const req = {
      method: 'POST',
      json: async () =>
        ({
          name,
          amount: 100000,
          month,
          category: 'Food',
          type,
        }) as BudgetInput,
    } as unknown as NextRequest;
    const res = await createBudget(req);
    expect(res.status).toBe(201);
    return res.json();
  }

  function copyReq(body: unknown) {
    return {
      method: 'POST',
      json: async () => body,
    } as unknown as NextRequest;
  }

  it('should append copied budgets after existing items in the target month', async () => {
    await seedBudget('Existing 1', currentMonth, 'outcome');
    await seedBudget('Existing 2', currentMonth, 'income');
    const src = await seedBudget('Source', prevMonth, 'outcome');

    const res = await POST(
      copyReq({ ids: [src.id], targetMonth: currentMonth }),
    );

    expect(res.status).toBe(201);
    const data: Budget[] = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].sortOrder).toBe(2);
  });

  it('should copy selected budgets to the target month', async () => {
    const src1 = await seedBudget('Source 1', prevMonth, 'outcome');
    const src2 = await seedBudget('Source 2', prevMonth, 'income');

    const res = await POST(
      copyReq({ ids: [src1.id, src2.id], targetMonth: currentMonth }),
    );

    expect(res.status).toBe(201);
    const data: Budget[] = await res.json();
    expect(data).toHaveLength(2);
    [src1, src2].forEach((source, index) => {
      const item = data[index];
      expect(item.name).toBe(source.name);
      expect(item.amount).toBe(source.amount);
      expect(item.category).toBe(source.category);
      expect(item.type).toBe(source.type);
      expect(item.month).toBe(currentMonth);
      expect(item.isDone).toBe(false);
      expect(item.id).not.toBe(source.id);
    });
  });

  it('should reject an empty ids array', async () => {
    const res = await POST(copyReq({ ids: [], targetMonth: currentMonth }));
    expect(res.status).toBe(400);
  });

  it('should reject non-numeric ids', async () => {
    const res = await POST(
      copyReq({ ids: ['abc'], targetMonth: currentMonth }),
    );
    expect(res.status).toBe(400);
  });

  it('should reject ids that are not positive integers', async () => {
    const res = await POST(copyReq({ ids: [0, -1], targetMonth: currentMonth }));
    expect(res.status).toBe(400);
  });

  it('should reject an invalid targetMonth format', async () => {
    const res = await POST(copyReq({ ids: [1], targetMonth: '2026' }));
    expect(res.status).toBe(400);
  });

  it('should reject a missing targetMonth', async () => {
    const res = await POST(copyReq({ ids: [1] }));
    expect(res.status).toBe(400);
  });

  it('should return 404 when any id does not belong to the user', async () => {
    const src = await seedBudget('Source', prevMonth, 'outcome');

    const res = await POST(
      copyReq({ ids: [src.id, 9999], targetMonth: currentMonth }),
    );

    expect(res.status).toBe(404);
  });
});
