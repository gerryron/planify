import { useEffect, useMemo, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import {
  cashLogService,
  CashLog,
} from '@/features/cash-log/services/cashLogService';
import {
  walletsService,
  Wallets,
} from '@/features/wallets/services/walletsService';

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
      return wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
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
    const result = await Swal.fire({
      title: 'Delete this entry?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc2626',
    });

    if (!result.isConfirmed) return;

    try {
      await cashLogService.remove(id);
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        timer: 1000,
        showConfirmButton: false,
      });
      await fetchWallets();
      fetchLogs(selectedMonth);
    } catch {
      await Swal.fire({
        icon: 'error',
        title: 'Failed to delete entry',
      });
    }
  };

  if (error) return <div className='text-red-500'>{error}</div>;

  return (
    <div className='w-full'>
      <div className='sticky top-0 z-40 bg-emerald-50 dark:bg-slate-900 pt-4 pb-3 border-b border-emerald-100 dark:border-slate-800'>
        <div className='flex items-center justify-between mb-4'>
          <div className='w-full sm:w-80'>
            <label className='block text-sm text-gray-500 mb-1'>Wallet</label>
            <select
              value={selectedWalletId}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedWalletId(value === 'all' ? 'all' : Number(value));
              }}
              className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
            >
              <option value='all'>All Wallets</option>
              {groupedWallets.included.length > 0 && (
                <optgroup label='Included from total'>
                  {groupedWallets.included.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {groupedWallets.excluded.length > 0 && (
                <optgroup label='Excluded from total'>
                  {groupedWallets.excluded.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

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
          <div className='flex items-center gap-2'>
            <button
              className='px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded'
              onClick={() => onAdd?.(selectedWalletName)}
              type='button'
            >
              + Add Transaction
            </button>
          </div>
        </div>

        <div className='mb-4 w-full flex flex-wrap gap-2 items-center'>
          {prevMonths.map((month) => (
            <button
              key={month}
              type='button'
              onClick={() => setSelectedMonth(month)}
              className={`rounded px-3 py-1.5 text-sm border transition ${
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
              className={`rounded px-3 py-1.5 text-sm border transition ${
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
            className={`rounded px-3 py-1.5 text-sm border transition ${
              selectedMonth === 'future'
                ? 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-900 border-emerald-600 dark:border-slate-100'
                : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
            }`}
          >
            Future
          </button>

          <div className='relative'>
            <button
              type='button'
              className={`rounded px-3 py-1.5 text-sm border transition flex items-center gap-2 ${
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

      <div className='bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-slate-700 shadow p-6'>
        {loading ? (
          <div className='min-h-56 flex items-center justify-center'>
            <AutorenewIcon
              className='animate-spin text-emerald-600 dark:text-emerald-400'
              fontSize='large'
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
      </div>
    </div>
  );
}
