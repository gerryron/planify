'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import CashLogList from '../../features/cash-log/components/CashLogList';
import CashLogForm from '../../features/cash-log/components/CashLogForm';
import { CashLog } from '../../features/cash-log/services/cashLogService';

export default function CashLogPage() {
  const searchParams = useSearchParams();
  const rawWalletId = searchParams.get('walletId');
  const initialWalletId = rawWalletId ? Number(rawWalletId) : null;
  const [editing, setEditing] = useState<CashLog | null>(null);
  const [defaultWalletName, setDefaultWalletName] = useState<string | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const canUsePortal = typeof document !== 'undefined';

  const handleEdit = (log: CashLog) => {
    setEditing(log);
    setDefaultWalletName(null);
    setShowForm(true);
  };

  const handleAdd = (walletName?: string) => {
    setEditing(null);
    setDefaultWalletName(walletName ?? null);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setEditing(null);
    setShowForm(false);
    setRefreshKey((key) => key + 1);
  };

  const handleCancel = () => {
    setEditing(null);
    setDefaultWalletName(null);
    setShowForm(false);
  };

  return (
    <div className='max-w-2xl mx-auto pt-0 pb-8 space-y-8'>
      <CashLogList
        initialWalletId={initialWalletId}
        refreshToken={refreshKey}
        onEdit={handleEdit}
        onAdd={handleAdd}
      />

      {canUsePortal &&
        showForm &&
        createPortal(
          <div
            className='fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-4'
            onClick={handleCancel}
          >
            <div
              className='bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-[calc(100vw-1.5rem)] sm:min-w-[320px] sm:max-w-md relative'
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className='absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:text-slate-300 dark:hover:text-white text-2xl font-bold'
                onClick={handleCancel}
                aria-label='Close dialog'
              >
                ×
              </button>

              <CashLogForm
                key={editing ? editing.id : 'new'}
                initial={editing}
                defaultWalletName={defaultWalletName}
                onSuccess={handleSuccess}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
