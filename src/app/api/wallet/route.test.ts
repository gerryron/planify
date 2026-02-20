import type { NextRequest } from 'next/server';
import { POST, GET, PATCH, DELETE } from './route';
import { WalletInput } from '@/features/wallet/types/wallet';

type Wallet = WalletInput & { id: string; sortOrder: number };

jest.mock('@/generated/prisma/client', () => {
  let wallets: Wallet[] = [];
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      wallet: {
        count: jest.fn(() => Promise.resolve(wallets.length)),
        upsert: jest.fn(
          ({
            where,
            create,
          }: {
            where: { name: string };
            create: WalletInput;
          }) => {
            const existing = wallets.find(
              (wallet) => wallet.name === where.name,
            );
            if (existing) return Promise.resolve(existing);

            const wallet: Wallet = {
              ...create,
              id: `${wallets.length + 1}`,
              sortOrder: wallets.length,
            };
            wallets.push(wallet);
            return Promise.resolve(wallet);
          },
        ),
        create: jest.fn(
          ({ data }: { data: WalletInput & { sortOrder?: number } }) => {
            const wallet: Wallet = {
              ...data,
              id: `${wallets.length + 1}`,
              sortOrder: data.sortOrder ?? wallets.length,
            };
            wallets.push(wallet);
            return Promise.resolve(wallet);
          },
        ),
        findFirst: jest.fn(
          ({
            orderBy,
          }: {
            orderBy: { sortOrder: 'desc' | 'asc' };
            select?: { sortOrder: boolean };
          }) => {
            if (wallets.length === 0) return Promise.resolve(null);
            const sorted = [...wallets].sort((a, b) =>
              orderBy.sortOrder === 'desc'
                ? b.sortOrder - a.sortOrder
                : a.sortOrder - b.sortOrder,
            );
            return Promise.resolve({ sortOrder: sorted[0].sortOrder });
          },
        ),
        findMany: jest.fn(() =>
          Promise.resolve(
            [...wallets].sort(
              (a, b) =>
                a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
            ),
          ),
        ),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<WalletInput> & { sortOrder?: number };
          }) => {
            const idx = wallets.findIndex((w) => w.id === where.id);
            if (idx === -1) throw new Error('Not found');
            wallets[idx] = { ...wallets[idx], ...data };
            return Promise.resolve(wallets[idx]);
          },
        ),
        delete: jest.fn(({ where }: { where: { id: string } }) => {
          wallets = wallets.filter((w) => w.id !== where.id);
          return Promise.resolve();
        }),
      },
      $transaction: jest.fn((actions: Promise<unknown>[]) =>
        Promise.all(actions),
      ),
    })),
  };
});

describe('Wallet API', () => {
  let id1: string;
  let id2: string;

  it('should create default Cash wallet on first GET when empty', async () => {
    const res = await GET();
    const data: Wallet[] = await res.json();

    expect(res.status).toBe(200);
    expect(data.some((wallet) => wallet.name === 'Cash')).toBe(true);
  });

  it('should create wallet data', async () => {
    const req1 = {
      method: 'POST',
      json: async () =>
        ({
          name: 'BCA',
          balance: 1200000,
          includeFromTotal: true,
        }) as WalletInput,
    } as unknown as NextRequest;

    const req2 = {
      method: 'POST',
      json: async () =>
        ({
          name: 'OVO',
          balance: 500000,
          includeFromTotal: false,
        }) as WalletInput,
    } as unknown as NextRequest;

    const res1 = await POST(req1);
    const res2 = await POST(req2);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    const data1 = await res1.json();
    const data2 = await res2.json();

    expect(data1.name).toBe('BCA');
    expect(data2.name).toBe('OVO');
    expect(data1.includeFromTotal).toBe(true);
    expect(data2.includeFromTotal).toBe(false);
    expect(data1.sortOrder).toBeLessThan(data2.sortOrder);
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
    expect(data.length).toBeGreaterThanOrEqual(3);
  });

  it('should update wallet data', async () => {
    const req = {
      method: 'PATCH',
      json: async () => ({
        id: id1,
        name: 'BCA Updated',
        balance: 1500000,
        includeFromTotal: false,
      }),
    } as unknown as NextRequest;

    const res = await PATCH(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(id1);
    expect(data.name).toBe('BCA Updated');
    expect(data.balance).toBe(1500000);
    expect(data.includeFromTotal).toBe(false);
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
