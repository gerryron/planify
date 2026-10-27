import { apiClient } from '@/core/http/apiClient';
import {
  CashLogInput,
  CashLogResponse,
} from '@/features/cash-log/types/cashLog';

export type CashLog = CashLogResponse;

export const cashLogService = {
  async getAll(month?: string, description?: string): Promise<CashLog[]> {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    const normalizedDescription = description?.trim();
    if (normalizedDescription) {
      params.set('description', normalizedDescription);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.get(`/api/cash-log${query}`);
  },

  async create(data: CashLogInput): Promise<CashLog> {
    return apiClient.post('/api/cash-log', data);
  },

  async update(id: number, data: Partial<CashLogInput>): Promise<CashLog> {
    return apiClient.patch('/api/cash-log', { id, ...data });
  },

  async remove(id: number): Promise<{ success: boolean }> {
    return apiClient.delete('/api/cash-log', { id });
  },
};
