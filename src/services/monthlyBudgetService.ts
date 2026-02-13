import { BudgetInput } from '@/types/budget';

export type Budget = BudgetInput & { id: string };

const API_URL = '/api/monthly-budget';

export const monthlyBudgetService = {
  async getAll(): Promise<Budget[]> {
    const res = await fetch(API_URL, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch budgets');
    return res.json();
  },
  async create(data: BudgetInput): Promise<Budget> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create budget');
    return res.json();
  },
  async update(id: string, data: Partial<BudgetInput>): Promise<Budget> {
    const res = await fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) throw new Error('Failed to update budget');
    return res.json();
  },
  async remove(id: string): Promise<{ success: boolean }> {
    const res = await fetch(API_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error('Failed to delete budget');
    return res.json();
  },
};
