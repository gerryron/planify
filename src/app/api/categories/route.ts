import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/core/db/prisma';
import { badRequest, ok, serverError } from '@/core/http/apiResponse';
import { CategoryType } from '@/features/categories/types/category';

export async function GET(): Promise<NextResponse> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return ok(categories);
  } catch (error) {
    console.error('GET /api/categories error:', error);
    const message = error instanceof Error ? error.message : undefined;
    return serverError(message);
  }
}

async function validateParent(
  parentId: number,
  type: CategoryType,
  currentCategoryId?: number,
): Promise<{ valid: true } | { valid: false; message: string }> {
  const parent = await prisma.category.findUnique({
    where: { id: parentId },
    select: { id: true, type: true, parentId: true },
  });

  if (!parent) {
    return { valid: false, message: 'Parent category not found' };
  }

  if (parent.type !== type) {
    return {
      valid: false,
      message: 'Parent category type must match category type',
    };
  }

  if (parent.parentId !== null) {
    return {
      valid: false,
      message: 'Subcategory cannot have subcategory (max 1 level)',
    };
  }

  if (currentCategoryId && parent.id === currentCategoryId) {
    return { valid: false, message: 'Category cannot be its own parent' };
  }

  return { valid: true };
}

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const {
      name,
      type,
      parentId,
    }: Partial<{ name: string; type: CategoryType; parentId: number | null }> =
      await req.json();

    if (!name?.trim() || !type) {
      return badRequest('Name and type are required');
    }

    if (type !== 'income' && type !== 'outcome') {
      return badRequest('Type must be income or outcome');
    }

    const cleanParentId =
      parentId === null || parentId === undefined ? null : toId(parentId);
    if (parentId !== null && parentId !== undefined && !cleanParentId) {
      return badRequest('Parent category not found');
    }
    if (cleanParentId) {
      const validation = await validateParent(cleanParentId, type);
      if (!validation.valid) return badRequest(validation.message);
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        type,
        parentId: cleanParentId,
      },
    });

    return ok(category, 201);
  } catch {
    return badRequest('Failed to create category');
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
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
      return badRequest('ID is required');
    }

    const existing = await prisma.category.findUnique({
      where: { id: numericId },
      select: { id: true, type: true, parentId: true },
    });

    if (!existing) {
      return badRequest('Category not found');
    }

    const nextType = type ?? existing.type;
    if (type && type !== existing.type && existing.parentId === null) {
      const childCount = await prisma.category.count({
        where: { parentId: numericId },
      });
      if (childCount > 0) {
        return badRequest(
          'Parent category with subcategories cannot change type',
        );
      }
    }

    if (nextType !== 'income' && nextType !== 'outcome') {
      return badRequest('Type must be income or outcome');
    }

    const nextParentId =
      parentId === undefined
        ? undefined
        : parentId === null
          ? null
          : toId(parentId);

    if (parentId !== undefined && parentId !== null && !nextParentId) {
      return badRequest('Parent category not found');
    }

    if (nextParentId) {
      const validation = await validateParent(
        nextParentId,
        nextType,
        numericId,
      );
      if (!validation.valid) return badRequest(validation.message);
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
  } catch {
    return badRequest('Failed to update category');
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const raw = (await req.json()) as { id?: number | string };
    const id = toId(raw.id);

    if (!id) {
      return badRequest('ID is required');
    }

    const childCount = await prisma.category.count({
      where: { parentId: id },
    });

    if (childCount > 0) {
      return badRequest(
        'Cannot delete parent category that still has subcategories',
      );
    }

    await prisma.category.delete({ where: { id } });

    return ok({ success: true });
  } catch {
    return badRequest('Failed to delete category');
  }
}
