import { useEffect, useMemo, useRef, useState } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import Swal from 'sweetalert2';
import {
  walletService,
  Wallet,
} from '@/features/wallet/services/walletService';
import {
  CollisionDetection,
  closestCenter,
  DndContext,
  DragEndEvent,
  pointerWithin,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WalletListProps {
  onEdit: (wallet: Wallet) => void;
  onAdd?: () => void;
}

const INCLUDE_ZONE_ID = 'include-zone';
const EXCLUDE_ZONE_ID = 'exclude-zone';

function MenuActions({
  onEdit,
  onDelete,
  canDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className='relative'>
      <button
        className='p-2 rounded hover:bg-emerald-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
        aria-label='Action'
        type='button'
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertIcon fontSize='small' />
      </button>
      {open && (
        <div className='absolute right-0 top-10 z-10 min-w-32 rounded-md border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md'>
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-emerald-100 dark:hover:bg-slate-700 flex items-center gap-2'
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            type='button'
          >
            <EditIcon fontSize='small' />
            Edit
          </button>
          {canDelete && (
            <button
              className='w-full px-3 py-2 text-left text-sm hover:bg-emerald-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600 dark:text-red-400'
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              type='button'
            >
              <DeleteIcon fontSize='small' />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function buildNextWallets(
  wallets: Wallet[],
  fromId: string,
  targetIncludeFromTotal: boolean,
  toId?: string,
): Wallet[] | null {
  const fromIndex = wallets.findIndex((wallet) => wallet.id === fromId);
  if (fromIndex < 0) return null;

  const sourceWallet = wallets[fromIndex];
  const withoutMoved = wallets.filter((wallet) => wallet.id !== fromId);

  let insertIndex = withoutMoved.length;
  if (toId) {
    const targetIndexInCurrent = wallets.findIndex(
      (wallet) => wallet.id === toId,
    );
    const targetIndex = withoutMoved.findIndex((wallet) => wallet.id === toId);
    if (targetIndexInCurrent < 0 || targetIndex < 0) return null;

    const movingWithinSameSection =
      sourceWallet.includeFromTotal === targetIncludeFromTotal;
    const movingDown = fromIndex < targetIndexInCurrent;

    insertIndex =
      movingWithinSameSection && movingDown ? targetIndex + 1 : targetIndex;
  } else if (targetIncludeFromTotal) {
    const firstExcludeIndex = withoutMoved.findIndex(
      (wallet) => !wallet.includeFromTotal,
    );
    insertIndex =
      firstExcludeIndex >= 0 ? firstExcludeIndex : withoutMoved.length;
  }

  const movedAfterDrop = {
    ...sourceWallet,
    includeFromTotal: targetIncludeFromTotal,
  };

  const nextWallets = [...withoutMoved];
  nextWallets.splice(insertIndex, 0, movedAfterDrop);
  return nextWallets;
}

function SortableWalletItem({
  wallet,
  showNominal,
  totalAllocationBase,
  onEdit,
  onDelete,
  canDelete,
}: {
  wallet: Wallet;
  showNominal: boolean;
  totalAllocationBase: number;
  onEdit: (wallet: Wallet) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: wallet.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  const allocationPercent =
    totalAllocationBase > 0
      ? (Math.max(wallet.balance, 0) / totalAllocationBase) * 100
      : 0;
  const clampedPercent = Math.max(0, Math.min(allocationPercent, 100));

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between border-b border-gray-300 dark:border-slate-700 pb-3 last:border-b-0 last:pb-0 transition-all ${
        isDragging ? 'opacity-70 scale-[0.99] shadow-md' : ''
      }`}
    >
      <div>
        <div className='font-bold'>{wallet.name}</div>
        <div
          className={`font-mono ${
            showNominal
              ? wallet.balance < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-700 dark:text-green-300'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {wallet.balance < 0 ? '- ' : ''}Rp{' '}
          {showNominal
            ? Math.abs(wallet.balance).toLocaleString('id-ID')
            : '••••••••'}
        </div>
        {wallet.includeFromTotal && (
          <div className='flex items-center gap-2 mt-1'>
            <div
              className='h-2 rounded overflow-hidden flex border border-gray-300 dark:border-slate-700'
              style={{ width: 140 }}
            >
              <div
                className={wallet.balance < 0 ? 'bg-red-500' : 'bg-green-500'}
                style={{ width: `${clampedPercent}%` }}
              />
              <div
                className='bg-transparent'
                style={{ width: `${100 - clampedPercent}%` }}
              />
            </div>
            <span className='text-xs text-gray-500 min-w-12 text-right'>
              {clampedPercent.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className='flex items-center gap-1'>
        <span
          className={`p-2 cursor-move text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded transition-all ${
            isDragging
              ? 'bg-emerald-100 dark:bg-slate-700 shadow ring-2 ring-emerald-300 dark:ring-emerald-600'
              : ''
          }`}
          {...attributes}
          {...listeners}
          title='Drag to reorder'
        >
          <DragIndicatorIcon fontSize='small' />
        </span>
        <MenuActions
          onEdit={() => onEdit(wallet)}
          onDelete={() => onDelete(wallet.id)}
          canDelete={canDelete}
        />
      </div>
    </div>
  );
}

export default function WalletList({ onEdit, onAdd }: WalletListProps) {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNominal, setShowNominal] = useState(true);
  const [dragOverSection, setDragOverSection] = useState<
    'include' | 'exclude' | null
  >(null);
  const dragOverSectionRef = useRef<'include' | 'exclude' | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const { setNodeRef: setIncludeDropRef, isOver: isIncludeOver } = useDroppable(
    {
      id: INCLUDE_ZONE_ID,
    },
  );
  const { setNodeRef: setExcludeDropRef, isOver: isExcludeOver } = useDroppable(
    {
      id: EXCLUDE_ZONE_ID,
    },
  );

  const fetchWallets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await walletService.getAll();
      setWallets(data);
    } catch {
      setError('Failed to fetch wallets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const totalBalance = useMemo(
    () =>
      wallets
        .filter((wallet) => wallet.includeFromTotal)
        .reduce((sum, wallet) => sum + wallet.balance, 0),
    [wallets],
  );

  const totalAllocationBase = useMemo(() => {
    return wallets
      .filter((wallet) => wallet.includeFromTotal)
      .reduce((sum, wallet) => sum + Math.max(wallet.balance, 0), 0);
  }, [wallets]);

  const includeWallets = useMemo(
    () => wallets.filter((wallet) => wallet.includeFromTotal),
    [wallets],
  );

  const excludeWallets = useMemo(
    () => wallets.filter((wallet) => !wallet.includeFromTotal),
    [wallets],
  );

  const setCurrentDragSection = (section: 'include' | 'exclude' | null) => {
    dragOverSectionRef.current = section;
    setDragOverSection(section);
  };

  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args).filter(
      (hit) => String(hit.id) !== String(args.active.id),
    );
    if (pointerHits.length > 0) {
      return pointerHits;
    }
    return closestCenter(args);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete wallet?',
      text: 'Deleted wallet cannot be restored.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      await walletService.remove(id);
      setWallets((prev) => prev.filter((wallet) => wallet.id !== id));
      await Swal.fire({
        title: 'Success',
        text: 'Wallet deleted successfully.',
        icon: 'success',
        timer: 1400,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire({
        title: 'Failed',
        text: 'Failed to delete wallet.',
        icon: 'error',
      });
    }
  };

  const persistMove = async (
    sourceWallet: Wallet,
    nextWallets: Wallet[],
    targetIncludeFromTotal: boolean,
  ) => {
    const includeChanged =
      sourceWallet.includeFromTotal !== targetIncludeFromTotal;

    setWallets(nextWallets);

    try {
      if (includeChanged) {
        await walletService.update(sourceWallet.id, {
          includeFromTotal: targetIncludeFromTotal,
        });
      }

      await walletService.reorder(nextWallets.map((wallet) => wallet.id));
    } catch {
    } finally {
      await fetchWallets();
      setCurrentDragSection(null);
    }
  };

  const handleDragOver = ({ over }: { over: DragEndEvent['over'] }) => {
    if (!over) {
      setCurrentDragSection(null);
      return;
    }

    const overId = String(over.id);
    if (overId === INCLUDE_ZONE_ID) {
      setCurrentDragSection('include');
      return;
    }
    if (overId === EXCLUDE_ZONE_ID) {
      setCurrentDragSection('exclude');
      return;
    }

    const hoveredWallet = wallets.find((wallet) => wallet.id === overId);
    if (!hoveredWallet) {
      setCurrentDragSection(null);
      return;
    }

    setCurrentDragSection(
      hoveredWallet.includeFromTotal ? 'include' : 'exclude',
    );
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    const fromId = String(active.id);
    const sourceWallet = wallets.find((wallet) => wallet.id === fromId);
    if (!sourceWallet) {
      setCurrentDragSection(null);
      return;
    }

    const fallbackTargetIncludeFromTotal =
      dragOverSectionRef.current === null
        ? null
        : dragOverSectionRef.current === 'include';

    if (!over) {
      if (fallbackTargetIncludeFromTotal === null) {
        setCurrentDragSection(null);
        return;
      }

      const nextWallets = buildNextWallets(
        wallets,
        fromId,
        fallbackTargetIncludeFromTotal,
      );
      if (!nextWallets) return;
      await persistMove(
        sourceWallet,
        nextWallets,
        fallbackTargetIncludeFromTotal,
      );
      return;
    }

    const overId = String(over.id);

    if (overId === fromId) {
      if (
        fallbackTargetIncludeFromTotal !== null &&
        fallbackTargetIncludeFromTotal !== sourceWallet.includeFromTotal
      ) {
        const nextWallets = buildNextWallets(
          wallets,
          fromId,
          fallbackTargetIncludeFromTotal,
        );
        if (!nextWallets) return;
        await persistMove(
          sourceWallet,
          nextWallets,
          fallbackTargetIncludeFromTotal,
        );
      } else {
        setCurrentDragSection(null);
      }
      return;
    }

    if (overId === INCLUDE_ZONE_ID || overId === EXCLUDE_ZONE_ID) {
      const targetIncludeFromTotal = overId === INCLUDE_ZONE_ID;
      const nextWallets = buildNextWallets(
        wallets,
        fromId,
        targetIncludeFromTotal,
      );
      if (!nextWallets) return;
      await persistMove(sourceWallet, nextWallets, targetIncludeFromTotal);
      return;
    }

    const targetWallet = wallets.find((wallet) => wallet.id === overId);
    if (!targetWallet) {
      setCurrentDragSection(null);
      return;
    }

    const targetIncludeFromTotal = targetWallet.includeFromTotal;
    const nextWallets = buildNextWallets(
      wallets,
      fromId,
      targetIncludeFromTotal,
      targetWallet.id,
    );
    if (!nextWallets) {
      setCurrentDragSection(null);
      return;
    }

    await persistMove(sourceWallet, nextWallets, targetIncludeFromTotal);
  };

  const handleDragCancel = () => {
    setCurrentDragSection(null);
  };

  if (error) return <div className='text-red-500'>{error}</div>;

  return (
    <div className='w-full'>
      <div className='sticky top-0 z-40 bg-emerald-50 dark:bg-slate-900 py-4'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <div className='text-lg font-semibold'>Total Balance</div>
            <div
              className={`text-2xl font-bold flex items-center gap-1 ${
                showNominal
                  ? totalBalance < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-700 dark:text-green-300'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
              style={{ minHeight: '2.5rem', alignItems: 'center' }}
            >
              {totalBalance < 0 ? '- ' : ''}Rp{' '}
              {showNominal
                ? Math.abs(totalBalance).toLocaleString('id-ID')
                : '••••••••'}
              <button
                type='button'
                className='ml-1 flex items-center justify-center p-1 rounded hover:bg-emerald-100 dark:hover:bg-slate-700'
                aria-label={
                  showNominal ? 'Sembunyikan nominal' : 'Tampilkan nominal'
                }
                onClick={() => setShowNominal((value) => !value)}
                tabIndex={0}
                style={{
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showNominal ? (
                  <LockIcon fontSize='small' />
                ) : (
                  <LockOpenIcon fontSize='small' />
                )}
              </button>
            </div>
          </div>
          {onAdd && (
            <button
              className='px-4 py-2 bg-emerald-600 text-white rounded shadow hover:bg-emerald-800 transition'
              onClick={onAdd}
              type='button'
            >
              + Add Wallet
            </button>
          )}
        </div>
      </div>

      <div className='bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-slate-700 shadow p-6'>
        {loading ? (
          <div className='min-h-56 flex items-center justify-center'>
            <AutorenewIcon
              className='animate-spin text-emerald-600 dark:text-emerald-400'
              fontSize='large'
            />
          </div>
        ) : wallets.length === 0 ? (
          <div>No wallets found.</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className='space-y-4'>
              <div
                ref={setIncludeDropRef}
                className={`rounded-md p-2 border transition-all ${
                  dragOverSection === 'include' || isIncludeOver
                    ? 'bg-emerald-50 dark:bg-slate-700/60 border-dashed border-emerald-400 dark:border-emerald-500'
                    : 'border-transparent'
                }`}
              >
                <div className='text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2'>
                  Include from total
                </div>
                <div className='space-y-4'>
                  {includeWallets.length === 0 ? (
                    <div className='text-sm text-gray-500 min-h-12 flex items-center rounded border border-dashed border-gray-300 dark:border-slate-600 px-3'>
                      No included wallet.
                    </div>
                  ) : (
                    <SortableContext
                      items={includeWallets.map((wallet) => wallet.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {includeWallets.map((wallet) => (
                        <SortableWalletItem
                          key={wallet.id}
                          wallet={wallet}
                          showNominal={showNominal}
                          totalAllocationBase={totalAllocationBase}
                          onEdit={onEdit}
                          onDelete={handleDelete}
                          canDelete={wallets.length > 1}
                        />
                      ))}
                    </SortableContext>
                  )}
                </div>
              </div>

              <div className='h-px bg-emerald-200 ' />

              <div
                ref={setExcludeDropRef}
                className={`rounded-md p-2 border transition-all ${
                  dragOverSection === 'exclude' || isExcludeOver
                    ? 'bg-emerald-50 dark:bg-slate-700/60 border-dashed border-emerald-400 dark:border-emerald-500'
                    : 'border-transparent'
                }`}
              >
                <div className='text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2'>
                  Exclude from total
                </div>
                <div className='space-y-4'>
                  {excludeWallets.length === 0 ? (
                    <div className='text-sm text-gray-500 min-h-12 flex items-center rounded border border-dashed border-gray-300 dark:border-slate-600 px-3'>
                      No excluded wallet.
                    </div>
                  ) : (
                    <SortableContext
                      items={excludeWallets.map((wallet) => wallet.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {excludeWallets.map((wallet) => (
                        <SortableWalletItem
                          key={wallet.id}
                          wallet={wallet}
                          showNominal={showNominal}
                          totalAllocationBase={totalAllocationBase}
                          onEdit={onEdit}
                          onDelete={handleDelete}
                          canDelete={wallets.length > 1}
                        />
                      ))}
                    </SortableContext>
                  )}
                </div>
              </div>
            </div>
          </DndContext>
        )}
      </div>
    </div>
  );
}
