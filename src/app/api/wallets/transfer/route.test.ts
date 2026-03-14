import type { NextRequest } from 'next/server';
import { POST } from './route';

type Wallet = {
  id: number;
  name: string;
  balance: number;
};

type Category = {
  id: number;
  name: string;
  type: 'income' | 'outcome';
  parentId: number | null;
};

type CashLog = {
  id: number;
  date: string;
  description: string;
  amount: number;
  walletName: string;
  excludeFromReport: boolean;
  categoryId: number | null;
};

let wallets: Wallet[] = [];
let categories: Category[] = [];
let cashLogs: CashLog[] = [];

function resetStore() {
  wallets = [
    { id: 1, name: 'BCA', balance: 1000000 },
    { id: 2, name: 'Cash', balance: 200000 },
    { id: 3, name: 'GoPay', balance: 50000 },
  ];

  categories = [
    {
      id: 101,
      name: 'Wallet Transfer In',
      type: 'income',
      parentId: 100,
    },
    {
      id: 102,
      name: 'Wallet Transfer Out',
      type: 'outcome',
      parentId: 200,
    },
    {
      id: 200,
      name: 'Transfer',
      type: 'outcome',
      parentId: null,
    },
  ];

  cashLogs = [];
}

jest.mock('@/generated/prisma/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => {
      const client = {
        wallet: {
          findUnique: jest.fn(
            ({ where }: { where: { id?: number; name?: string } }) => {
              if (where.id) {
                return Promise.resolve(
                  wallets.find((wallet) => wallet.id === where.id) ?? null,
                );
              }

              if (where.name) {
                return Promise.resolve(
                  wallets.find((wallet) => wallet.name === where.name) ?? null,
                );
              }

              return Promise.resolve(null);
            },
          ),
          update: jest.fn(
            ({
              where,
              data,
            }: {
              where: { id: number };
              data: { balance: number };
            }) => {
              const index = wallets.findIndex(
                (wallet) => wallet.id === where.id,
              );
              if (index < 0) throw new Error('Not found');
              wallets[index] = { ...wallets[index], balance: data.balance };
              return Promise.resolve(wallets[index]);
            },
          ),
        },
        category: {
          findFirst: jest.fn(
            ({
              where,
            }: {
              where: {
                type: 'income' | 'outcome';
                name?: string | { in: string[] };
                parentId?: number | null;
              };
            }) => {
              const found = categories.find((category) => {
                if (category.type !== where.type) return false;

                const nameFilter = where.name;
                if (
                  typeof nameFilter === 'string' &&
                  category.name !== nameFilter
                ) {
                  return false;
                }

                if (
                  typeof nameFilter === 'object' &&
                  nameFilter !== null &&
                  !nameFilter.in.includes(category.name)
                ) {
                  return false;
                }

                if (
                  where.parentId !== undefined &&
                  category.parentId !== where.parentId
                ) {
                  return false;
                }

                return true;
              });

              return Promise.resolve(found ? { id: found.id } : null);
            },
          ),
          create: jest.fn(
            ({
              data,
            }: {
              data: {
                name: string;
                type: 'income' | 'outcome';
                parentId: number | null;
              };
            }) => {
              const duplicate = categories.find(
                (category) =>
                  category.name === data.name &&
                  category.type === data.type &&
                  category.parentId === data.parentId,
              );

              if (duplicate) {
                throw new Error('Unique constraint failed');
              }

              const created = {
                id: categories.length + 1000,
                ...data,
              };
              categories.push(created);
              return Promise.resolve({ id: created.id });
            },
          ),
        },
        cashLog: {
          create: jest.fn(({ data }: { data: Omit<CashLog, 'id'> }) => {
            const created: CashLog = {
              id: cashLogs.length + 1,
              ...data,
            };
            cashLogs.push(created);
            return Promise.resolve(created);
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

describe('Wallet Transfer API', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should transfer without fee', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 1,
        toWalletId: 2,
        amount: 300000,
        date: '2026-03-14',
        transferNote: 'Pindah dana',
        enableFee: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);

    const sender = wallets.find((wallet) => wallet.id === 1);
    const receiver = wallets.find((wallet) => wallet.id === 2);

    expect(sender?.balance).toBe(700000);
    expect(receiver?.balance).toBe(500000);
    expect(cashLogs).toHaveLength(2);
    expect(cashLogs.every((item) => item.excludeFromReport)).toBe(true);
  });

  it('should transfer with fee paid by sender', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 1,
        toWalletId: 2,
        amount: 100000,
        date: '2026-03-14',
        enableFee: true,
        feeAmount: 10000,
        feePayer: 'sender',
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);

    const sender = wallets.find((wallet) => wallet.id === 1);
    const receiver = wallets.find((wallet) => wallet.id === 2);

    expect(sender?.balance).toBe(890000);
    expect(receiver?.balance).toBe(300000);
    expect(cashLogs).toHaveLength(3);

    const feeLog = cashLogs.find((log) =>
      log.description.includes('Transfer fee'),
    );
    expect(feeLog?.walletName).toBe('BCA');
  });

  it('should transfer with fee paid by receiver', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 1,
        toWalletId: 2,
        amount: 100000,
        date: '2026-03-14',
        enableFee: true,
        feeAmount: 15000,
        feePayer: 'receiver',
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);

    const sender = wallets.find((wallet) => wallet.id === 1);
    const receiver = wallets.find((wallet) => wallet.id === 2);

    expect(sender?.balance).toBe(900000);
    expect(receiver?.balance).toBe(285000);

    const feeLog = cashLogs.find((log) =>
      log.description.includes('Transfer fee'),
    );
    expect(feeLog?.walletName).toBe('Cash');
  });

  it('should reject transfer to same wallet', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 1,
        toWalletId: 1,
        amount: 50000,
        date: '2026-03-14',
        enableFee: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should reject transfer if sender balance is insufficient', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 3,
        toWalletId: 2,
        amount: 60000,
        date: '2026-03-14',
        enableFee: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should reject transfer if receiver fee is greater than or equal to amount', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 1,
        toWalletId: 2,
        amount: 10000,
        date: '2026-03-14',
        enableFee: true,
        feeAmount: 10000,
        feePayer: 'receiver',
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should prefer Wallet Transfer categories when both name variants exist', async () => {
    categories.push(
      {
        id: 103,
        name: 'Transfer In',
        type: 'income',
        parentId: null,
      },
      {
        id: 104,
        name: 'Transfer Out',
        type: 'outcome',
        parentId: null,
      },
    );

    const req = {
      json: async () => ({
        fromWalletId: 1,
        toWalletId: 2,
        amount: 50000,
        date: '2026-03-14',
        enableFee: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);

    const transferOutLog = cashLogs.find((log) => log.amount < 0);
    const transferInLog = cashLogs.find((log) => log.amount > 0);

    expect(transferOutLog?.categoryId).toBe(102);
    expect(transferInLog?.categoryId).toBe(101);
  });
});
