import {
  CashLogInput,
  CashLogResponse,
} from '@/features/cash-log/types/cashLog';

export type CashLog = CashLogResponse;

const API_URL = '/api/cash-log';

export const cashLogService = {
  async getAll(month?: string): Promise<CashLog[]> {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    const res = await fetch(`${API_URL}${query}`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch cash logs');
    return res.json();
  },

  async create(data: CashLogInput): Promise<CashLog> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create cash log');
    return res.json();
  },

  async update(id: string, data: Partial<CashLogInput>): Promise<CashLog> {
    const res = await fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) throw new Error('Failed to update cash log');
    return res.json();
  },

  async remove(id: string): Promise<{ success: boolean }> {
    const res = await fetch(API_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error('Failed to delete cash log');
    return res.json();
  },
};
