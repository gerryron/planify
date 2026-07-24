import { NextRequest } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { ok } from '@/core/http/apiResponse';
import { requireAuth } from '@/core/auth/requireAuth';
import { handleApiError } from '@/core/http/apiErrors';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, { requireSuperadmin: true });
  if (auth.error) return auth.error;

  try {
    const users = await prisma.user.findMany({
      where: { role: 'user' },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    });

    return ok({
      pending: users.filter((user) => user.status === 'pending'),
      active: users.filter((user) => user.status === 'active'),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
