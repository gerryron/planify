'use client';

import { useEffect, useState } from 'react';
import {
  superadminService,
  ManagedUser,
} from '@/features/superadmin/services/superadminService';

function UserTable({
  title,
  users,
  actionLabel,
  actionButtonClass,
  processingId,
  onAction,
}: {
  title: string;
  users: ManagedUser[];
  actionLabel?: string;
  actionButtonClass?: string;
  processingId: string | null;
  onAction?: (id: string) => Promise<void>;
}) {
  const showAction = Boolean(actionLabel && onAction);

  return (
    <section className='flex min-h-72 flex-col rounded-lg bg-white p-4 shadow-sm md:h-104 dark:bg-slate-800'>
      <h2 className='text-lg font-semibold text-slate-900 dark:text-slate-100'>
        {title}
      </h2>
      <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
        Total users: {users.length}
      </p>

      {users.length === 0 ? (
        <div className='mt-4 flex flex-1 items-center justify-center text-center text-slate-500 dark:text-slate-400'>
          No data.
        </div>
      ) : (
        <div className='mt-4 flex-1 overflow-y-auto'>
          <div className='space-y-3 md:hidden'>
            {users.map((user) => (
              <article
                key={user.id}
                className='rounded-md border border-slate-200 p-3 dark:border-slate-700'
              >
                <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                  {user.name}
                </p>
                <p className='mt-1 break-all text-sm text-slate-600 dark:text-slate-300'>
                  {user.email}
                </p>
                <p className='mt-2 text-xs text-slate-500 dark:text-slate-400'>
                  Registered:{' '}
                  {new Date(user.createdAt).toLocaleDateString('en-US')}
                </p>

                {showAction && onAction && (
                  <button
                    type='button'
                    onClick={() => void onAction(user.id)}
                    disabled={processingId === user.id}
                    className={
                      (actionButtonClass ??
                        'rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white transition hover:bg-emerald-700') +
                      ' mt-3 w-full disabled:opacity-60'
                    }
                  >
                    {processingId === user.id ? 'Processing...' : actionLabel}
                  </button>
                )}
              </article>
            ))}
          </div>

          <div className='hidden overflow-x-auto md:block'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='text-left text-slate-600 dark:text-slate-300'>
                  <th className='px-2 py-2'>Name</th>
                  <th className='px-2 py-2'>Email</th>
                  <th className='px-2 py-2'>Registered At</th>
                  {showAction && <th className='px-2 py-2'>Action</th>}
                </tr>
              </thead>
              <tbody className='text-slate-800 dark:text-slate-100'>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className='border-t border-slate-100 dark:border-slate-700'
                  >
                    <td className='px-2 py-2'>{user.name}</td>
                    <td className='px-2 py-2'>{user.email}</td>
                    <td className='px-2 py-2'>
                      {new Date(user.createdAt).toLocaleDateString('en-US')}
                    </td>
                    {showAction && onAction && (
                      <td className='px-2 py-2'>
                        <button
                          type='button'
                          onClick={() => void onAction(user.id)}
                          disabled={processingId === user.id}
                          className={
                            (actionButtonClass ??
                              'rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white transition hover:bg-emerald-700') +
                            ' disabled:opacity-60'
                          }
                        >
                          {processingId === user.id
                            ? 'Processing...'
                            : actionLabel}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

export default function SuperadminPage() {
  const [pendingUsers, setPendingUsers] = useState<ManagedUser[]>([]);
  const [activeUsers, setActiveUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setError(null);
    const data = await superadminService.getUsers();
    setPendingUsers(data.pending);
    setActiveUsers(data.active);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await fetchUsers();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const onApprove = async (userId: string) => {
    try {
      setApprovingId(userId);
      await superadminService.approve(userId);
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve user');
    } finally {
      setApprovingId(null);
    }
  };

  const onDeactivate = async (userId: string) => {
    try {
      setDeactivatingId(userId);
      await superadminService.deactivate(userId);
      await fetchUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to deactivate user',
      );
    } finally {
      setDeactivatingId(null);
    }
  };

  if (loading) {
    return (
      <div className='text-slate-600 dark:text-slate-300'>
        Loading admin panel...
      </div>
    );
  }

  return (
    <div className='space-y-8 pb-8'>
      <header className='px-1 py-2'>
        <h1 className='text-2xl font-semibold text-slate-900 dark:text-slate-100'>
          Admin Panel
        </h1>
        <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>
          Manage approval for newly registered users and deactivate active
          accounts.
        </p>
      </header>

      {error && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'>
          {error}
        </div>
      )}

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <UserTable
          title='Users Pending Approval'
          users={pendingUsers}
          actionLabel='Approve'
          actionButtonClass='rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white transition hover:bg-emerald-700'
          processingId={approvingId}
          onAction={onApprove}
        />

        <UserTable
          title='Active Users'
          users={activeUsers}
          actionLabel='Deactivate'
          actionButtonClass='rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white transition hover:bg-rose-700'
          processingId={deactivatingId}
          onAction={onDeactivate}
        />
      </div>
    </div>
  );
}
