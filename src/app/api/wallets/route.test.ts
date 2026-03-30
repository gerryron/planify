import type { NextRequest } from 'next/server';
import { POST, GET, PATCH, DELETE } from './route';

type Wallet = {
  id: number;
  sortOrder: number;
  userId?: string;
  name: string;
  balance: number;
  excludeFromTotal: boolean;
  walletKind: 'basic' | 'goal' | 'credit_card';
  goalAmount?: number | null;
  goalStartMonth?: string | null;
  goalDueMonth?: string | null;
  creditLimit?: number | null;
  statementDay?: number | null;
  dueDay?: number | null;
};
const adjustmentLogs: Array<{
  id: number;
  date: string;
  description: string;
  amount: number;
  walletName: string;
  excludeFromReport: boolean;
  categoryId: number | null;
  userId?: string;
}> = [];

jest.mock('@/generated/prisma/client', () => {
  let wallets: Wallet[] = [];
  const categories = [
    { id: 101, name: 'Transfer In', type: 'income' },
    { id: 102, name: 'Transfer Out', type: 'outcome' },
  ];

  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      const client = {
        category: {
          findFirst: jest.fn(
            ({
              where,
            }: {
              where: { name: string; type: string };
              select?: { id: boolean };
            }) => {
              const found =
                categories.find(
                  (item) =>
                    item.name === where.name && item.type === where.type,
                ) ?? null;
              return Promise.resolve(found ? { id: found.id } : null);
            },
          ),
        },
        wallet: {
          count: jest.fn(
            ({
              where,
            }: {
              where?: { id?: { in?: number[] }; userId?: string };
            } = {}) => {
              let filtered = wallets;
              if (where?.userId) {
                filtered = filtered.filter(
                  (wallet) => wallet.userId === where.userId,
                );
              }
              if (where?.id?.in) {
                filtered = filtered.filter((wallet) =>
                  where.id?.in?.includes(wallet.id),
                );
              }
              return Promise.resolve(filtered.length);
            },
          ),
          create: jest.fn(
            ({
              data,
            }: {
              data: Omit<Wallet, 'id' | 'sortOrder'> & {
                sortOrder?: number;
                userId?: string;
              };
            }) => {
              const wallet: Wallet = {
                ...data,
                id: wallets.length + 1,
                sortOrder: data.sortOrder ?? wallets.length,
              };
              wallets.push(wallet);
              return Promise.resolve(wallet);
            },
          ),
          findFirst: jest.fn(
            ({
              where,
              orderBy,
            }: {
              where?: { id?: number; userId?: string };
              orderBy?: { sortOrder: 'desc' | 'asc' };
              select?: { sortOrder: boolean };
            }) => {
              let filtered = wallets;
              if (where?.userId) {
                filtered = filtered.filter(
                  (wallet) => wallet.userId === where.userId,
                );
              }

              if (where?.id !== undefined) {
                const found =
                  filtered.find((wallet) => wallet.id === where.id) ?? null;
                return Promise.resolve(found);
              }

              if (filtered.length === 0) return Promise.resolve(null);

              if (!orderBy) {
                return Promise.resolve(filtered[0]);
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
            ({ where }: { where?: { userId?: string } } = {}) => {
              let filtered = wallets;
              if (where?.userId) {
                filtered = filtered.filter(
                  (wallet) => wallet.userId === where.userId,
                );
              }

              return Promise.resolve(
                [...filtered].sort(
                  (a, b) =>
                    a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
                ),
              );
            },
          ),
          findUnique: jest.fn(({ where }: { where: { id: number } }) => {
            const wallet = wallets.find((item) => item.id === where.id) ?? null;
            return Promise.resolve(
              wallet
                ? { id: wallet.id, name: wallet.name, balance: wallet.balance }
                : null,
            );
          }),
          update: jest.fn(
            ({
              where,
              data,
            }: {
              where: { id: number };
              data: Partial<Omit<Wallet, 'id' | 'sortOrder'>> & {
                sortOrder?: number;
              };
            }) => {
              const idx = wallets.findIndex((w) => w.id === where.id);
              if (idx === -1) throw new Error('Not found');
              wallets[idx] = { ...wallets[idx], ...data };
              return Promise.resolve(wallets[idx]);
            },
          ),
          delete: jest.fn(({ where }: { where: { id: number } }) => {
            wallets = wallets.filter((w) => w.id !== where.id);
            return Promise.resolve();
          }),
        },
        cashLog: {
          create: jest.fn(
            ({
              data,
            }: {
              data: {
                date: string;
                description: string;
                amount: number;
                walletName: string;
                excludeFromReport: boolean;
                categoryId: number | null;
                userId?: string;
              };
            }) => {
              const record = {
                id: adjustmentLogs.length + 1,
                ...data,
              };
              adjustmentLogs.push(record);
              return Promise.resolve(record);
            },
          ),
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

describe('Wallet API', () => {
  let id1: number;
  let id2: number;
  let creditCardId: number;

  it('should create wallet data', async () => {
    const beforeCount = adjustmentLogs.length;
    const req1 = {
      method: 'POST',
      json: async () => ({
        name: 'BCA',
        balance: 1200000,
        excludeFromTotal: false,
        walletKind: 'basic',
      }),
    } as unknown as NextRequest;

    const req2 = {
      method: 'POST',
      json: async () => ({
        name: 'OVO',
        balance: 500000,
        excludeFromTotal: true,
        walletKind: 'basic',
      }),
    } as unknown as NextRequest;

    const res1 = await POST(req1);
    const res2 = await POST(req2);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    const data1 = await res1.json();
    const data2 = await res2.json();

    expect(data1.name).toBe('BCA');
    expect(data2.name).toBe('OVO');
    expect(data1.excludeFromTotal).toBe(false);
    expect(data2.excludeFromTotal).toBe(true);
    expect(data1.sortOrder).toBeLessThan(data2.sortOrder);
    expect(adjustmentLogs.length).toBe(beforeCount + 2);
    expect(adjustmentLogs[beforeCount].walletName).toBe('BCA');
    expect(adjustmentLogs[beforeCount].amount).toBe(1200000);
    expect(adjustmentLogs[beforeCount].excludeFromReport).toBe(true);
    expect(adjustmentLogs[beforeCount].categoryId).toBe(101);
    expect(adjustmentLogs[beforeCount + 1].walletName).toBe('OVO');
    expect(adjustmentLogs[beforeCount + 1].amount).toBe(500000);
    expect(adjustmentLogs[beforeCount + 1].excludeFromReport).toBe(true);
    expect(adjustmentLogs[beforeCount + 1].categoryId).toBe(101);
    id1 = data1.id;
    id2 = data2.id;
  });

  it('should reorder wallet data persistently', async () => {
    const getBefore = await GET();
    const before: Wallet[] = await getBefore.json();
    const reversedIds = [...before].reverse().map((wallet) => wallet.id);

    const req = {
      method: 'PATCH',
      json: async () => ({ orderedIds: reversedIds }),
    } as unknown as NextRequest;

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const getAfter = await GET();
    const after: Wallet[] = await getAfter.json();
    expect(after.map((wallet) => wallet.id)).toEqual(reversedIds);
  });

  it('should return all wallets (GET)', async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    const data: Wallet[] = await res.json();

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(2);
  });

  it('should update wallet data', async () => {
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: id1,
        name: 'BCA Updated',
        balance: 1500000,
        excludeFromTotal: true,
      }),
    } as unknown as NextRequest;

    const res = await PATCH(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(id1);
    expect(data.name).toBe('BCA Updated');
    expect(data.balance).toBe(1500000);
    expect(data.excludeFromTotal).toBe(true);
  });

  it('should create adjustment cash log when balance changes', async () => {
    const beforeCount = adjustmentLogs.length;
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: id1,
        balance: 1700000,
      }),
    } as unknown as NextRequest;

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.balance).toBe(1700000);

    const createdLog = adjustmentLogs[adjustmentLogs.length - 1];
    expect(adjustmentLogs.length).toBe(beforeCount + 1);
    expect(createdLog.description).toBe('Adjust Balance');
    expect(createdLog.excludeFromReport).toBe(true);
    expect(createdLog.categoryId).toBe(101);
  });

  it('should create goal wallet and force excludeFromTotal', async () => {
    const req = {
      method: 'POST',
      json: async () => ({
        name: 'Emergency Fund',
        balance: 300000,
        excludeFromTotal: false,
        walletKind: 'goal',
        goalAmount: 10000000,
        goalStartMonth: '2026-03',
        goalDueMonth: '2027-03',
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.walletKind).toBe('goal');
    expect(data.excludeFromTotal).toBe(true);
    expect(data.goalAmount).toBe(10000000);
    expect(data.goalDueMonth).toBe('2027-03');
  });

  it('should create credit card wallet and force excludeFromTotal', async () => {
    const req = {
      method: 'POST',
      json: async () => ({
        name: 'BCA Card',
        balance: 750000,
        excludeFromTotal: false,
        walletKind: 'credit_card',
        creditLimit: 5000000,
        statementDay: 20,
        dueDay: 5,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.walletKind).toBe('credit_card');
    expect(data.excludeFromTotal).toBe(true);
    expect(data.creditLimit).toBe(5000000);
    expect(data.statementDay).toBe(20);
    expect(data.dueDay).toBe(5);
    creditCardId = data.id;
  });

  it('should reject basic wallet when goal fields are provided', async () => {
    const req = {
      method: 'POST',
      json: async () => ({
        name: 'Invalid Basic Wallet',
        balance: 100000,
        excludeFromTotal: false,
        walletKind: 'basic',
        goalAmount: 500000,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Goal fields are only allowed for Goal Wallet');
  });

  it('should reject credit card wallet when due day is invalid', async () => {
    const req = {
      method: 'POST',
      json: async () => ({
        name: 'Invalid Day Card',
        balance: 100000,
        excludeFromTotal: true,
        walletKind: 'credit_card',
        creditLimit: 5000000,
        statementDay: 20,
        dueDay: 0,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Due day must be between 1 and 31');
  });

  it('should reject credit card wallet when outstanding exceeds credit limit', async () => {
    const req = {
      method: 'POST',
      json: async () => ({
        name: 'Overlimit Card',
        balance: 6000000,
        excludeFromTotal: true,
        walletKind: 'credit_card',
        creditLimit: 5000000,
        statementDay: 20,
        dueDay: 5,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Outstanding balance cannot exceed credit limit');
  });

  it('should reject credit card wallet when mandatory credit card fields are missing', async () => {
    const req = {
      method: 'POST',
      json: async () => ({
        name: 'Invalid Card',
        balance: 100000,
        excludeFromTotal: true,
        walletKind: 'credit_card',
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Credit limit must be greater than 0');
  });

  it('should reject walletKind change after wallet is created', async () => {
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: id1,
        walletKind: 'goal',
        goalAmount: 1000000,
        goalDueMonth: '2026-12',
      }),
    } as unknown as NextRequest;

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Wallet type cannot be changed once created');
  });

  it('should update credit card wallet metadata', async () => {
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: creditCardId,
        statementDay: 22,
        dueDay: 7,
      }),
    } as unknown as NextRequest;

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.statementDay).toBe(22);
    expect(data.dueDay).toBe(7);
  });

  it('should reject credit card update when balance exceeds updated limit', async () => {
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: creditCardId,
        creditLimit: 500000,
      }),
    } as unknown as NextRequest;

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Outstanding balance cannot exceed credit limit');
  });

  it('should create Transfer Out adjustment when balance decreases', async () => {
    const beforeCount = adjustmentLogs.length;
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: id1,
        balance: 1600000,
      }),
    } as unknown as NextRequest;

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.balance).toBe(1600000);

    const createdLog = adjustmentLogs[adjustmentLogs.length - 1];
    expect(adjustmentLogs.length).toBe(beforeCount + 1);
    expect(createdLog.description).toBe('Adjust Balance');
    expect(createdLog.amount).toBe(100000);
    expect(createdLog.excludeFromReport).toBe(true);
    expect(createdLog.categoryId).toBe(102);
  });

  it('should not create adjustment cash log when balance is unchanged', async () => {
    const beforeCount = adjustmentLogs.length;
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: id1,
        balance: 1600000,
      }),
    } as unknown as NextRequest;

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.balance).toBe(1600000);
    expect(adjustmentLogs.length).toBe(beforeCount);
  });

  it('should delete wallet data', async () => {
    const req = {
      method: 'DELETE',
      json: async () => ({ id: id2 }),
    } as unknown as NextRequest;

    const res = await DELETE(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    const getRes = await GET();
    const wallets: Wallet[] = await getRes.json();
    expect(wallets.find((w) => w.id === id2)).toBeUndefined();
  });

  it('should reject delete when wallet count would be less than 1', async () => {
    const getRes = await GET();
    const wallets: Wallet[] = await getRes.json();

    for (const wallet of wallets) {
      const currentRes = await GET();
      const currentWallets: Wallet[] = await currentRes.json();
      if (currentWallets.length <= 1) break;

      const deleteReq = {
        method: 'DELETE',
        json: async () => ({ id: wallet.id }),
      } as unknown as NextRequest;
      await DELETE(deleteReq);
    }

    const lastRes = await GET();
    const lastWallets: Wallet[] = await lastRes.json();
    expect(lastWallets.length).toBe(1);

    const req = {
      method: 'DELETE',
      json: async () => ({ id: lastWallets[0].id }),
    } as unknown as NextRequest;

    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Wallet must be at least 1');
  });
});
