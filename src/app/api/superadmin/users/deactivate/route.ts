import { NextRequest } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { badRequest, ok } from '@/core/http/apiResponse';
import { requireAuth } from '@/core/auth/requireAuth';
import { handleApiError } from '@/core/http/apiErrors';
import { toId } from '@/shared/utils/routeHelpers';

type DeactivatePayload = {
  userId?: number | string;
};

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
    return handleApiError(error);
  }
}
