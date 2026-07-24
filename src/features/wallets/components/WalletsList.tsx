'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LockOpen, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cashLogService } from '@/features/cash-log/services/cashLogService';
import { walletsService, type Wallets } from '@/features/wallets/services/walletsService';
import { DndContext, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableWalletItem from './SortableWalletItem';
import { useWalletDragDrop } from '../hooks/useWalletDragDrop';
import { Card, CardContent } from '@/components/ui/card';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

interface WalletsListProps {
  onEdit: (wallet: Wallets) => void;
  onTransfer: (wallet: Wallets) => void;
  onTrackGoal: (wallet: Wallets) => void;
  onAdd?: () => void;
}

export default function WalletsList({ onEdit, onTransfer, onTrackGoal, onAdd }: WalletsListProps) {
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallets[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNominal, setShowNominal] = useState(true);
  const confirm = useConfirm();

  const fetchWallets = async () => {
    setLoading(true);
    setError(null);
    try { setWallets(await walletsService.getAll()); } catch { setError('Failed to fetch wallets'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchWallets(); }, []);

  const { INCLUDE_ZONE_ID, EXCLUDE_ZONE_ID, sensors, dragOverSection, collisionDetection, handleDragOver, handleDragEnd, handleDragCancel } =
    useWalletDragDrop(wallets, setWallets, fetchWallets);

  const { setNodeRef: setIncludeDropRef, isOver: isIncludeOver } = useDroppable({ id: INCLUDE_ZONE_ID });
  const { setNodeRef: setExcludeDropRef, isOver: isExcludeOver } = useDroppable({ id: EXCLUDE_ZONE_ID });

  const totalBalance = useMemo(
    () => wallets.filter((w) => !w.excludeFromTotal).reduce((s, w) => s + w.balance, 0), [wallets]);
  const totalAllocationBase = useMemo(
    () => wallets.filter((w) => !w.excludeFromTotal).reduce((s, w) => s + Math.max(w.balance, 0), 0), [wallets]);
  const includeWallets = useMemo(() => wallets.filter((w) => !w.excludeFromTotal), [wallets]);
  const excludeWallets = useMemo(() => wallets.filter((w) => w.excludeFromTotal), [wallets]);

  const handleDelete = async (wallet: Wallets) => {
    let transactionCount = 0;
    try {
      const logs = await cashLogService.getAll();
      transactionCount = logs.filter((item) => item.walletName === wallet.name).length;
    } catch { transactionCount = 0; }

    if (!await confirm({
      title: 'Delete wallet?',
      description: `This action cannot be undone.\nCash log transactions to delete: ${transactionCount}.`,
      confirmLabel: 'Delete',
      variant: 'destructive',
    })) return;

    try {
      const deleted = await walletsService.remove(wallet.id);
      setWallets((prev) => prev.filter((item) => item.id !== wallet.id));
      toast.success(`Wallet deleted successfully. Deleted cash log transactions: ${deleted.deletedCashLogCount ?? transactionCount}.`);
    } catch { toast.error('Failed to delete wallet.'); }
  };

  const handleOpenCashLog = (wallet: Wallets) => {
    router.push(`/cash-log?walletId=${encodeURIComponent(String(wallet.id))}`);
  };

  if (error) return <div className='text-red-500'>{error}</div>;

  const renderSection = (walletList: Wallets[], zoneId: string, setDropRef: (node: HTMLElement | null) => void, isOver: boolean, label: string, emptyLabel: string) => {
    const isActive = dragOverSection === (zoneId === INCLUDE_ZONE_ID ? 'include' : 'exclude') || isOver;
    return (
      <div ref={setDropRef} className={`rounded-md p-2 border transition-all ${isActive ? 'bg-emerald-50 dark:bg-slate-700/60 border-dashed border-emerald-400 dark:border-emerald-500' : 'border-transparent'}`}>
        <div className='text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2'>{label}</div>
        <div className='space-y-5'>
          {walletList.length === 0 ? (
            <div className='text-sm text-gray-500 min-h-12 flex items-center rounded border border-dashed border-gray-300 dark:border-slate-600 px-3'>{emptyLabel}</div>
          ) : (
            <SortableContext items={walletList.map((w) => w.id)} strategy={verticalListSortingStrategy}>
              {walletList.map((wallet) => (
                <SortableWalletItem key={wallet.id} wallet={wallet} showNominal={showNominal} totalAllocationBase={totalAllocationBase}
                  onOpenCashLog={handleOpenCashLog} onEdit={onEdit} onTransfer={onTransfer} onDelete={handleDelete} onTrackGoal={onTrackGoal} canDelete={wallets.length > 1} />
              ))}
            </SortableContext>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className='w-full'>
      <div className='md:sticky md:top-0 z-40 bg-emerald-50 dark:bg-slate-900 pt-1 pb-2'>
        <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-2'>
          <div>
            <div className='text-lg font-semibold'>Total Balance</div>
            <div className={`text-2xl font-bold flex items-center gap-1 ${showNominal ? (totalBalance < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-300') : 'text-gray-500 dark:text-gray-400'}`}
              style={{ minHeight: '2.5rem', alignItems: 'center' }}>
              {totalBalance < 0 ? '- ' : ''}Rp {showNominal ? Math.abs(totalBalance).toLocaleString('id-ID') : '••••••••'}
              <button type='button' className='ml-1 flex items-center justify-center p-1 rounded hover:bg-emerald-100 dark:hover:bg-slate-700'
                aria-label={showNominal ? 'Sembunyikan nominal' : 'Tampilkan nominal'} onClick={() => setShowNominal((v) => !v)} tabIndex={0}
                style={{ height: '2rem', display: 'flex', alignItems: 'center' }}>
                {showNominal ? <Lock size={16} /> : <LockOpen size={16} />}
              </button>
            </div>
          </div>
          {onAdd && (
            <button className='w-full md:w-auto min-h-11 px-4 py-2.5 bg-emerald-600 text-white rounded shadow hover:bg-emerald-800 transition' onClick={onAdd} type='button'>+ Add Wallet</button>
          )}
        </div>
      </div>

      <Card className='bg-white dark:bg-slate-800 border-emerald-200 dark:border-slate-700 shadow-sm'>
        <CardContent className='p-6'>
          {loading ? (
            <div className='min-h-56 flex items-center justify-center'>
              <RefreshCw className='animate-spin text-emerald-600 dark:text-emerald-400' size={24} />
            </div>
          ) : wallets.length === 0 ? (
            <div>No wallets found.</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
              <div className='space-y-5'>
                {renderSection(includeWallets, INCLUDE_ZONE_ID, setIncludeDropRef, isIncludeOver, 'Include from total', 'No included wallet.')}
                <div className='h-0.5 flex-1 bg-emerald-200 dark:bg-emerald-800' />
                {renderSection(excludeWallets, EXCLUDE_ZONE_ID, setExcludeDropRef, isExcludeOver, 'Exclude from total', 'No excluded wallet.')}
              </div>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
