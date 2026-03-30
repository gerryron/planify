export type SessionUser = {
  id: string;
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

async function readError(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? fallback;
}

export const authService = {
  async login(payload: LoginPayload) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(await readError(res, 'Failed to login'));
    }

    return (await res.json()) as { success: true; user: SessionUser };
  },

  async register(payload: RegisterPayload) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(await readError(res, 'Failed to register'));
    }

    return (await res.json()) as { success: true; message: string };
  },

  async me() {
    const res = await fetch('/api/auth/me', { method: 'GET' });
    if (!res.ok) {
      throw new Error(await readError(res, 'Not logged in'));
    }

    return (await res.json()) as { user: SessionUser };
  },

  async logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
  },
};
