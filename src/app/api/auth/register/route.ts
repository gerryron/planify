import { NextRequest } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { ok } from '@/core/http/apiResponse';
import { hashPassword } from '@/core/auth/password';
import {
  ValidationError,
  AuthError,
  handleApiError,
} from '@/core/http/apiErrors';

type RegisterPayload = {
  name?: string;
  email?: string;
  password?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as RegisterPayload;
    const name = payload.name?.trim() ?? '';
    const email = payload.email?.trim().toLowerCase() ?? '';
    const password = payload.password ?? '';

    if (!name || !email || !password) {
      throw new ValidationError('AUTH_INVALID_CREDENTIALS', 'Name, email, and password are required');
    }

    if (!isValidEmail(email)) {
      throw new ValidationError('AUTH_INVALID_CREDENTIALS', 'Email format is invalid');
    }

    if (password.length < 8) {
      throw new ValidationError('AUTH_INVALID_CREDENTIALS', 'Password must be at least 8 characters');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AuthError('AUTH_EMAIL_EXISTS', 'Email is already registered');
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'user',
          status: 'pending',
        },
      });

      await tx.wallet.create({
        data: {
          userId: user.id,
          name: 'Cash',
          balance: 0,
          excludeFromTotal: false,
          walletKind: 'basic',
          sortOrder: 0,
        },
      });
    });

    return ok(
      {
        success: true,
        message:
          'Registration successful. Your account is pending superadmin approval.',
      },
      201,
    );
  } catch (error) {
    return handleApiError(error);
  }
}
