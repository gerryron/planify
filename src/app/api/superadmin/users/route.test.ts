import { NextRequest } from 'next/server';
import { GET } from './route';

type MockUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
};

const allUsers: MockUser[] = [
  {
    id: 3,
    name: 'Admin',
    email: 'admin@example.com',
    role: 'superadmin',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Active User',
    email: 'active@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 1,
    name: 'Pending User',
    email: 'pending@example.com',
    role: 'user',
    status: 'pending',
    createdAt: '2026-01-03T00:00:00Z',
  },
];

jest.mock('@/generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findMany: jest.fn(
        ({ where }: { where: { role: string } } = { where: { role: 'user' } }) =>
          Promise.resolve(
            allUsers.filter((user) => user.role === where.role),
          ),
      ),
    },
  })),
}));

describe('GET /api/superadmin/users', () => {
  it('should split non-superadmin users into pending and active', async () => {
    const res = await GET(new NextRequest('http://localhost/api/superadmin/users'));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.pending.map((user: MockUser) => user.id)).toEqual([1]);
    expect(data.active.map((user: MockUser) => user.id)).toEqual([2]);
    expect(data.pending[0].email).toBe('pending@example.com');
    expect(data.active[0].email).toBe('active@example.com');
  });
});
