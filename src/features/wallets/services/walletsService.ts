import { apiClient } from '@/core/http/apiClient';
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

export const walletsService = {
  async getAll(): Promise<Wallets[]> {
    return apiClient.get('/api/wallets');
  },

  async create(data: WalletsInput): Promise<Wallets> {
    return apiClient.post('/api/wallets', data);
  },

  async update(id: number, data: Partial<WalletsInput>): Promise<Wallets> {
    return apiClient.patch('/api/wallets', { id, ...data });
  },

  async reorder(orderedIds: number[]): Promise<{ success: boolean }> {
    return apiClient.patch('/api/wallets', { orderedIds });
  },

  async remove(id: number): Promise<{
    success: boolean;
    deletedCashLogCount?: number;
  }> {
    return apiClient.delete('/api/wallets', { id });
  },

  async transfer(data: WalletTransferInput): Promise<WalletTransferResponse> {
    return apiClient.post('/api/wallets/transfer', data);
  },
};
