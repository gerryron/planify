import { apiClient } from '@/core/http/apiClient';

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'superadmin';
  status: 'pending' | 'active';
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export const authService = {
  async login(payload: LoginPayload) {
    return apiClient.post<{ success: true; user: SessionUser }>(
      '/api/auth/login',
      payload,
    );
  },

  async register(payload: RegisterPayload) {
    return apiClient.post<{ success: true; message: string }>(
      '/api/auth/register',
      payload,
    );
  },

  async me() {
    return apiClient.get<{ user: SessionUser }>('/api/auth/me');
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
  },
};
