import type { NextRequest } from 'next/server';
import { POST } from './route';

type Wallet = {
  id: number;
  name: string;
  balance: number;
  walletKind: 'basic' | 'goal' | 'credit_card';
  goalAmount: number | null;
  goalStartMonth: string | null;
  goalDueMonth: string | null;
  creditLimit: number | null;
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
    {
      id: 1,
      name: 'BCA',
      balance: 1000000,
      walletKind: 'basic',
      goalAmount: null,
      goalStartMonth: null,
      goalDueMonth: null,
      creditLimit: null,
    },
    {
      id: 2,
      name: 'Cash',
      balance: 200000,
      walletKind: 'basic',
      goalAmount: null,
      goalStartMonth: null,
      goalDueMonth: null,
      creditLimit: null,
    },
    {
      id: 3,
      name: 'GoPay',
      balance: 50000,
      walletKind: 'basic',
      goalAmount: null,
      goalStartMonth: null,
      goalDueMonth: null,
      creditLimit: null,
    },
    {
      id: 4,
      name: 'Emergency Fund',
      balance: 300000,
      walletKind: 'goal',
      goalAmount: 1000000,
      goalStartMonth: '2026-03',
      goalDueMonth: '2026-12',
      creditLimit: null,
    },
    {
      id: 5,
      name: 'Vacation Fund',
      balance: 1000000,
      walletKind: 'goal',
      goalAmount: 1000000,
      goalStartMonth: '2026-03',
      goalDueMonth: '2026-08',
      creditLimit: null,
    },
    {
      id: 6,
      name: 'BCA Card',
      balance: 300000,
      walletKind: 'credit_card',
      goalAmount: null,
      goalStartMonth: null,
      goalDueMonth: null,
      creditLimit: 500000,
    },
    {
      id: 7,
      name: 'Mandiri Card',
      balance: 100000,
      walletKind: 'credit_card',
      goalAmount: null,
      goalStartMonth: null,
      goalDueMonth: null,
      creditLimit: 300000,
    },
    {
      id: 8,
      name: 'Broken Card',
      balance: 20000,
      walletKind: 'credit_card',
      goalAmount: null,
      goalStartMonth: null,
      goalDueMonth: null,
      creditLimit: null,
    },
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
          findFirst: jest.fn(
            ({ where }: { where: { id?: number; userId?: string } }) => {
              if (where.id) {
                return Promise.resolve(
                  wallets.find((wallet) => wallet.id === where.id) ?? null,
                );
              }
              return Promise.resolve(null);
            },
          ),
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
                OR?: Array<{ systemDefault?: boolean; userId?: string }>;
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
                userId?: string;
                systemDefault?: boolean;
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
    expect(feeLog?.amount).toBe(10000);
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
    expect(feeLog?.amount).toBe(15000);
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

  it('should block withdrawal from goal wallet before target is achieved', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 4,
        toWalletId: 2,
        amount: 100000,
        date: '2026-03-14',
        enableFee: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(
      'Goal Wallet is locked. Withdrawal is available after target is achieved',
    );
  });

  it('should allow withdrawal from goal wallet after target is achieved', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 5,
        toWalletId: 2,
        amount: 100000,
        date: '2026-03-14',
        enableFee: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);

    const achievedGoalWallet = wallets.find((wallet) => wallet.id === 5);
    const destinationWallet = wallets.find((wallet) => wallet.id === 2);
    expect(achievedGoalWallet?.balance).toBe(900000);
    expect(destinationWallet?.balance).toBe(300000);
  });

  it('should reject transfer into achieved goal wallet', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 1,
        toWalletId: 5,
        amount: 100000,
        date: '2026-03-14',
        enableFee: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe(
      'Goal Wallet already achieved its target and cannot receive transfer',
    );
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

    const transferOutLog = cashLogs.find((log) => log.categoryId === 102);
    const transferInLog = cashLogs.find((log) => log.categoryId === 101);

    expect(transferOutLog?.categoryId).toBe(102);
    expect(transferOutLog?.amount).toBe(50000);
    expect(transferInLog?.categoryId).toBe(101);
    expect(transferInLog?.amount).toBe(50000);
  });

  it('should allow transfer from credit card and increase outstanding', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 6,
        toWalletId: 2,
        amount: 100000,
        date: '2026-03-14',
        enableFee: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);

    const card = wallets.find((wallet) => wallet.id === 6);
    const cash = wallets.find((wallet) => wallet.id === 2);

    expect(card?.balance).toBe(400000);
    expect(cash?.balance).toBe(300000);
  });

  it('should allow transfer to credit card and reduce outstanding', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 1,
        toWalletId: 6,
        amount: 120000,
        date: '2026-03-15',
        enableFee: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);

    const source = wallets.find((wallet) => wallet.id === 1);
    const card = wallets.find((wallet) => wallet.id === 6);

    expect(source?.balance).toBe(880000);
    expect(card?.balance).toBe(180000);
  });

  it('should reject transfer from credit card when it exceeds credit limit', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 6,
        toWalletId: 2,
        amount: 250000,
        date: '2026-03-14',
        enableFee: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe(
      'Credit card outstanding cannot exceed credit limit',
    );
  });

  it('should reject transfer when source credit card has no credit limit', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 8,
        toWalletId: 2,
        amount: 5000,
        date: '2026-03-14',
        enableFee: false,
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('Credit card wallet is missing credit limit');
  });

  it('should apply receiver fee correctly when destination is credit card', async () => {
    const req = {
      json: async () => ({
        fromWalletId: 1,
        toWalletId: 6,
        amount: 100000,
        date: '2026-03-16',
        enableFee: true,
        feeAmount: 5000,
        feePayer: 'receiver',
      }),
    } as unknown as NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);

    const source = wallets.find((wallet) => wallet.id === 1);
    const destinationCard = wallets.find((wallet) => wallet.id === 6);

    expect(source?.balance).toBe(900000);
    expect(destinationCard?.balance).toBe(205000);
  });
});
