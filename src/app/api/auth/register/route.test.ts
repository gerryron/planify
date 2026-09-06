import { NextRequest } from 'next/server';
import { POST } from './route';

type MockUser = {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  status: string;
};

const users: MockUser[] = [];
const createdWallets: Array<Record<string, unknown>> = [];

jest.mock('@/generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => {
    const client = {
      user: {
        findUnique: jest.fn(({ where }: { where: { email: string } }) =>
          Promise.resolve(users.find((user) => user.email === where.email) ?? null),
        ),
        create: jest.fn(({ data }: { data: Omit<MockUser, 'id'> }) => {
          const user: MockUser = { id: users.length + 1, ...data };
          users.push(user);
          return Promise.resolve(user);
        }),
      },
      wallet: {
        create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          createdWallets.push(data);
          return Promise.resolve(data);
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
}));

jest.mock('@/core/auth/password', () => ({
  hashPassword: jest.fn((password: string) => Promise.resolve(`hashed:${password}`)),
  verifyPassword: jest.fn(),
}));

function jsonRequest(body: unknown) {
  return {
    method: 'POST',
    json: async () => body,
  } as unknown as NextRequest;
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    users.length = 0;
    createdWallets.length = 0;
  });

  it('should reject when name, email, or password is missing', async () => {
    const res = await POST(jsonRequest({ email: 'x@example.com' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      'Name, email, and password are required',
    );
  });

  it('should reject an invalid email format', async () => {
    const res = await POST(
      jsonRequest({ name: 'User', email: 'invalid', password: 'password123' }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Email format is invalid');
  });

  it('should reject a short password', async () => {
    const res = await POST(
      jsonRequest({ name: 'User', email: 'user@example.com', password: 'short' }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Password must be at least 8 characters');
  });

  it('should reject an already registered email', async () => {
    users.push({
      id: 1,
      email: 'user@example.com',
      name: 'Existing',
      passwordHash: 'x',
      role: 'user',
      status: 'active',
    });

    const res = await POST(
      jsonRequest({
        name: 'New User',
        email: 'USER@example.com',
        password: 'password123',
      }),
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Email is already registered');
  });

  it('should register a pending user and create a Cash wallet', async () => {
    const res = await POST(
      jsonRequest({
        name: '  New User  ',
        email: 'NEW@example.com',
        password: 'password123',
      }),
    );
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('pending superadmin approval');

    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      name: 'New User',
      email: 'new@example.com',
      passwordHash: 'hashed:password123',
      role: 'user',
      status: 'pending',
    });

    expect(createdWallets).toHaveLength(1);
    expect(createdWallets[0]).toMatchObject({
      userId: users[0].id,
      name: 'Cash',
      balance: 0,
      excludeFromTotal: false,
      walletKind: 'basic',
      sortOrder: 0,
    });
  });
});
