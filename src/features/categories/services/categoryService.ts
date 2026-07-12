import { apiClient } from '@/core/http/apiClient';
import { Category, CategoryInput } from '@/features/categories/types/category';

export const categoryService = {
  async getAll(): Promise<Category[]> {
    return apiClient.get('/api/categories');
  },

  async create(data: CategoryInput): Promise<Category> {
    return apiClient.post('/api/categories', data);
  },

  async update(id: number, data: Partial<CategoryInput>): Promise<Category> {
    return apiClient.patch('/api/categories', { id, ...data });
  },

  async remove(id: number): Promise<{ success: boolean }> {
    return apiClient.delete('/api/categories', { id });
  },
};
