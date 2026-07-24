import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { ok } from '@/core/http/apiResponse';
import { requireAuth } from '@/core/auth/requireAuth';
import { CategoryType } from '@/features/categories/types/category';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  handleApiError,
} from '@/core/http/apiErrors';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ systemDefault: true }, { userId: auth.user.sub }],
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return ok(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

async function validateParent(
  parentId: number,
  type: CategoryType,
  userId: number,
  currentCategoryId?: number,
): Promise<void> {
  const parent = await prisma.category.findFirst({
    where: {
      id: parentId,
      OR: [{ userId }, { systemDefault: true }],
    },
    select: { id: true, type: true, parentId: true },
  });

  if (!parent) {
    throw new NotFoundError('CATEGORY_NOT_FOUND', 'Parent category');
  }

  if (parent.type !== type) {
    throw new ValidationError('CATEGORY_VALIDATION', 'Parent category type must match category type');
  }

  if (parent.parentId !== null) {
    throw new ValidationError('CATEGORY_VALIDATION', 'Subcategory cannot have subcategory (max 1 level)');
  }

  if (currentCategoryId && parent.id === currentCategoryId) {
    throw new ValidationError('CATEGORY_VALIDATION', 'Category cannot be its own parent');
  }
}

import { toId } from '@/shared/utils/routeHelpers';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const {
      name,
      type,
      parentId,
    }: Partial<{ name: string; type: CategoryType; parentId: number | null }> =
      await req.json();

    if (!name?.trim() || !type) {
      throw new ValidationError('CATEGORY_VALIDATION', 'Name and type are required');
    }

    if (type !== 'income' && type !== 'outcome') {
      throw new ValidationError('CATEGORY_VALIDATION', 'Type must be income or outcome');
    }

    const cleanParentId =
      parentId === null || parentId === undefined ? null : toId(parentId);
    if (parentId !== null && parentId !== undefined && !cleanParentId) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', 'Parent category');
    }
    if (cleanParentId) {
      await validateParent(cleanParentId, type, auth.user.sub);
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        type,
        parentId: cleanParentId,
        userId: auth.user.sub,
        systemDefault: false,
      },
    });

    return ok(category, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const {
      id,
      name,
      type,
      parentId,
    }: Partial<{
      id: number | string;
      name: string;
      type: CategoryType;
      parentId: number | string | null;
    }> = await req.json();

    const numericId = toId(id);

    if (!numericId) {
      throw new ValidationError('CATEGORY_VALIDATION', 'ID is required');
    }

    const existing = await prisma.category.findFirst({
      where: { id: numericId, userId: auth.user.sub },
      select: { id: true, type: true, parentId: true, systemDefault: true },
    });

    if (!existing) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', 'Category');
    }

    if (existing.systemDefault) {
      throw new ForbiddenError('Default category cannot be modified');
    }

    const nextType = type ?? existing.type;
    if (type && type !== existing.type && existing.parentId === null) {
      const childCount = await prisma.category.count({
        where: { parentId: numericId, userId: auth.user.sub },
      });
      if (childCount > 0) {
        throw new ValidationError('CATEGORY_VALIDATION', 'Parent category with subcategories cannot change type');
      }
    }

    if (nextType !== 'income' && nextType !== 'outcome') {
      throw new ValidationError('CATEGORY_VALIDATION', 'Type must be income or outcome');
    }

    const nextParentId =
      parentId === undefined
        ? undefined
        : parentId === null
          ? null
          : toId(parentId);

    if (parentId !== undefined && parentId !== null && !nextParentId) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', 'Parent category');
    }

    if (nextParentId) {
      await validateParent(nextParentId, nextType, auth.user.sub, numericId);
    }

    const updateData: {
      name?: string;
      type?: CategoryType;
      parentId?: number | null;
    } = {};

    if (name !== undefined) updateData.name = name.trim();
    if (type !== undefined) updateData.type = type;
    if (nextParentId !== undefined) updateData.parentId = nextParentId;

    const category = await prisma.category.update({
      where: { id: numericId },
      data: updateData,
    });

    return ok(category);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const raw = (await req.json()) as { id?: number | string };
    const id = toId(raw.id);

    if (!id) {
      throw new ValidationError('CATEGORY_VALIDATION', 'ID is required');
    }

    const category = await prisma.category.findFirst({
      where: { id, userId: auth.user.sub },
      select: { id: true, systemDefault: true },
    });

    if (!category) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', 'Category');
    }

    if (category.systemDefault) {
      throw new ForbiddenError('Default category cannot be deleted');
    }

    const childCount = await prisma.category.count({
      where: { parentId: id, userId: auth.user.sub },
    });

    if (childCount > 0) {
      throw new ValidationError('CATEGORY_VALIDATION', 'Cannot delete parent category that still has subcategories');
    }

    await prisma.category.delete({ where: { id } });

    return ok({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
