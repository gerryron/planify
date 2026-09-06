import { NextRequest } from 'next/server';
import { GET } from './route';

type MockUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
};

let storedUser: MockUser | null = null;

jest.mock('@/generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(() => Promise.resolve(storedUser)),
    },
  })),
}));

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    storedUser = null;
  });

  it('should return 401 when the user no longer exists', async () => {
    const res = await GET(new NextRequest('http://localhost/api/auth/me'));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('User not found');
  });

  it('should return the authenticated user profile', async () => {
    storedUser = {
      id: 1,
      name: 'Test User',
      email: 'test.user@planify.local',
      role: 'user',
      status: 'active',
    };

    const res = await GET(new NextRequest('http://localhost/api/auth/me'));
    expect(res.status).toBe(200);
    expect((await res.json()).user).toEqual(storedUser);
  });
});
