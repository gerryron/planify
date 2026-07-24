import { NextRequest } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { ok } from '@/core/http/apiResponse';
import { requireAuth } from '@/core/auth/requireAuth';
import { AuthError, handleApiError } from '@/core/http/apiErrors';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new AuthError('UNAUTHORIZED', 'User not found');
    }

    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
