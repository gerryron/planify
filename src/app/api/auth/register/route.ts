import { NextRequest } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { badRequest, ok, serverError } from '@/core/http/apiResponse';
import { hashPassword } from '@/core/auth/password';

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
      return badRequest('name, email, and password are required');
    }

    if (!isValidEmail(email)) {
      return badRequest('email format is invalid');
    }

    if (password.length < 8) {
      return badRequest('password must be at least 8 characters');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return badRequest('Email is already registered');
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
    console.error('POST /api/auth/register error:', error);
    return serverError('Failed to register user');
  }
}
