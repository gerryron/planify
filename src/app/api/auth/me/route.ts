import { NextRequest } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { ok, unauthorized } from '@/core/http/apiResponse';
import { getAuthTokenFromRequest, verifyAuthToken } from '@/core/auth/session';

export async function GET(req: NextRequest) {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    return unauthorized('Not logged in');
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return unauthorized('Session is invalid or expired');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    return unauthorized('User not found');
  }

  return ok({ user });
}
