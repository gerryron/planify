import { WalletsInput } from '@/features/wallets/types/wallets';

export type Wallets = WalletsInput & { id: string };

const API_URL = '/api/wallets';

export const walletsService = {
  async getAll(): Promise<Wallets[]> {
    const res = await fetch(API_URL, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch wallets');
    return res.json();
  },
  async create(data: WalletsInput): Promise<Wallets> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create wallet');
    return res.json();
  },
  async update(id: string, data: Partial<WalletsInput>): Promise<Wallets> {
    const res = await fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) throw new Error('Failed to update wallet');
    return res.json();
  },
  async reorder(orderedIds: string[]): Promise<{ success: boolean }> {
    const res = await fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) throw new Error('Failed to reorder wallets');
    return res.json();
  },
  async remove(id: string): Promise<{ success: boolean }> {
    const res = await fetch(API_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error('Failed to delete wallet');
    return res.json();
  },
};
