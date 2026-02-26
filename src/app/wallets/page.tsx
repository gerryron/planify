'use client';

import { useState } from 'react';
import WalletsList from '@/features/wallets/components/WalletsList';
import WalletsForm from '@/features/wallets/components/WalletsForm';
import { Wallets } from '@/features/wallets/services/walletsService';

export default function WalletsPage() {
  const [editing, setEditing] = useState<Wallets | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const handleEdit = (wallet: Wallets) => {
    setEditing(wallet);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setEditing(null);
    setShowForm(false);
    setRefreshKey((key) => key + 1);
  };

  const handleCancel = () => {
    setEditing(null);
    setShowForm(false);
  };

  return (
    <div className='max-w-2xl mx-auto py-8 space-y-8'>
      <WalletsList key={refreshKey} onEdit={handleEdit} onAdd={handleAdd} />

      {showForm && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
          onClick={handleCancel}
        >
          <div
            className='bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 min-w-[320px] max-w-md w-full relative'
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className='absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-white text-2xl font-bold'
              onClick={handleCancel}
              aria-label='Tutup'
            >
              ×
            </button>

            <WalletsForm
              key={editing ? editing.id : 'new'}
              initial={editing}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
}
