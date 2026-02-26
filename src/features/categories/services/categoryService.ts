import { Category, CategoryInput } from '@/features/categories/types/category';

const API_URL = '/api/categories';

export const categoryService = {
  async getAll(): Promise<Category[]> {
    const res = await fetch(API_URL, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },
  async create(data: CategoryInput): Promise<Category> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create category');
    return res.json();
  },
  async update(id: string, data: Partial<CategoryInput>): Promise<Category> {
    const res = await fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) throw new Error('Failed to update category');
    return res.json();
  },
  async remove(id: string): Promise<{ success: boolean }> {
    const res = await fetch(API_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error('Failed to delete category');
    return res.json();
  },
};
