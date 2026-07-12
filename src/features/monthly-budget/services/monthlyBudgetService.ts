import { apiClient } from '@/core/http/apiClient';
import {
  BudgetInput,
  BudgetResponse,
} from '@/features/monthly-budget/types/budget';

export type Budget = BudgetResponse;

export const monthlyBudgetService = {
  async getAll(month?: string): Promise<Budget[]> {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    return apiClient.get(`/api/monthly-budget${query}`);
  },

  async create(data: BudgetInput): Promise<Budget> {
    return apiClient.post('/api/monthly-budget', data);
  },

  async update(id: number, data: Partial<BudgetInput>): Promise<Budget> {
    return apiClient.patch('/api/monthly-budget', { id, ...data });
  },

  async reorder(orderedIds: number[]): Promise<{ success: boolean }> {
    return apiClient.patch('/api/monthly-budget', { orderedIds });
  },

  async remove(id: number): Promise<{ success: boolean }> {
    return apiClient.delete('/api/monthly-budget', { id });
  },

  async toggleDone(id: number, isDone: boolean): Promise<Budget> {
    return apiClient.patch('/api/monthly-budget', { id, isDone });
  },
};
