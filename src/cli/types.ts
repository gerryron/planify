export type CliSessionUser = {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'superadmin';
  status: 'pending' | 'active';
};

export type StoredCliSession = {
  version: 1;
  token: string;
  user: CliSessionUser;
  savedAt: string;
};
