import { NextRequest } from 'next/server';
import { POST } from './route';

type MockCashLog = { id: number; date: string; walletName: string; userId: number };
type MockBudget = { id: number; month: string; userId: number };
type MockWallet = { id: number; name: string; userId: number };

let cashLogs: MockCashLog[] = [];
let budgets: MockBudget[] = [];
let wallets: MockWallet[] = [];
let userCategories: Array<{
  id: number;
  userId: number | null;
  systemDefault: boolean;
  type: string;
  name: string;
  parent: { name: string } | null;
}> = [];

const cashLogDeleteCalls: Array<Record<string, unknown>> = [];
const budgetDeleteCalls: Array<Record<string, unknown>> = [];
const createdWallets: Array<Record<string, unknown>> = [];

jest.mock('@/generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => {
    const client = {
      cashLog: {
        deleteMany: jest.fn((args: { where?: Record<string, unknown> }) => {
          cashLogDeleteCalls.push(args);
          const before = cashLogs.length;
          cashLogs = cashLogs.filter((log) => {
            const where = args.where ?? {};
            if (where.userId !== undefined && log.userId !== where.userId) {
              return true;
            }
            if (where.walletName) {
              const names = (where.walletName as { in: string[] }).in;
              if (!names.includes(log.walletName)) return true;
            }
            if (where.OR) {
              const matches = (where.OR as Array<{ date: { startsWith: string } }>).some(
                (condition) => log.date.startsWith(condition.date.startsWith),
              );
              if (!matches) return true;
            }
            return false;
          });
          return Promise.resolve({ count: before - cashLogs.length });
        }),
      },
      monthlyBudget: {
        deleteMany: jest.fn((args: { where?: Record<string, unknown> }) => {
          budgetDeleteCalls.push(args);
          const before = budgets.length;
          budgets = budgets.filter((budget) => {
            const where = args.where ?? {};
            if (where.userId !== undefined && budget.userId !== where.userId) {
              return true;
            }
            if (where.OR) {
              const matches = (where.OR as Array<{ month: { startsWith: string } }>).some(
                (condition) => budget.month.startsWith(condition.month.startsWith),
              );
              if (!matches) return true;
            }
            return false;
          });
          return Promise.resolve({ count: before - budgets.length });
        }),
      },
      wallet: {
        findMany: jest.fn(
          ({ where }: { where: { userId: number } } = { where: { userId: 1 } }) =>
            Promise.resolve(wallets.filter((w) => w.userId === where.userId)),
        ),
        deleteMany: jest.fn(
          ({ where }: { where: { userId: number } } = { where: { userId: 1 } }) => {
            const before = wallets.length;
            wallets = wallets.filter((w) => w.userId !== where.userId);
            return Promise.resolve({ count: before - wallets.length });
          },
        ),
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          createdWallets.push(data);
          return Promise.resolve(data);
        }),
      },
      category: {
        findMany: jest.fn(() => Promise.resolve(userCategories)),
        deleteMany: jest.fn(
          ({ where }: { where: { id: { in: number[] } } }) => {
            const ids = where.id.in;
            const before = userCategories.length;
            userCategories = userCategories.filter((c) => !ids.includes(c.id));
            return Promise.resolve({ count: before - userCategories.length });
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
}));

function jsonRequest(body: unknown) {
  return {
    method: 'POST',
    json: async () => body,
  } as unknown as NextRequest;
}

describe('POST /api/settings/purge', () => {
  beforeEach(() => {
    cashLogs = [
      { id: 1, date: '2026-01-15', walletName: 'Cash', userId: 1 },
      { id: 2, date: '2026-02-15', walletName: 'BCA', userId: 1 },
      { id: 3, date: '2025-12-15', walletName: 'Cash', userId: 2 },
    ];
    budgets = [
      { id: 1, month: '2026-01', userId: 1 },
      { id: 2, month: '2026-02', userId: 1 },
    ];
    wallets = [
      { id: 1, name: 'Cash', userId: 1 },
      { id: 2, name: 'BCA', userId: 1 },
    ];
    userCategories = [
      {
        id: 1,
        userId: 1,
        systemDefault: false,
        type: 'income',
        name: 'Custom Income',
        parent: null,
      },
      {
        id: 2,
        userId: 1,
        systemDefault: false,
        type: 'income',
        name: 'Salary',
        parent: null,
      },
      {
        id: 3,
        userId: null,
        systemDefault: true,
        type: 'outcome',
        name: 'Food',
        parent: null,
      },
      {
        id: 4,
        userId: 1,
        systemDefault: false,
        type: 'outcome',
        name: 'Dining Out',
        parent: { name: 'Food' },
      },
      {
        id: 5,
        userId: 1,
        systemDefault: false,
        type: 'outcome',
        name: 'Custom Child',
        parent: { name: 'Food' },
      },
    ];
    cashLogDeleteCalls.length = 0;
    budgetDeleteCalls.length = 0;
    createdWallets.length = 0;
  });

  it('should reject when no deletion action is selected', async () => {
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('No deletion action selected');
  });

  it('should reject cashLog months scope without valid months', async () => {
    const res = await POST(
      jsonRequest({ cashLog: { scope: 'months', months: [] } }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      'cashLog.months must contain at least one valid month',
    );
  });

  it('should reject cashLog months scope with only invalid month formats', async () => {
    const res = await POST(
      jsonRequest({
        cashLog: { scope: 'months', months: ['bad', '2026/01'] },
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      'cashLog.months must contain at least one valid month',
    );
  });

  it('should reject monthlyBudget months scope without valid months', async () => {
    const res = await POST(
      jsonRequest({ monthlyBudget: { scope: 'months', months: [] } }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      'monthlyBudget.months must contain at least one valid month',
    );
  });

  it('should delete all user cash logs for scope all', async () => {
    const res = await POST(
      jsonRequest({ cashLog: { scope: 'all' } }),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.summary.cashLogDeleted).toBe(2);
    expect(cashLogs).toHaveLength(1);
    expect(cashLogs[0].userId).toBe(2);
  });

  it('should delete cash logs matching the given months only', async () => {
    const res = await POST(
      jsonRequest({
        cashLog: { scope: 'months', months: ['2026-01', 'invalid'] },
      }),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.summary.cashLogDeleted).toBe(1);
    expect(cashLogs.map((log) => log.id)).toEqual([2, 3]);

    const call = cashLogDeleteCalls[0].where as {
      userId: number;
      OR: Array<{ date: { startsWith: string } }>;
    };
    expect(call.userId).toBe(1);
    expect(call.OR).toEqual([{ date: { startsWith: '2026-01' } }]);
  });

  it('should delete all user budgets for scope all', async () => {
    const res = await POST(jsonRequest({ monthlyBudget: { scope: 'all' } }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.summary.monthlyBudgetDeleted).toBe(2);
    expect(budgets).toHaveLength(0);
  });

  it('should delete budgets matching the given months only', async () => {
    const res = await POST(
      jsonRequest({ monthlyBudget: { scope: 'months', months: ['2026-02'] } }),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.summary.monthlyBudgetDeleted).toBe(1);
    expect(budgets.map((budget) => budget.id)).toEqual([1]);

    const call = budgetDeleteCalls[0].where as {
      userId: number;
      OR: Array<{ month: { startsWith: string } }>;
    };
    expect(call.OR).toEqual([{ month: { startsWith: '2026-02' } }]);
  });

  it('should delete wallets, their cash logs, and recreate a Cash wallet', async () => {
    const res = await POST(jsonRequest({ deleteWallets: true }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.summary.walletDeleted).toBe(2);
    expect(data.summary.cashLogDeletedByWallet).toBe(2);
    expect(wallets).toHaveLength(0);

    expect(createdWallets).toHaveLength(1);
    expect(createdWallets[0]).toMatchObject({
      userId: 1,
      name: 'Cash',
      balance: 0,
      excludeFromTotal: false,
      sortOrder: 0,
    });
  });

  it('should only delete non-seed user categories', async () => {
    const res = await POST(jsonRequest({ deleteUserCategories: true }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.summary.userCategoryDeleted).toBe(2);
    const remainingIds = userCategories.map((category) => category.id);
    expect(remainingIds).toEqual([2, 3, 4]);
  });

  it('should return a combined summary for multiple actions', async () => {
    const res = await POST(
      jsonRequest({
        cashLog: { scope: 'all' },
        monthlyBudget: { scope: 'all' },
        deleteWallets: true,
        deleteUserCategories: true,
      }),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    // Cash logs are deleted by scope 'all' before deleteWallets runs,
    // so no wallet-name logs remain for cashLogDeletedByWallet.
    expect(data.summary).toEqual({
      cashLogDeleted: 2,
      cashLogDeletedByWallet: 0,
      monthlyBudgetDeleted: 2,
      walletDeleted: 2,
      userCategoryDeleted: 2,
    });
  });

  it('should treat an unknown scope as none', async () => {
    const res = await POST(
      jsonRequest({ cashLog: { scope: 'unknown' } }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('No deletion action selected');
  });
});
