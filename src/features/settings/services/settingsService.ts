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

const API_URL = '/api/settings/purge';

export const settingsService = {
  async purgeData(payload: PurgePayload): Promise<PurgeResponse> {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(body?.error || 'Failed to purge data');
    }

    return res.json();
  },
};
