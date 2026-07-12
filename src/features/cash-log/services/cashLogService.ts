import { apiClient } from '@/core/http/apiClient';
import {
  CashLogInput,
  CashLogResponse,
} from '@/features/cash-log/types/cashLog';

export type CashLog = CashLogResponse;

export const cashLogService = {
  async getAll(month?: string): Promise<CashLog[]> {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
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
