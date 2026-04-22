import { beforeEach, describe, expect, it, jest } from '@jest/globals';

type MockWalletRow = {
  id: number;
  name: string;
  balance: number;
  excludeFromTotal: boolean;
  walletKind: 'basic' | 'goal' | 'credit_card';
  goalAmount: number | null;
  goalDueMonth: string | null;
  creditLimit: number | null;
};

const findManyMock =
  jest.fn<(...args: unknown[]) => Promise<MockWalletRow[]>>();

jest.mock('@/core/db/prisma', () => ({
  prisma: {
    wallet: {
      findMany: findManyMock,
    },
  },
}));

import { listWalletsForUser } from './walletsCliService';

describe('walletsCliService', () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it('loads wallets for the current user and computes the tracked total', async () => {
    findManyMock.mockResolvedValueOnce([
      {
        id: 2,
        name: 'Cash',
        balance: 500_000,
        excludeFromTotal: false,
        walletKind: 'basic',
        goalAmount: null,
        goalDueMonth: null,
        creditLimit: null,
      },
      {
        id: 3,
        name: 'Travel Goal',
        balance: 900_000,
        excludeFromTotal: true,
        walletKind: 'goal',
        goalAmount: 2_000_000,
        goalDueMonth: '2026-12',
        creditLimit: null,
      },
      {
        id: 4,
        name: 'Main Bank',
        balance: 1_250_000,
        excludeFromTotal: false,
        walletKind: 'basic',
        goalAmount: null,
        goalDueMonth: null,
        creditLimit: null,
      },
    ]);

    const result = await listWalletsForUser(44);

    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: 44 },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        balance: true,
        excludeFromTotal: true,
        walletKind: true,
        goalAmount: true,
        goalDueMonth: true,
        creditLimit: true,
      },
    });
    expect(result).toEqual({
      wallets: [
        {
          id: 2,
          name: 'Cash',
          balance: 500_000,
          excludeFromTotal: false,
          walletKind: 'basic',
          goalAmount: null,
          goalDueMonth: null,
          creditLimit: null,
        },
        {
          id: 3,
          name: 'Travel Goal',
          balance: 900_000,
          excludeFromTotal: true,
          walletKind: 'goal',
          goalAmount: 2_000_000,
          goalDueMonth: '2026-12',
          creditLimit: null,
        },
        {
          id: 4,
          name: 'Main Bank',
          balance: 1_250_000,
          excludeFromTotal: false,
          walletKind: 'basic',
          goalAmount: null,
          goalDueMonth: null,
          creditLimit: null,
        },
      ],
      trackedTotalBalance: 1_750_000,
      trackedWalletCount: 2,
      excludedWalletCount: 1,
    });
  });
});
