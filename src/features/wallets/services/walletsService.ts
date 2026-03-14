import { WalletsInput } from '@/features/wallets/types/wallets';

export type Wallets = WalletsInput & { id: number };

export type WalletTransferInput = {
  fromWalletId: number;
  toWalletId: number;
  amount: number;
  date: string;
  transferNote?: string;
  enableFee: boolean;
  feeAmount?: number;
  feePayer?: 'sender' | 'receiver';
  feeNote?: string;
};

export type WalletTransferResponse = {
  success: boolean;
  fromWallet: {
    id: number;
    name: string;
    balance: number;
  };
  toWallet: {
    id: number;
    name: string;
    balance: number;
  };
};

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
  async update(id: number, data: Partial<WalletsInput>): Promise<Wallets> {
    const res = await fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) throw new Error('Failed to update wallet');
    return res.json();
  },
  async reorder(orderedIds: number[]): Promise<{ success: boolean }> {
    const res = await fetch(API_URL, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) throw new Error('Failed to reorder wallets');
    return res.json();
  },
  async remove(id: number): Promise<{ success: boolean }> {
    const res = await fetch(API_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error('Failed to delete wallet');
    return res.json();
  },
  async transfer(data: WalletTransferInput): Promise<WalletTransferResponse> {
    const res = await fetch(`${API_URL}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to transfer wallet balance');
    return res.json();
  },
};
