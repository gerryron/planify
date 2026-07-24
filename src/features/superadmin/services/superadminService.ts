import { apiClient } from '@/core/http/apiClient';

export type ManagedUser = {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'active';
  createdAt: string;
};

export const superadminService = {
  async getUsers() {
    return apiClient.get<{
      pending: ManagedUser[];
      active: ManagedUser[];
    }>('/api/superadmin/users');
  },

  async approve(userId: number) {
    return apiClient.patch<{ success: true }>(
      '/api/superadmin/users/approve',
      { userId },
    );
  },

  async deactivate(userId: number) {
    return apiClient.patch<{ success: true }>(
      '/api/superadmin/users/deactivate',
      { userId },
    );
  },
};
