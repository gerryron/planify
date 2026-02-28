import { NextRequest } from 'next/server';
import { DELETE, GET, PATCH, POST } from './route';
import { CashLogInput } from '@/features/cash-log/types/cashLog';

type CashLog = CashLogInput & {
  id: string;
  category: {
    id: string;
    name: string;
    type: 'income' | 'outcome';
    parentId: string | null;
  } | null;
};

jest.mock('@/generated/prisma/client', () => {
  let logs: CashLog[] = [];
  const categories = [
    {
      id: 'cat-income-salary',
      name: 'Salary',
      type: 'income' as const,
      parentId: null,
    },
    {
      id: 'cat-outcome-food',
      name: 'Food',
      type: 'outcome' as const,
      parentId: null,
    },
  ];

  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      category: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) => {
          const category =
            categories.find((item) => item.id === where.id) ?? null;
          return Promise.resolve(category ? { id: category.id } : null);
        }),
      },
      cashLog: {
        create: jest.fn(({ data }: { data: CashLogInput }) => {
          const category =
            categories.find((item) => item.id === data.categoryId) ?? null;
          const record: CashLog = {
            id: `${logs.length + 1}`,
            ...data,
            category,
          };
          logs.push(record);
          return Promise.resolve(record);
        }),
        findMany: jest.fn(
          ({
            where,
            orderBy,
          }: {
            where?: { date?: string | { startsWith?: string; gt?: string } };
            orderBy?: Array<{
              date?: 'asc' | 'desc';
              description?: 'asc' | 'desc';
            }>;
          } = {}) => {
            let result = [...logs];

            const dateFilter = where?.date;
            if (dateFilter) {
              if (typeof dateFilter === 'string') {
                result = result.filter((log) => log.date === dateFilter);
              } else if (dateFilter.startsWith) {
                result = result.filter((log) =>
                  log.date.startsWith(dateFilter.startsWith as string),
                );
              } else if (dateFilter.gt) {
                const gt = dateFilter.gt;
                result = result.filter((log) => log.date > gt);
              }
            }

            if (orderBy?.length) {
              result.sort(
                (a, b) =>
                  a.date.localeCompare(b.date) ||
                  a.description.localeCompare(b.description),
              );
            }

            return Promise.resolve(result);
          },
        ),
        findUnique: jest.fn(({ where }: { where: { id: string } }) => {
          const found = logs.find((log) => log.id === where.id) ?? null;
          return Promise.resolve(found ? { id: found.id } : null);
        }),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<CashLogInput>;
          }) => {
            const idx = logs.findIndex((log) => log.id === where.id);
            if (idx < 0) throw new Error('Not found');
            const category =
              data.categoryId !== undefined
                ? (categories.find((item) => item.id === data.categoryId) ??
                  null)
                : logs[idx].category;
            logs[idx] = { ...logs[idx], ...data, category };
            return Promise.resolve(logs[idx]);
          },
        ),
        delete: jest.fn(({ where }: { where: { id: string } }) => {
          logs = logs.filter((log) => log.id !== where.id);
          return Promise.resolve({ id: where.id });
        }),
      },
    })),
  };
});

describe('Cash Log API', () => {
  let id1: string;
  let id2: string;

  it('should create cash log entries', async () => {
    const req1 = {
      method: 'POST',
      json: async () => ({
        date: '2026-02-25',
        description: 'Lunch',
        amount: 35000,
        walletName: 'Cash',
        categoryId: 'cat-outcome-food',
        excludeFromReport: false,
      }),
    } as unknown as NextRequest;

    const req2 = {
      method: 'POST',
      json: async () => ({
        date: '2026-02-26',
        description: 'Freelance Payment',
        amount: 500000,
        walletName: 'BCA',
        categoryId: 'cat-income-salary',
        excludeFromReport: true,
      }),
    } as unknown as NextRequest;

    const res1 = await POST(req1);
    const res2 = await POST(req2);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    const data1: CashLog = await res1.json();
    const data2: CashLog = await res2.json();

    expect(data1.description).toBe('Lunch');
    expect(data2.description).toBe('Freelance Payment');
    expect(data1.walletName).toBe('Cash');
    expect(data2.walletName).toBe('BCA');
    expect(data1.category?.name).toBe('Food');
    expect(data2.category?.name).toBe('Salary');
    expect(data1.excludeFromReport).toBe(false);
    expect(data2.excludeFromReport).toBe(true);

    id1 = data1.id;
    id2 = data2.id;
  });

  it('should get all cash logs', async () => {
    const req = new NextRequest('http://localhost/api/cash-log');
    const res = await GET(req);

    expect(res.status).toBe(200);

    const data: CashLog[] = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter cash logs by date', async () => {
    const req = new NextRequest(
      'http://localhost/api/cash-log?date=2026-02-25',
    );
    const res = await GET(req);

    expect(res.status).toBe(200);

    const data: CashLog[] = await res.json();
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.every((log) => log.date === '2026-02-25')).toBe(true);
  });

  it('should update cash log entry', async () => {
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: id1,
        description: 'Lunch Updated',
        amount: 40000,
        walletName: 'OVO',
        categoryId: 'cat-outcome-food',
        excludeFromReport: true,
      }),
    } as unknown as NextRequest;

    const res = await PATCH(req);

    expect(res.status).toBe(200);

    const data: CashLog = await res.json();
    expect(data.id).toBe(id1);
    expect(data.description).toBe('Lunch Updated');
    expect(data.amount).toBe(40000);
    expect(data.walletName).toBe('OVO');
    expect(data.categoryId).toBe('cat-outcome-food');
    expect(data.excludeFromReport).toBe(true);
  });

  it('should return 400 for missing walletName', async () => {
    const req = {
      method: 'POST',
      json: async () => ({
        date: '2026-02-27',
        description: 'Missing Wallet',
        amount: 10000,
        categoryId: 'cat-income-salary',
        excludeFromReport: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(
      'date, description, amount, walletName, and categoryId are required',
    );
  });

  it('should delete cash log entry', async () => {
    const req = {
      method: 'DELETE',
      json: async () => ({ id: id2 }),
    } as unknown as NextRequest;

    const res = await DELETE(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const getReq = new NextRequest('http://localhost/api/cash-log');
    const getRes = await GET(getReq);
    const logs: CashLog[] = await getRes.json();
    expect(logs.find((log) => log.id === id2)).toBeUndefined();
  });
});
