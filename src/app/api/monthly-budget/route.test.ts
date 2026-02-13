import { NextRequest } from 'next/server';
import { POST, GET, PATCH, DELETE } from './route';
import { BudgetInput } from '@/types/budget';

type Budget = BudgetInput & { id: string };

jest.mock('@/generated/prisma/client', () => {
  let budgets: Budget[] = [];
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      monthlyBudget: {
        create: jest.fn(({ data }: { data: BudgetInput }) => {
          const budget: Budget = { ...data, id: `${budgets.length + 1}` };
          budgets.push(budget);
          return Promise.resolve(budget);
        }),
        findMany: jest.fn(() => Promise.resolve([...budgets])),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<BudgetInput>;
          }) => {
            const idx = budgets.findIndex((b) => b.id === where.id);
            if (idx === -1) throw new Error('Not found');
            budgets[idx] = { ...budgets[idx], ...data };
            return Promise.resolve(budgets[idx]);
          },
        ),
        delete: jest.fn(({ where }: { where: { id: string } }) => {
          budgets = budgets.filter((b) => b.id !== where.id);
          return Promise.resolve();
        }),
      },
    })),
  };
});

describe('Monthly Budget API', () => {
  let id1: string;
  let id2: string;

  it('should create two monthly budgets and save to database', async () => {
    // Arrange
    const req1 = {
      method: 'POST',
      json: async () =>
        ({
          name: 'Test Monthly Budget 1',
          amount: 500000,
          month: '2026-02',
          category: 'Food',
        }) as BudgetInput,
    } as unknown as NextRequest;
    const req2 = {
      method: 'POST',
      json: async () =>
        ({
          name: 'Test Monthly Budget 2',
          amount: 750000,
          month: '2026-03',
          category: 'Transport',
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
    id1 = data1.id;
    id2 = data2.id;
  });

  it('should return all monthly budgets (GET)', async () => {
    // Act
    const res = await GET();

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

  it('should update a monthly budget (PATCH)', async () => {
    // Arrange
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: id1,
        name: 'Updated Budget',
        amount: 999999,
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
    const getRes = await GET();
    const budgets = await getRes.json();
    expect(budgets.find((b: any) => b.id === id2)).toBeUndefined();
  });
});
