import { NextRequest } from 'next/server';
import { PATCH } from './route';

type MockUser = {
  id: number;
  role: string;
  status: string;
};

let users: MockUser[] = [];
let updateCalls: Array<{ where: { id: number }; data: { status: string } }> = [];

jest.mock('@/generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(({ where }: { where: { id: number } }) =>
        Promise.resolve(users.find((user) => user.id === where.id) ?? null),
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: number };
          data: { status: string };
        }) => {
          updateCalls.push({ where, data });
          const user = users.find((item) => item.id === where.id);
          if (user) user.status = data.status;
          return Promise.resolve(user);
        },
      ),
    },
  })),
}));

function jsonRequest(body: unknown) {
  return {
    method: 'PATCH',
    json: async () => body,
  } as unknown as NextRequest;
}

describe('PATCH /api/superadmin/users/approve', () => {
  beforeEach(() => {
    users = [
      { id: 1, role: 'user', status: 'pending' },
      { id: 2, role: 'user', status: 'active' },
      { id: 3, role: 'superadmin', status: 'active' },
    ];
    updateCalls = [];
  });

  it('should reject a missing userId', async () => {
    const res = await PATCH(jsonRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('userId is required');
  });

  it('should reject an unknown user', async () => {
    const res = await PATCH(jsonRequest({ userId: 999 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('User not found');
  });

  it('should reject a non-user target', async () => {
    const res = await PATCH(jsonRequest({ userId: 3 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('User not found');
  });

  it('should report an already active user without updating', async () => {
    const res = await PATCH(jsonRequest({ userId: 2 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('User already active');
    expect(updateCalls).toHaveLength(0);
  });

  it('should approve a pending user', async () => {
    const res = await PATCH(jsonRequest({ userId: 1 }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(updateCalls).toEqual([
      { where: { id: 1 }, data: { status: 'active' } },
    ]);
    expect(users[0].status).toBe('active');
  });

  it('should accept a string userId', async () => {
    const res = await PATCH(jsonRequest({ userId: '1' }));
    expect(res.status).toBe(200);
    expect(updateCalls).toEqual([
      { where: { id: 1 }, data: { status: 'active' } },
    ]);
  });
});
