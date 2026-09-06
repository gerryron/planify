import { NextRequest } from 'next/server';
import { POST } from './route';
import { AUTH_COOKIE_NAME } from '@/core/auth/session';

type MockUser = {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: 'user' | 'superadmin';
  status: 'pending' | 'active';
};

const users: MockUser[] = [
  {
    id: 1,
    email: 'active@example.com',
    name: 'Active User',
    passwordHash: 'hashed-password',
    role: 'user',
    status: 'active',
  },
  {
    id: 2,
    email: 'pending@example.com',
    name: 'Pending User',
    passwordHash: 'hashed-password',
    role: 'user',
    status: 'pending',
  },
];

jest.mock('@/generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(({ where }: { where: { email: string } }) =>
        Promise.resolve(users.find((user) => user.email === where.email) ?? null),
      ),
    },
  })),
}));

jest.mock('@/core/auth/password', () => ({
  verifyPassword: jest.fn(
    (password: string, hash: string) =>
      Promise.resolve(password === 'correct-password' && hash === 'hashed-password'),
  ),
  hashPassword: jest.fn(),
}));

function jsonRequest(body: unknown) {
  return {
    method: 'POST',
    json: async () => body,
    headers: { get: () => null },
  } as unknown as NextRequest;
}

describe('POST /api/auth/login', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-with-at-least-16-chars';
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it('should reject when email or password is missing', async () => {
    const res = await POST(jsonRequest({ email: '', password: '' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Email and password are required');
  });

  it('should reject an invalid email format', async () => {
    const res = await POST(
      jsonRequest({ email: 'not-an-email', password: 'correct-password' }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Email format is invalid');
  });

  it('should reject an unknown email', async () => {
    const res = await POST(
      jsonRequest({ email: 'unknown@example.com', password: 'correct-password' }),
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Invalid email or password');
  });

  it('should reject a wrong password', async () => {
    const res = await POST(
      jsonRequest({ email: 'active@example.com', password: 'wrong-password' }),
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Invalid email or password');
  });

  it('should reject a pending account', async () => {
    const res = await POST(
      jsonRequest({ email: 'pending@example.com', password: 'correct-password' }),
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe(
      'Your account is pending superadmin approval. Please try again later.',
    );
  });

  it('should login successfully and set the auth cookie', async () => {
    const res = await POST(
      jsonRequest({ email: 'ACTIVE@example.com', password: 'correct-password' }),
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user).toEqual({
      id: 1,
      name: 'Active User',
      email: 'active@example.com',
      role: 'user',
      status: 'active',
    });

    const cookie = res.cookies.get(AUTH_COOKIE_NAME);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
  });
});
