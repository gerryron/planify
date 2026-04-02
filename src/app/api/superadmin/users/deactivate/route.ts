import { NextRequest } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { badRequest, ok, serverError } from '@/core/http/apiResponse';
import { requireAuth } from '@/core/auth/requireAuth';

type DeactivatePayload = {
  userId?: number | string;
};

function toId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

export async function PATCH(req: NextRequest) {
  const auth = requireAuth(req, { requireSuperadmin: true });
  if (auth.error) return auth.error;

  try {
    const payload = (await req.json()) as DeactivatePayload;
    const userId = toId(payload.userId);

    if (!userId) {
      return badRequest('userId is required');
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });

    if (!target || target.role !== 'user') {
      return badRequest('User not found');
    }

    if (target.status !== 'active') {
      return ok({ success: true, message: 'User already inactive' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'pending' },
    });

    return ok({ success: true });
  } catch (error) {
    console.error('PATCH /api/superadmin/users/deactivate error:', error);
    return serverError('Failed to deactivate user');
  }
}
