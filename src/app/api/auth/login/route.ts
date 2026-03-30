import { NextRequest } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { badRequest, ok, unauthorized } from '@/core/http/apiResponse';
import { verifyPassword } from '@/core/auth/password';
import { setAuthCookie, signAuthToken } from '@/core/auth/session';

type LoginPayload = {
  email?: string;
  password?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as LoginPayload;
    const email = payload.email?.trim().toLowerCase() ?? '';
    const password = payload.password ?? '';

    if (!email || !password) {
      return badRequest('email and password are required');
    }

    if (!isValidEmail(email)) {
      return badRequest('email format is invalid');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return unauthorized('Invalid email or password');
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return unauthorized('Invalid email or password');
    }

    if (user.status !== 'active') {
      return unauthorized(
        'Your account is pending superadmin approval. Please try again later.',
      );
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
  } catch {
    return unauthorized('Failed to login');
  }
}
