import { apiClient } from '@/core/http/apiClient';

export type DeleteScope = 'none' | 'months' | 'all';

export type PurgePayload = {
  cashLog: {
    scope: DeleteScope;
    months: string[];
  };
  monthlyBudget: {
    scope: DeleteScope;
    months: string[];
  };
  deleteWallets: boolean;
  deleteUserCategories: boolean;
};

export type PurgeResponse = {
  success: true;
  summary: {
    cashLogDeleted: number;
    cashLogDeletedByWallet: number;
    monthlyBudgetDeleted: number;
    walletDeleted: number;
    userCategoryDeleted: number;
  };
};

export const settingsService = {
  async purgeData(payload: PurgePayload): Promise<PurgeResponse> {
    return apiClient.post('/api/settings/purge', payload);
  },
};
