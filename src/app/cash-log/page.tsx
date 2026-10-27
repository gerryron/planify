'use client';

import { Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import CashLogList from '../../features/cash-log/components/CashLogList';
import CashLogForm from '../../features/cash-log/components/CashLogForm';
import { CashLog } from '../../features/cash-log/services/cashLogService';
import { walletsService } from '@/features/wallets/services/walletsService';
import { useModalKeyboard } from '@/shared/utils/useModalKeyboard';
import { QUERY_KEYS } from '../../lib/queryClient';
import { Card } from '@/components/ui/card';

function CashLogPageContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawWalletId = searchParams.get('walletId');
  const initialWalletId = rawWalletId ? Number(rawWalletId) : null;
  const shouldAutoOpenForm = searchParams.get('new') === '1';
  const [editing, setEditing] = useState<CashLog | null>(null);
  const [defaultWalletName, setDefaultWalletName] = useState<string | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const canUsePortal = typeof document !== 'undefined';

  useEffect(() => {
    if (!shouldAutoOpenForm) return;

    let cancelled = false;

    const openForm = async () => {
      if (initialWalletId !== null && Number.isFinite(initialWalletId)) {
        try {
          const wallets = await walletsService.getAll();
          if (cancelled) return;
          const matchedWallet = wallets.find((wallet) => wallet.id === initialWalletId);
          setDefaultWalletName(matchedWallet?.name ?? null);
        } catch {
          setDefaultWalletName(null);
        }
      }

      if (!cancelled) {
        setShowForm(true);
      }
    };

    openForm();

    return () => {
      cancelled = true;
    };
  }, [initialWalletId, shouldAutoOpenForm]);

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

  const clearAutoOpenFlag = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('new');

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const handleSuccess = () => {
    setEditing(null);
    setDefaultWalletName(null);
    setShowForm(false);
    clearAutoOpenFlag();
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CASH_LOGS() });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WALLETS });
    setRefreshKey((key) => key + 1);
  };

  const handleCancel = () => {
    setEditing(null);
    setDefaultWalletName(null);
    setShowForm(false);
    clearAutoOpenFlag();
  };

  const { containerRef: modalRef } = useModalKeyboard({
    onClose: handleCancel,
    enabled: showForm,
  });

  return (
    <div className='max-w-3xl mx-auto pt-0 pb-8 space-y-8'>
      <Card className='app-card rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6 overflow-visible'>
        <CashLogList
          initialWalletId={initialWalletId}
          refreshToken={refreshKey}
          onEdit={handleEdit}
          onAdd={handleAdd}
        />
      </Card>

      {canUsePortal &&
        showForm &&
        createPortal(
          <div
            className='fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-4'
            onClick={handleCancel}
          >
            <div
              ref={modalRef}
              className='bg-card rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-[calc(100vw-1.5rem)] sm:min-w-[320px] sm:max-w-md relative'
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

export default function CashLogPage() {
  return (
    <Suspense fallback={null}>
      <CashLogPageContent />
    </Suspense>
  );
}
