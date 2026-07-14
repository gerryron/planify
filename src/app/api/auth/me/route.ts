import { NextRequest } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { ok } from '@/core/http/apiResponse';
import { getAuthTokenFromRequest, verifyAuthToken } from '@/core/auth/session';
import { AuthError, handleApiError } from '@/core/http/apiErrors';

export async function GET(req: NextRequest) {
  try {
    const token = getAuthTokenFromRequest(req);
    if (!token) {
      throw new AuthError('UNAUTHORIZED', 'Not logged in');
    }

    const payload = verifyAuthToken(token);
    if (!payload) {
      throw new AuthError('UNAUTHORIZED', 'Session is invalid or expired');
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
      throw new AuthError('UNAUTHORIZED', 'User not found');
    }

    return ok({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
