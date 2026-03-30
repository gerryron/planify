export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'active';
  createdAt: string;
};

async function readError(res: Response, fallback: string) {
  const body = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? fallback;
}

export const superadminService = {
  async getUsers() {
    const res = await fetch('/api/superadmin/users', { method: 'GET' });
    if (!res.ok) {
      throw new Error(await readError(res, 'Failed to fetch users'));
    }

    return (await res.json()) as {
      pending: ManagedUser[];
      active: ManagedUser[];
    };
  },

  async approve(userId: string) {
    const res = await fetch('/api/superadmin/users/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      throw new Error(await readError(res, 'Failed to approve user'));
    }

    return (await res.json()) as { success: true };
  },

  async deactivate(userId: string) {
    const res = await fetch('/api/superadmin/users/deactivate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
      throw new Error(await readError(res, 'Failed to deactivate user'));
    }

    return (await res.json()) as { success: true };
  },
};
