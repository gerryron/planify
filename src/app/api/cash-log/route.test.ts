import { NextRequest } from 'next/server';
import { DELETE, GET, PATCH, POST } from './route';
import { CashLogInput } from '@/features/cash-log/types/cashLog';

type CashLog = CashLogInput & {
  id: number;
  category: {
    id: number;
    name: string;
    type: 'income' | 'outcome';
    parentId: number | null;
  } | null;
};

const wallets = [
  { id: 1, name: 'Cash', balance: 100000 },
  { id: 2, name: 'BCA', balance: 2000000 },
  { id: 3, name: 'OVO', balance: 300000 },
];

jest.mock('@/generated/prisma/client', () => {
  let logs: CashLog[] = [];
  const categories = [
    {
      id: 101,
      name: 'Salary',
      type: 'income' as const,
      parentId: null,
    },
    {
      id: 102,
      name: 'Food',
      type: 'outcome' as const,
      parentId: null,
    },
  ];

  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      const client = {
        category: {
          findUnique: jest.fn(({ where }: { where: { id: number } }) => {
            const category =
              categories.find((item) => item.id === where.id) ?? null;
            return Promise.resolve(category);
          }),
        },
        wallet: {
          findUnique: jest.fn(({ where }: { where: { name?: string } }) => {
            if (where.name) {
              const wallet =
                wallets.find((item) => item.name === where.name) ?? null;
              return Promise.resolve(
                wallet ? { id: wallet.id, balance: wallet.balance } : null,
              );
            }

            return Promise.resolve(null);
          }),
          update: jest.fn(
            ({
              where,
              data,
            }: {
              where: { id: number };
              data: { balance: number };
            }) => {
              const idx = wallets.findIndex((item) => item.id === where.id);
              if (idx < 0) throw new Error('Not found');
              wallets[idx] = { ...wallets[idx], balance: data.balance };
              return Promise.resolve(wallets[idx]);
            },
          ),
        },
        cashLog: {
          create: jest.fn(({ data }: { data: CashLogInput }) => {
            const category =
              categories.find((item) => item.id === data.categoryId) ?? null;
            const record: CashLog = {
              id: logs.length + 1,
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
              where?: {
                date?:
                  | string
                  | { startsWith?: string; gt?: string; gte?: string };
              };
              orderBy?: Array<{
                id?: 'asc' | 'desc';
                date?: 'asc' | 'desc';
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
                } else if (dateFilter.gte) {
                  const gte = dateFilter.gte;
                  result = result.filter((log) => log.date >= gte);
                }
              }

              if (orderBy?.length) {
                result.sort(
                  (a, b) => b.id - a.id || b.date.localeCompare(a.date),
                );
              }

              return Promise.resolve(result);
            },
          ),
          findUnique: jest.fn(({ where }: { where: { id: number } }) => {
            const found = logs.find((log) => log.id === where.id) ?? null;
            return Promise.resolve(found);
          }),
          update: jest.fn(
            ({
              where,
              data,
            }: {
              where: { id: number };
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
          delete: jest.fn(({ where }: { where: { id: number } }) => {
            logs = logs.filter((log) => log.id !== where.id);
            return Promise.resolve({ id: where.id });
          }),
        },
      };

      return {
        ...client,
        $transaction: jest.fn((input: unknown) => {
          if (typeof input === 'function') {
            return (input as (tx: typeof client) => unknown)(client);
          }
          return Promise.all(input as Promise<unknown>[]);
        }),
      };
    }),
  };
});

describe('Cash Log API', () => {
  let id1: number;
  let id2: number;

  it('should create cash log entries', async () => {
    const req1 = {
      method: 'POST',
      json: async () => ({
        date: '2026-02-25',
        description: 'Lunch',
        amount: 35000,
        walletName: 'Cash',
        categoryId: 102,
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
        categoryId: 101,
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
    expect(data1.amount).toBe(35000);
    expect(data2.amount).toBe(500000);

    const cashWallet = wallets.find((wallet) => wallet.name === 'Cash');
    const bcaWallet = wallets.find((wallet) => wallet.name === 'BCA');
    expect(cashWallet?.balance).toBe(65000);
    expect(bcaWallet?.balance).toBe(2500000);

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

  it('should return only next month onward for future filter', async () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const nextMonthDate = new Date(currentYear, currentMonth, 1);

    const currentMonthDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-15`;
    const nextMonthLogDate = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-10`;

    const createCurrentReq = {
      method: 'POST',
      json: async () => ({
        date: currentMonthDate,
        description: 'Current month marker',
        amount: 10000,
        walletName: 'Cash',
        categoryId: 101,
        excludeFromReport: false,
      }),
    } as unknown as NextRequest;

    const createNextReq = {
      method: 'POST',
      json: async () => ({
        date: nextMonthLogDate,
        description: 'Future month marker',
        amount: 12000,
        walletName: 'Cash',
        categoryId: 101,
        excludeFromReport: false,
      }),
    } as unknown as NextRequest;

    const currentRes = await POST(createCurrentReq);
    const nextRes = await POST(createNextReq);
    expect(currentRes.status).toBe(201);
    expect(nextRes.status).toBe(201);

    const currentLog: CashLog = await currentRes.json();
    const nextLog: CashLog = await nextRes.json();

    const futureReq = new NextRequest(
      'http://localhost/api/cash-log?month=future',
    );
    const futureRes = await GET(futureReq);
    expect(futureRes.status).toBe(200);

    const futureData: CashLog[] = await futureRes.json();
    expect(
      futureData.some((log) => log.description === 'Future month marker'),
    ).toBe(true);
    expect(
      futureData.some((log) => log.description === 'Current month marker'),
    ).toBe(false);

    const cleanupCurrentReq = {
      method: 'DELETE',
      json: async () => ({ id: currentLog.id }),
    } as unknown as NextRequest;
    const cleanupNextReq = {
      method: 'DELETE',
      json: async () => ({ id: nextLog.id }),
    } as unknown as NextRequest;

    const cleanupCurrentRes = await DELETE(cleanupCurrentReq);
    const cleanupNextRes = await DELETE(cleanupNextReq);
    expect(cleanupCurrentRes.status).toBe(200);
    expect(cleanupNextRes.status).toBe(200);
  });

  it('should update cash log entry', async () => {
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: id1,
        description: 'Lunch Updated',
        amount: 40000,
        walletName: 'OVO',
        categoryId: 102,
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
    expect(data.categoryId).toBe(102);
    expect(data.excludeFromReport).toBe(true);

    const cashWallet = wallets.find((wallet) => wallet.name === 'Cash');
    const ovoWallet = wallets.find((wallet) => wallet.name === 'OVO');
    expect(cashWallet?.balance).toBe(100000);
    expect(ovoWallet?.balance).toBe(260000);
  });

  it('should return 400 for missing walletName', async () => {
    const req = {
      method: 'POST',
      json: async () => ({
        date: '2026-02-27',
        description: 'Missing Wallet',
        amount: 10000,
        categoryId: 101,
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

  it('should return 400 when creating cash log with negative amount', async () => {
    const req = {
      method: 'POST',
      json: async () => ({
        date: '2026-02-27',
        description: 'Invalid negative amount',
        amount: -10000,
        walletName: 'Cash',
        categoryId: 102,
        excludeFromReport: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('amount must be greater than 0');
  });

  it('should return 400 when updating cash log with zero amount', async () => {
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: id1,
        amount: 0,
      }),
    } as unknown as NextRequest;

    const res = await PATCH(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('amount must be greater than 0');
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

    const bcaWallet = wallets.find((wallet) => wallet.name === 'BCA');
    expect(bcaWallet?.balance).toBe(2000000);
  });

  it('should return 400 for invalid walletName', async () => {
    const req = {
      method: 'POST',
      json: async () => ({
        date: '2026-02-28',
        description: 'Unknown wallet test',
        amount: 12345,
        walletName: 'Unknown Wallet',
        categoryId: 101,
        excludeFromReport: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('walletName is invalid');
  });

  it('should adjust wallet balance when editing category type on same wallet', async () => {
    const createReq = {
      method: 'POST',
      json: async () => ({
        date: '2026-02-28',
        description: 'Type switch scenario',
        amount: 10000,
        walletName: 'OVO',
        categoryId: 102,
        excludeFromReport: false,
      }),
    } as unknown as NextRequest;

    const createRes = await POST(createReq);
    expect(createRes.status).toBe(201);
    const created: CashLog = await createRes.json();

    const ovoAfterCreate = wallets.find((wallet) => wallet.name === 'OVO');
    expect(ovoAfterCreate?.balance).toBe(250000);

    const patchReq = {
      method: 'PATCH',
      json: async () => ({
        id: created.id,
        amount: 10000,
        walletName: 'OVO',
        categoryId: 101,
        description: 'Type switch scenario',
        excludeFromReport: false,
      }),
    } as unknown as NextRequest;

    const patchRes = await PATCH(patchReq);
    expect(patchRes.status).toBe(200);

    const patched: CashLog = await patchRes.json();
    expect(patched.categoryId).toBe(101);

    const ovoAfterPatch = wallets.find((wallet) => wallet.name === 'OVO');
    expect(ovoAfterPatch?.balance).toBe(270000);
  });

  it('should rollback wallet balance when deleting edited entry', async () => {
    const getReq = new NextRequest('http://localhost/api/cash-log');
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(200);
    const allLogs: CashLog[] = await getRes.json();

    const target = allLogs.find(
      (log) => log.description === 'Type switch scenario',
    );
    expect(target).toBeDefined();

    const deleteReq = {
      method: 'DELETE',
      json: async () => ({ id: target!.id }),
    } as unknown as NextRequest;

    const deleteRes = await DELETE(deleteReq);
    expect(deleteRes.status).toBe(200);

    const ovoAfterDelete = wallets.find((wallet) => wallet.name === 'OVO');
    expect(ovoAfterDelete?.balance).toBe(260000);
  });
});
