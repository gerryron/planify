import { NextRequest } from 'next/server';
import { GET, POST, PATCH, DELETE } from './route';

type MockCategory = {
  id: number;
  name: string;
  type: 'income' | 'outcome';
  parentId: number | null;
  userId: number | null;
  systemDefault: boolean;
};

let categories: MockCategory[] = [];

jest.mock('@/generated/prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    category: {
      findMany: jest.fn(
        ({
          where,
          orderBy,
        }: {
          where?: { OR?: Array<Record<string, unknown>> };
          orderBy?: unknown;
        } = {}) => {
          let filtered = categories;
          if (where?.OR) {
            filtered = filtered.filter((category) =>
              where.OR!.some(
                (condition) =>
                  (condition.systemDefault === true &&
                    category.systemDefault === true) ||
                  (typeof condition.userId === 'number' &&
                    category.userId === condition.userId),
              ),
            );
          }
          const sorted = [...filtered];
          if (orderBy) {
            sorted.sort((a, b) =>
              a.type === b.type
                ? a.name.localeCompare(b.name)
                : a.type.localeCompare(b.type),
            );
          }
          return Promise.resolve(sorted);
        },
      ),
      findFirst: jest.fn(
        ({
          where,
          select,
        }: {
          where: {
            id?: number;
            userId?: number;
            OR?: Array<Record<string, unknown>>;
          };
          select?: Record<string, boolean>;
        }) => {
          let found: MockCategory | undefined;
          if (where.id !== undefined) {
            found = categories.find((category) => category.id === where.id);
            if (found) {
              if (where.OR) {
                const visible = where.OR.some((condition) =>
                  condition.systemDefault === true
                    ? found!.systemDefault
                    : typeof condition.userId === 'number' &&
                      found!.userId === condition.userId,
                );
                if (!visible) found = undefined;
              } else if (
                where.userId !== undefined &&
                found.userId !== where.userId
              ) {
                found = undefined;
              }
            }
          }
          if (!found) return Promise.resolve(null);
          if (!select) return Promise.resolve(found);
          const picked: Partial<MockCategory> = {};
          if (select.id) picked.id = found.id;
          if (select.type) picked.type = found.type;
          if (select.parentId) picked.parentId = found.parentId;
          if (select.systemDefault) picked.systemDefault = found.systemDefault;
          return Promise.resolve(picked);
        },
      ),
      count: jest.fn(
        ({ where }: { where: { parentId: number; userId?: number } }) =>
          Promise.resolve(
            categories.filter(
              (category) =>
                category.parentId === where.parentId &&
                (where.userId === undefined ||
                  category.userId === where.userId),
            ).length,
          ),
      ),
      create: jest.fn(({ data }: { data: Omit<MockCategory, 'id'> }) => {
        const category: MockCategory = { id: categories.length + 1, ...data };
        categories.push(category);
        return Promise.resolve(category);
      }),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: number };
          data: Partial<MockCategory>;
        }) => {
          const index = categories.findIndex((c) => c.id === where.id);
          if (index === -1) return Promise.reject(new Error('Not found'));
          categories[index] = { ...categories[index], ...data };
          return Promise.resolve(categories[index]);
        },
      ),
      delete: jest.fn(({ where }: { where: { id: number } }) => {
        categories = categories.filter((c) => c.id !== where.id);
        return Promise.resolve();
      }),
    },
  })),
}));

function jsonRequest(body: unknown) {
  return {
    method: 'POST',
    json: async () => body,
  } as unknown as NextRequest;
}

describe('Categories API', () => {
  beforeEach(() => {
    categories = [
      {
        id: 1,
        name: 'Food',
        type: 'outcome',
        parentId: null,
        userId: null,
        systemDefault: true,
      },
      {
        id: 2,
        name: 'Salary',
        type: 'income',
        parentId: null,
        userId: null,
        systemDefault: true,
      },
      {
        id: 3,
        name: 'Groceries',
        type: 'outcome',
        parentId: 1,
        userId: null,
        systemDefault: true,
      },
      {
        id: 4,
        name: 'Hobi',
        type: 'outcome',
        parentId: null,
        userId: 1,
        systemDefault: false,
      },
    ];
  });

  it('should list system and own categories sorted by type then name (GET)', async () => {
    const res = await GET(new NextRequest('http://localhost/api/categories'));
    expect(res.status).toBe(200);

    const data = (await res.json()) as MockCategory[];
    expect(data.map((category) => category.id)).toEqual([2, 1, 3, 4]);
  });

  it('should create a top-level category (POST)', async () => {
    const res = await POST(
      jsonRequest({ name: '  Investasi ', type: 'outcome' }),
    );
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.name).toBe('Investasi');
    expect(data.type).toBe('outcome');
    expect(data.parentId).toBeNull();
    expect(data.userId).toBe(1);
    expect(data.systemDefault).toBe(false);
  });

  it('should create a subcategory under a visible parent (POST)', async () => {
    const res = await POST(
      jsonRequest({ name: 'Kopi', type: 'outcome', parentId: 1 }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.parentId).toBe(1);
  });

  it('should reject POST without name or type', async () => {
    const res = await POST(jsonRequest({ name: '' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Name and type are required');
  });

  it('should reject POST with an invalid type', async () => {
    const res = await POST(jsonRequest({ name: 'X', type: 'other' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Type must be income or outcome');
  });

  it('should reject POST with an unknown parent', async () => {
    const res = await POST(
      jsonRequest({ name: 'X', type: 'outcome', parentId: 999 }),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Parent category tidak ditemukan');
  });

  it('should reject POST when the parent type does not match', async () => {
    const res = await POST(
      jsonRequest({ name: 'X', type: 'income', parentId: 1 }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      'Parent category type must match category type',
    );
  });

  it('should reject POST when the parent is itself a subcategory', async () => {
    const res = await POST(
      jsonRequest({ name: 'X', type: 'outcome', parentId: 3 }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      'Subcategory cannot have subcategory (max 1 level)',
    );
  });

  it('should update a category name (PATCH)', async () => {
    const res = await PATCH(jsonRequest({ id: 4, name: 'Hobi Baru' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('Hobi Baru');
    expect(data.id).toBe(4);
  });

  it('should reject PATCH without an id', async () => {
    const res = await PATCH(jsonRequest({ name: 'X' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('ID is required');
  });

  it('should reject PATCH for an unknown category', async () => {
    const res = await PATCH(jsonRequest({ id: 999, name: 'X' }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Category tidak ditemukan');
  });

  it('should reject PATCH on a system category that the user does not own', async () => {
    const res = await PATCH(jsonRequest({ id: 1, name: 'X' }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Category tidak ditemukan');
  });

  it('should reject PATCH on a user-owned default category', async () => {
    categories.push({
      id: 5,
      name: 'Salary',
      type: 'income',
      parentId: null,
      userId: 1,
      systemDefault: true,
    });
    const res = await PATCH(jsonRequest({ id: 5, name: 'X' }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe(
      'Default category cannot be modified',
    );
  });

  it('should reject PATCH changing type of a parent with children', async () => {
    categories.push({
      id: 6,
      name: 'Ortu',
      type: 'outcome',
      parentId: null,
      userId: 1,
      systemDefault: false,
    });
    categories.push({
      id: 7,
      name: 'Anak',
      type: 'outcome',
      parentId: 6,
      userId: 1,
      systemDefault: false,
    });

    const res = await PATCH(jsonRequest({ id: 6, type: 'income' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      'Parent category with subcategories cannot change type',
    );
  });

  it('should reject PATCH when a category becomes its own parent', async () => {
    const res = await PATCH(jsonRequest({ id: 4, parentId: 4 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Category cannot be its own parent');
  });

  it('should delete a user category (DELETE)', async () => {
    const res = await DELETE(jsonRequest({ id: 4 }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(categories.some((category) => category.id === 4)).toBe(false);
  });

  it('should reject DELETE without an id', async () => {
    const res = await DELETE(jsonRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('ID is required');
  });

  it('should reject DELETE for a system category the user does not own', async () => {
    const res = await DELETE(jsonRequest({ id: 1 }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Category tidak ditemukan');
  });

  it('should reject DELETE for a user-owned default category', async () => {
    categories.push({
      id: 5,
      name: 'Salary',
      type: 'income',
      parentId: null,
      userId: 1,
      systemDefault: true,
    });
    const res = await DELETE(jsonRequest({ id: 5 }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('Default category cannot be deleted');
  });

  it('should reject DELETE for a parent that still has children', async () => {
    categories.push({
      id: 6,
      name: 'Ortu',
      type: 'outcome',
      parentId: null,
      userId: 1,
      systemDefault: false,
    });
    categories.push({
      id: 7,
      name: 'Anak',
      type: 'outcome',
      parentId: 6,
      userId: 1,
      systemDefault: false,
    });
    const res = await DELETE(jsonRequest({ id: 6 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(
      'Cannot delete parent category that still has subcategories',
    );
  });
});
