import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Lock,
  LockOpen,
  EllipsisVertical,
  Pencil,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  cashLogService,
  CashLog,
} from '@/features/cash-log/services/cashLogService';
import {
  walletsService,
  Wallets,
} from '@/features/wallets/services/walletsService';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { asyncToast } from '@/shared/utils/asyncHelper';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CashLogListProps {
  onEdit: (log: CashLog) => void;
  onAdd?: (walletName?: string) => void;
  initialWalletId?: number | null;
  refreshToken?: number;
}

type MonthFilter = string | 'future';

function shiftMonth(base: Date, offset: number) {
  const shifted = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function dateGroupLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function MenuActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuAlign, setMenuAlign] = useState<'left' | 'right'>('right');
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

  const handleToggleMenu = () => {
    if (!open) {
      const triggerRect = containerRef.current?.getBoundingClientRect();
      if (triggerRect) {
        const estimatedMenuWidth = 180;
        const viewportPadding = 12;
        const hasLeftOverflowRisk =
          triggerRect.right - estimatedMenuWidth < viewportPadding;
        setMenuAlign(hasLeftOverflowRisk ? 'left' : 'right');
      }
    }

    setOpen((value) => !value);
  };

  return (
    <div ref={containerRef} className='relative'>
      <button
        className='p-2 rounded hover:bg-emerald-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
        aria-label='Action'
        type='button'
        onClick={handleToggleMenu}
      >
        <EllipsisVertical size={16} />
      </button>
      {open && (
        <div
          className={
            'absolute top-10 z-10 min-w-36 max-w-[calc(100vw-1.5rem)] rounded-md border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md ' +
            (menuAlign === 'left' ? 'left-0' : 'right-0')
          }
        >
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-emerald-100 dark:hover:bg-slate-700 flex items-center gap-2'
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            type='button'
          >
            <Pencil size={16} />
            Edit
          </button>
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-emerald-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600 dark:text-red-400'
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            type='button'
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function CashLogList({
  onEdit,
  onAdd,
  initialWalletId,
  refreshToken,
}: CashLogListProps) {
  const [logs, setLogs] = useState<CashLog[]>([]);
  const [wallets, setWallets] = useState<Wallets[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<'all' | number>(
    'all',
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNominal, setShowNominal] = useState(true);
  const hasAppliedInitialWalletRef = useRef(false);
  const monthPickerRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<MonthFilter>(currentMonth);
  const now = useMemo(() => new Date(), []);
  const prevMonths = useMemo(
    () =>
      Array.from({ length: 3 }, (_, index) => shiftMonth(now, -4 + index + 1)),
    [now],
  );

  const fetchLogs = async (monthFilter: MonthFilter) => {
    setLoading(true);
    setError(null);

    try {
      const data = await cashLogService.getAll(monthFilter);
      setLogs(data);
    } catch {
      setError('Failed to fetch cash logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchWallets = async () => {
    try {
      const data = await walletsService.getAll();
      setWallets(data);
    } catch {}
  };

  useEffect(() => {
    fetchLogs(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    fetchWallets();
  }, []);

  useEffect(() => {
    if (hasAppliedInitialWalletRef.current) return;
    if (!initialWalletId) {
      hasAppliedInitialWalletRef.current = true;
      return;
    }
    if (wallets.length === 0) return;

    const targetWalletExists = wallets.some(
      (wallet) => wallet.id === initialWalletId,
    );

    if (targetWalletExists) {
      setSelectedWalletId(initialWalletId);
    }

    hasAppliedInitialWalletRef.current = true;
  }, [initialWalletId, wallets]);

  useEffect(() => {
    if (!refreshToken) return;
    fetchWallets();
    fetchLogs(selectedMonth);
  }, [refreshToken, selectedMonth]);

  const sortedLogs = useMemo(() => {
    const selectedWallet = wallets.find(
      (wallet) => wallet.id === selectedWalletId,
    );
    const filteredLogs =
      selectedWalletId === 'all' || !selectedWallet
        ? logs
        : logs.filter((log) => log.walletName === selectedWallet.name);

    return [...filteredLogs].sort((a, b) => {
      if (a.date === b.date) {
        return b.id - a.id;
      }
      return a.date < b.date ? 1 : -1;
    });
  }, [logs, selectedWalletId, wallets]);

  const selectedWalletName = useMemo(() => {
    if (selectedWalletId === 'all') {
      return wallets[0]?.name;
    }

    return wallets.find((wallet) => wallet.id === selectedWalletId)?.name;
  }, [selectedWalletId, wallets]);

  const selectedWalletBalance = useMemo(() => {
    if (selectedWalletId === 'all') {
      return wallets
        .filter((wallet) => !wallet.excludeFromTotal)
        .reduce((sum, wallet) => sum + wallet.balance, 0);
    }

    const selectedWallet = wallets.find(
      (wallet) => wallet.id === selectedWalletId,
    );

    return selectedWallet?.balance ?? 0;
  }, [selectedWalletId, wallets]);

  const groupedLogs = useMemo(() => {
    return sortedLogs.reduce<Record<string, CashLog[]>>((groups, log) => {
      if (!groups[log.date]) {
        groups[log.date] = [];
      }

      groups[log.date].push(log);
      return groups;
    }, {});
  }, [sortedLogs]);

  const groupedWallets = useMemo(() => {
    const included = wallets.filter((wallet) => !wallet.excludeFromTotal);
    const excluded = wallets.filter((wallet) => wallet.excludeFromTotal);

    return { included, excluded };
  }, [wallets]);

  const handleDelete = async (id: number) => {
    if (!await confirm({
      title: 'Delete this entry?',
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    })) return;

    const result = await asyncToast(
      () => cashLogService.remove(id),
      { success: 'Deleted!', error: 'Failed to delete entry' }
    );
    if (result) {
      await fetchWallets();
      fetchLogs(selectedMonth);
    }
  };

  if (error) return <div className='text-red-500'>{error}</div>;

  return (
    <div className='w-full'>
      <div className='md:sticky md:top-0 z-40 bg-emerald-50 dark:bg-slate-900 pt-1 pb-2 border-b border-emerald-100 dark:border-slate-800'>
        <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-2'>
          <div className='w-full md:w-80'>
            <label className='block text-sm text-gray-500 mb-1'>Wallet</label>
            <Select
              value={String(selectedWalletId)}
              onValueChange={(value) => {
                setSelectedWalletId(value === 'all' ? 'all' : Number(value));
              }}
            >
              <SelectTrigger
                className='w-full min-h-11 bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700'
              >
                <SelectValue placeholder='Select wallet' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Wallets</SelectItem>
                {groupedWallets.included.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Included from total</SelectLabel>
                    {groupedWallets.included.map((wallet) => (
                      <SelectItem key={wallet.id} value={String(wallet.id)}>
                        {wallet.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {groupedWallets.excluded.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Excluded from total</SelectLabel>
                    {groupedWallets.excluded.map((wallet) => (
                      <SelectItem key={wallet.id} value={String(wallet.id)}>
                        {wallet.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>

            <div
              className={`text-2xl font-bold flex items-center gap-1 ${
                showNominal
                  ? selectedWalletBalance < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-700 dark:text-green-300'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
              style={{ minHeight: '2.5rem', alignItems: 'center' }}
            >
              {selectedWalletBalance < 0 ? '- ' : ''}Rp{' '}
              {showNominal
                ? Math.abs(selectedWalletBalance).toLocaleString('id-ID')
                : '••••••••'}
              <button
                type='button'
                className='ml-1 flex items-center justify-center p-1 rounded hover:bg-emerald-100 dark:hover:bg-slate-700'
                aria-label={showNominal ? 'Hide amount' : 'Show amount'}
                onClick={() => setShowNominal((value) => !value)}
                tabIndex={0}
                style={{
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showNominal ? (
                  <Lock size={16} />
                ) : (
                  <LockOpen size={16} />
                )}
              </button>
            </div>
          </div>
          <div className='w-full md:w-auto flex items-center gap-2'>
            <button
              className='w-full md:w-auto min-h-11 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded'
              onClick={() => onAdd?.(selectedWalletName)}
              type='button'
            >
              + Add Transaction
            </button>
          </div>
        </div>

        <div className='mb-2 w-full flex items-center gap-2 overflow-x-auto pb-1'>
          {prevMonths.map((month) => (
            <button
              key={month}
              type='button'
              onClick={() => setSelectedMonth(month)}
              className={`shrink-0 whitespace-nowrap rounded px-3 py-2 text-sm border transition ${
                selectedMonth === month
                  ? 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-900 border-emerald-600 dark:border-slate-100'
                  : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
              }`}
            >
              {monthLabel(month)}
            </button>
          ))}

          {!prevMonths.includes(currentMonth) && (
            <button
              type='button'
              onClick={() => setSelectedMonth(currentMonth)}
              className={`shrink-0 whitespace-nowrap rounded px-3 py-2 text-sm border transition ${
                selectedMonth === currentMonth
                  ? 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-900 border-emerald-600 dark:border-slate-100'
                  : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
              }`}
            >
              This Month
            </button>
          )}

          <button
            type='button'
            onClick={() => setSelectedMonth('future')}
            className={`shrink-0 whitespace-nowrap rounded px-3 py-2 text-sm border transition ${
              selectedMonth === 'future'
                ? 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-900 border-emerald-600 dark:border-slate-100'
                : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
            }`}
          >
            Future
          </button>

          <div className='relative shrink-0'>
            <button
              type='button'
              className={`whitespace-nowrap rounded px-3 py-2 text-sm border transition flex items-center gap-2 ${
                selectedMonth !== 'future' &&
                selectedMonth !== currentMonth &&
                !prevMonths.includes(selectedMonth)
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-900 border-emerald-600 dark:border-slate-100'
                  : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
              }`}
              onClick={() => {
                const input = monthPickerRef.current;
                if (!input) return;
                if (typeof input.showPicker === 'function') {
                  input.showPicker();
                } else {
                  input.click();
                }
              }}
            >
              Pick Another Month
            </button>
            <input
              ref={monthPickerRef}
              type='month'
              className='absolute left-0 top-0 opacity-0 w-0 h-0 pointer-events-none'
              tabIndex={-1}
              value={
                selectedMonth !== 'future' &&
                selectedMonth !== currentMonth &&
                !prevMonths.includes(selectedMonth)
                  ? selectedMonth
                  : ''
              }
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className='min-h-56 flex items-center justify-center'>
              <RefreshCw
                className='animate-spin text-emerald-600 dark:text-emerald-400'
                size={24}
              />
            </div>
          ) : sortedLogs.length === 0 ? (
            <div>No cash log entries found.</div>
          ) : (
            <div className='space-y-4'>
              {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                <div key={date}>
                  <div className='flex items-center gap-3 mb-3'>
                    <div className='h-0.5 flex-1 bg-emerald-200 dark:bg-emerald-800' />
                    <div className='text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 whitespace-nowrap text-right'>
                      {dateGroupLabel(date)}
                    </div>
                  </div>
                  <div>
                    {dateLogs.map((log, index) => (
                      <div
                        key={log.id}
                        className={`flex items-center justify-between ${
                          index < dateLogs.length - 1
                            ? 'border-b border-slate-200 dark:border-slate-700/80 pb-3 mb-3'
                            : 'pb-0 mb-0'
                        }`}
                      >
                        <div>
                          <div className='font-bold'>{log.description}</div>
                          {selectedWalletId === 'all' && (
                            <div className='text-sm text-gray-500'>
                              {log.walletName}
                            </div>
                          )}
                          <div
                            className={`text-xs font-medium ${
                              log.category?.type === 'income'
                                ? 'text-green-700 dark:text-green-300'
                                : log.category?.type === 'outcome'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {log.category?.name ?? 'Uncategorized'}
                          </div>
                          <div
                            className={`font-mono ${
                              showNominal
                                ? log.category?.type === 'outcome'
                                  ? 'text-red-600 dark:text-red-400'
                                  : log.category?.type === 'income'
                                    ? 'text-green-700 dark:text-green-300'
                                    : log.amount < 0
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-green-700 dark:text-green-300'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            Rp{' '}
                            {showNominal
                              ? Math.abs(log.amount).toLocaleString('id-ID')
                              : '••••••••'}
                          </div>
                        </div>

                        <div className='flex items-start gap-2 self-start'>
                          {log.excludeFromReport && (
                            <span className='text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'>
                              Excluded
                            </span>
                          )}
                          <MenuActions
                            onEdit={() => onEdit(log)}
                            onDelete={() => handleDelete(log.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
