'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import WalletsList from '@/features/wallets/components/WalletsList';
import WalletsForm from '@/features/wallets/components/WalletsForm';
import WalletTransferForm from '@/features/wallets/components/WalletTransferForm';
import GoalTrackingModal from '@/features/wallets/components/GoalTrackingModal';
import { Wallets } from '@/features/wallets/services/walletsService';
import { computeGoalProgress } from '@/features/wallets/utils/goalProgress';
import { QUERY_KEYS } from '@/lib/queryClient';

export default function WalletsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Wallets | null>(null);
  const [transferring, setTransferring] = useState<Wallets | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [trackingGoal, setTrackingGoal] = useState<Wallets | null>(null);
  const canUsePortal = typeof document !== 'undefined';

  const handleEdit = (wallet: Wallets) => {
    setEditing(wallet);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleTransfer = (wallet: Wallets) => {
    setTransferring(wallet);
    setShowTransferForm(true);
  };

  const handleTrackGoal = (wallet: Wallets) => {
    setTrackingGoal(wallet);
  };

  const handleSuccess = () => {
    setEditing(null);
    setTransferring(null);
    setTrackingGoal(null);
    setShowForm(false);
    setShowTransferForm(false);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WALLETS });
    setRefreshKey((key) => key + 1);
  };

  const handleCancel = () => {
    setEditing(null);
    setTransferring(null);
    setTrackingGoal(null);
    setShowForm(false);
    setShowTransferForm(false);
  };

  const transferModalTitle =
    transferring?.walletKind === 'goal' &&
    computeGoalProgress({
      balance: transferring.balance,
      goalAmount: transferring.goalAmount,
      goalStartMonth: transferring.goalStartMonth,
      goalDueMonth: transferring.goalDueMonth,
    }).withdrawalReady
      ? 'Withdrawal'
      : 'Transfer Wallet';

  return (
    <div className='max-w-2xl mx-auto pt-0 pb-8 space-y-8'>
      <WalletsList
        key={refreshKey}
        onEdit={handleEdit}
        onTransfer={handleTransfer}
        onTrackGoal={handleTrackGoal}
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

              <WalletsForm
                key={editing ? editing.id : 'new'}
                initial={editing}
                onSuccess={handleSuccess}
              />
            </div>
          </div>,
          document.body,
        )}

      {canUsePortal &&
        showTransferForm &&
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

              <h2 className='text-lg font-semibold mb-4'>
                {transferModalTitle}
              </h2>
              <WalletTransferForm
                initialFromWalletId={transferring?.id}
                onSuccess={handleSuccess}
              />
            </div>
          </div>,
          document.body,
        )}

      {trackingGoal && (
        <GoalTrackingModal
          wallet={trackingGoal}
          onClose={() => setTrackingGoal(null)}
        />
      )}
    </div>
  );
}
