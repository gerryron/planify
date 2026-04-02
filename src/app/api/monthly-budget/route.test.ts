import { NextRequest } from 'next/server';
import { POST, GET, PATCH, DELETE } from './route';
import { BudgetInput } from '@/features/monthly-budget/types/budget';

type Budget = BudgetInput & {
  id: number;
  isDone: boolean;
  sortOrder: number;
  userId?: string;
};

function getMonthOffset(offset: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

jest.mock('@/generated/prisma/client', () => {
  let budgets: Budget[] = [];

  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      monthlyBudget: {
        count: jest.fn(
          ({
            where,
          }: {
            where?: { id?: { in?: number[] }; userId?: string };
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
            where?: { month?: string; id?: number; userId?: string };
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
        create: jest.fn(
          ({
            data,
          }: {
            data: BudgetInput & { sortOrder?: number; userId?: string };
          }) => {
            const budget: Budget = {
              ...data,
              id: budgets.length + 1,
              isDone: false,
              sortOrder: data.sortOrder ?? budgets.length,
            };
            budgets.push(budget);
            return Promise.resolve(budget);
          },
        ),
        findMany: jest.fn(
          (args?: {
            where?: {
              userId?: string;
              month?: string | { gt: string };
            };
            orderBy?:
              | { month?: 'asc' | 'desc'; sortOrder?: 'asc' | 'desc' }
              | Array<{ month?: 'asc' | 'desc'; sortOrder?: 'asc' | 'desc' }>;
          }) => {
            const monthFilter = args?.where?.month;
            const sortBudgets = (list: Budget[]) =>
              [...list].sort((a, b) => a.sortOrder - b.sortOrder);

            if (!monthFilter) return Promise.resolve(sortBudgets(budgets));
            let base = budgets;
            if (args?.where && 'userId' in args.where && args.where.userId) {
              base = base.filter(
                (budget) => budget.userId === args.where?.userId,
              );
            }
            if (typeof monthFilter === 'string') {
              return Promise.resolve(
                sortBudgets(base.filter((b) => b.month === monthFilter)),
              );
            }
            if ('gt' in monthFilter) {
              return Promise.resolve(
                sortBudgets(base.filter((b) => b.month > monthFilter.gt)),
              );
            }
            return Promise.resolve(sortBudgets(base));
          },
        ),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: number };
            data: Partial<BudgetInput> & {
              sortOrder?: number;
              isDone?: boolean;
            };
          }) => {
            const idx = budgets.findIndex((b) => b.id === where.id);
            if (idx === -1) throw new Error('Not found');
            budgets[idx] = { ...budgets[idx], ...data };
            return Promise.resolve(budgets[idx]);
          },
        ),
        delete: jest.fn(({ where }: { where: { id: number } }) => {
          budgets = budgets.filter((b) => b.id !== where.id);
          return Promise.resolve();
        }),
      },
      $transaction: jest.fn((actions: Promise<unknown>[]) =>
        Promise.all(actions),
      ),
    })),
  };
});

describe('Monthly Budget API', () => {
  let id1: number;
  let id2: number;
  const prevMonth = getMonthOffset(-1);
  const nextMonth = getMonthOffset(1);

  it('should create two monthly budgets and save to database', async () => {
    // Arrange
    const req1 = {
      method: 'POST',
      json: async () =>
        ({
          name: 'Test Monthly Budget 1',
          amount: 500000,
          month: prevMonth,
          category: 'Food',
          type: 'outcome',
        }) as BudgetInput,
    } as unknown as NextRequest;
    const req2 = {
      method: 'POST',
      json: async () =>
        ({
          name: 'Test Monthly Budget 2',
          amount: 750000,
          month: nextMonth,
          category: 'Transport',
          type: 'income',
        }) as BudgetInput,
    } as unknown as NextRequest;

    // Act
    const res1 = await POST(req1);
    const res2 = await POST(req2);

    // Assert
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    const data1 = await res1.json();
    const data2 = await res2.json();
    expect(data1).toHaveProperty('id');
    expect(data2).toHaveProperty('id');
    expect(data1.name).toBe('Test Monthly Budget 1');
    expect(data2.name).toBe('Test Monthly Budget 2');
    expect(data1.type).toBe('outcome');
    expect(data2.type).toBe('income');
    expect(data1.isDone).toBe(false);
    expect(data2.isDone).toBe(false);
    id1 = data1.id;
    id2 = data2.id;
  });

  it('should return all monthly budgets (GET)', async () => {
    // Act
    const req = new NextRequest('http://localhost/api/monthly-budget');
    const res = await GET(req);

    // Assert
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);
    expect(data[0]).toHaveProperty('id');
    expect(data[1]).toHaveProperty('id');
    expect(data[0].name).toBe('Test Monthly Budget 1');
    expect(data[1].name).toBe('Test Monthly Budget 2');
  });

  it('should reorder monthly budgets persistently', async () => {
    const getBeforeReq = new NextRequest('http://localhost/api/monthly-budget');
    const getBeforeRes = await GET(getBeforeReq);
    const before: Budget[] = await getBeforeRes.json();
    const reversedIds = [...before].reverse().map((budget) => budget.id);

    const reorderReq = {
      method: 'PATCH',
      json: async () => ({ orderedIds: reversedIds }),
    } as unknown as NextRequest;

    const reorderRes = await PATCH(reorderReq);
    expect(reorderRes.status).toBe(200);

    const getAfterReq = new NextRequest('http://localhost/api/monthly-budget');
    const getAfterRes = await GET(getAfterReq);
    const after: Budget[] = await getAfterRes.json();
    expect(after.map((budget) => budget.id)).toEqual(reversedIds);
  });

  it('should update a monthly budget (PATCH)', async () => {
    // Arrange
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: id1,
        name: 'Updated Budget',
        amount: 999999,
        type: 'income',
      }),
    } as unknown as NextRequest;

    // Act
    const res = await PATCH(req);

    // Assert
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(id1);
    expect(data.name).toBe('Updated Budget');
    expect(data.amount).toBe(999999);
    expect(data.type).toBe('income');
  });

  it('should return budgets by requested month', async () => {
    const req = new NextRequest(
      `http://localhost/api/monthly-budget?month=${prevMonth}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data: Budget[] = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.every((budget) => budget.month === prevMonth)).toBe(true);
  });

  it('should return only future months when month=future', async () => {
    const req = new NextRequest(
      'http://localhost/api/monthly-budget?month=future',
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data: Budget[] = await res.json();
    expect(data.length).toBe(1);
    expect(data[0].month).toBe(nextMonth);
  });

  it('should return all budgets when requested month is greater than current', async () => {
    const req = new NextRequest(
      `http://localhost/api/monthly-budget?month=${nextMonth}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data: Budget[] = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(2);
  });

  it('should delete a monthly budget (DELETE)', async () => {
    // Arrange
    const req = {
      method: 'DELETE',
      json: async () => ({ id: id2 }),
    } as unknown as NextRequest;

    // Act
    const res = await DELETE(req);

    // Assert
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Verify deletion
    const getReq = new NextRequest('http://localhost/api/monthly-budget');
    const getRes = await GET(getReq);
    const budgets: Budget[] = await getRes.json();
    expect(budgets.find((b) => b.id === id2)).toBeUndefined();
  });

  it('should create budget with isDone defaulting to false', async () => {
    const req = {
      method: 'POST',
      json: async () =>
        ({
          name: 'Check isDone Default',
          amount: 100000,
          month: prevMonth,
          category: 'Food',
          type: 'outcome',
        }) as BudgetInput,
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.isDone).toBe(false);
  });

  it('should toggle isDone via PATCH', async () => {
    const req = {
      method: 'PATCH',
      json: async () => ({ id: id1, isDone: true }),
    } as unknown as NextRequest;

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(id1);
    expect(data.isDone).toBe(true);

    // Toggle back
    const req2 = {
      method: 'PATCH',
      json: async () => ({ id: id1, isDone: false }),
    } as unknown as NextRequest;

    const res2 = await PATCH(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.isDone).toBe(false);
  });
});
