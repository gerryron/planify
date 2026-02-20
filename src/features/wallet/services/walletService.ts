import { WalletInput } from '@/features/wallet/types/wallet';

export type Wallet = WalletInput & { id: string };

const API_URL = '/api/wallet';

export const walletService = {
  async getAll(): Promise<Wallet[]> {
    const res = await fetch(API_URL, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch wallets');
    return res.json();
  },
  async create(data: WalletInput): Promise<Wallet> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create wallet');
    return res.json();
  },
  async update(id: string, data: Partial<WalletInput>): Promise<Wallet> {
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
