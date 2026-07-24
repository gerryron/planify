import { NextRequest } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { ok } from '@/core/http/apiResponse';
import { verifyPassword } from '@/core/auth/password';
import { setAuthCookie, signAuthToken } from '@/core/auth/session';
import {
  ValidationError,
  AuthError,
  handleApiError,
} from '@/core/http/apiErrors';

type LoginPayload = {
  email?: string;
  password?: string;
};

import { isValidEmail } from '@/shared/utils/validation';

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as LoginPayload;
    const email = payload.email?.trim().toLowerCase() ?? '';
    const password = payload.password ?? '';

    if (!email || !password) {
      throw new ValidationError('AUTH_INVALID_CREDENTIALS', 'Email and password are required');
    }

    if (!isValidEmail(email)) {
      throw new ValidationError('AUTH_INVALID_CREDENTIALS', 'Email format is invalid');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AuthError('AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new AuthError('AUTH_INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (user.status !== 'active') {
      throw new AuthError('AUTH_NOT_APPROVED', 'Your account is pending superadmin approval. Please try again later.');
    }

    const token = signAuthToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    });

    const response = ok({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    setAuthCookie(req, response, token);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
