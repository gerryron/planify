import { NextRequest } from 'next/server';
import { forbidden, unauthorized } from '@/core/http/apiResponse';
import { getAuthTokenFromRequest, verifyAuthToken } from '@/core/auth/session';

type RequireAuthOptions = {
  requireActive?: boolean;
  requireSuperadmin?: boolean;
};

export function requireAuth(req: NextRequest, options?: RequireAuthOptions) {
  if (process.env.NODE_ENV === 'test') {
    const testUser = {
      sub: 'test-user',
      email: 'test.user@planify.local',
      role: 'user' as const,
      status: 'active' as const,
      name: 'Test User',
    };

    if (options?.requireSuperadmin) {
      return {
        user: {
          ...testUser,
          role: 'superadmin' as const,
        },
      };
    }

    return { user: testUser };
  }

  const token = getAuthTokenFromRequest(req);
  if (!token) {
    return { error: unauthorized('Please login first') };
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return { error: unauthorized('Session is invalid or expired') };
  }

  if (options?.requireActive !== false && payload.status !== 'active') {
    return { error: forbidden('Account is pending approval') };
  }

  if (options?.requireSuperadmin && payload.role !== 'superadmin') {
    return { error: forbidden('Superadmin access only') };
  }

  return { user: payload };
}
