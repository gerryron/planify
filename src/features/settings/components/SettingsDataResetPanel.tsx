'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  cashLogService,
  type CashLog,
} from '@/features/cash-log/services/cashLogService';
import { categoryService } from '@/features/categories/services/categoryService';
import type { Category } from '@/features/categories/types/category';
import { monthlyBudgetService } from '@/features/monthly-budget/services/monthlyBudgetService';
import type { Budget } from '@/features/monthly-budget/services/monthlyBudgetService';
import {
  walletsService,
  type Wallets,
} from '@/features/wallets/services/walletsService';
import {
  PurgePayload,
  settingsService,
  DeleteScope,
} from '@/features/settings/services/settingsService';
import {
  buildSeedCategoryKey,
  seedCategoryKeys,
} from '@/features/settings/constants/seedCategories';
import {
  clearFailedWriteHistory,
  getFailedWriteHistory,
  getQueuedWriteCount,
  type FailedWriteHistoryItem,
  requestReplayQueuedWrites,
} from '@/shared/pwa/writeQueueClient';
import { asyncToast } from '@/shared/utils/asyncHelper';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';

function sortMonthsDesc(months: string[]) {
  return [...months].sort((a, b) => b.localeCompare(a));
}

function extractMonthFromDate(date: string) {
  if (typeof date !== 'string' || date.length < 7) return null;
  const month = date.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(month) ? month : null;
}

export default function SettingsDataResetPanel() {
  const confirmPhrase = 'DELETE';
  const router = useRouter();
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [syncingQueue, setSyncingQueue] = useState(false);
  const [failedHistory, setFailedHistory] = useState<FailedWriteHistoryItem[]>(
    [],
  );
  const [failedMethodFilter, setFailedMethodFilter] = useState<string>('all');
  const [failedStatusFilter, setFailedStatusFilter] = useState<
    'all' | 'network' | 'http'
  >('all');

  const [allLogs, setAllLogs] = useState<CashLog[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [allWallets, setAllWallets] = useState<Wallets[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  const [cashLogScope, setCashLogScope] = useState<DeleteScope>('none');
  const [cashLogMonths, setCashLogMonths] = useState<string[]>([]);
  const [availableCashLogMonths, setAvailableCashLogMonths] = useState<
    string[]
  >([]);

  const [budgetScope, setBudgetScope] = useState<DeleteScope>('none');
  const [budgetMonths, setBudgetMonths] = useState<string[]>([]);
  const [availableBudgetMonths, setAvailableBudgetMonths] = useState<string[]>(
    [],
  );

  const [deleteWallets, setDeleteWallets] = useState(false);
  const [deleteUserCategories, setDeleteUserCategories] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const [logs, budgets, wallets, categories] = await Promise.all([
          cashLogService.getAll(),
          monthlyBudgetService.getAll(),
          walletsService.getAll(),
          categoryService.getAll(),
        ]);

        if (!mounted) return;

        setAllLogs(logs);
        setAllBudgets(budgets);
        setAllWallets(wallets);
        setAllCategories(categories);

        const logMonths = sortMonthsDesc(
          Array.from(
            new Set(
              logs
                .map((item) => extractMonthFromDate(item.date))
                .filter((value): value is string => value !== null),
            ),
          ),
        );

        const monthlyBudgetMonths = sortMonthsDesc(
          Array.from(new Set(budgets.map((item) => item.month))),
        );

        setAvailableCashLogMonths(logMonths);
        setAvailableBudgetMonths(monthlyBudgetMonths);
      } catch {
        if (!mounted) return;
        toast.error('Failed to load month options');
      } finally {
        if (!mounted) return;
        setLoadingOptions(false);
      }
    };

    loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mounted = true;

    const refreshSyncDiagnostics = async () => {
      try {
        const [count, failed] = await Promise.all([
          getQueuedWriteCount(),
          getFailedWriteHistory(8),
        ]);
        if (!mounted) return;
        setQueueCount(count);
        setFailedHistory(failed);
      } catch {
        if (!mounted) return;
        setQueueCount(0);
        setFailedHistory([]);
      }
    };

    const onOnline = () => {
      void refreshSyncDiagnostics();
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshSyncDiagnostics();
      }
    };

    void refreshSyncDiagnostics();
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const syncNow = async () => {
    if (syncingQueue) return;
    setSyncingQueue(true);

    try {
      await requestReplayQueuedWrites();
      await new Promise((resolve) => setTimeout(resolve, 900));
      const [count, failed] = await Promise.all([
        getQueuedWriteCount(),
        getFailedWriteHistory(8),
      ]);
      setQueueCount(count);
      setFailedHistory(failed);

      if (count === 0) {
        toast.success('Queue synced');
      } else {
        toast.info(`Queue still pending — ${count} request(s) are still waiting.`);
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncingQueue(false);
    }
  };

  const clearFailedHistoryAction = async () => {
    await clearFailedWriteHistory();
    setFailedHistory([]);
    toast.success('Failed history cleared');
  };

  const hasAnyAction = useMemo(
    () =>
      cashLogScope !== 'none' ||
      budgetScope !== 'none' ||
      deleteWallets ||
      deleteUserCategories,
    [cashLogScope, budgetScope, deleteWallets, deleteUserCategories],
  );

  const filteredFailedHistory = useMemo(() => {
    return failedHistory.filter((item) => {
      const passMethod =
        failedMethodFilter === 'all' || item.method === failedMethodFilter;

      const passStatus =
        failedStatusFilter === 'all' ||
        (failedStatusFilter === 'network' && item.status === -1) ||
        (failedStatusFilter === 'http' && item.status >= 400);

      return passMethod && passStatus;
    });
  }, [failedHistory, failedMethodFilter, failedStatusFilter]);

  const availableFailedMethods = useMemo(() => {
    return Array.from(new Set(failedHistory.map((item) => item.method))).sort();
  }, [failedHistory]);

  const summary = useMemo(() => {
    const selectedCashLogMonths = new Set(cashLogMonths);
    const selectedBudgetMonths = new Set(budgetMonths);

    const cashLogDeleted =
      cashLogScope === 'all'
        ? allLogs.length
        : cashLogScope === 'months'
          ? allLogs.filter((item) => {
              const month = extractMonthFromDate(item.date);
              return month ? selectedCashLogMonths.has(month) : false;
            }).length
          : 0;

    const monthlyBudgetDeleted =
      budgetScope === 'all'
        ? allBudgets.length
        : budgetScope === 'months'
          ? allBudgets.filter((item) => selectedBudgetMonths.has(item.month))
              .length
          : 0;

    const walletNames = new Set(allWallets.map((wallet) => wallet.name));
    const cashLogDeletedByWallet = deleteWallets
      ? allLogs.filter((item) => walletNames.has(item.walletName)).length
      : 0;

    const categoriesById = new Map(
      allCategories.map((item) => [item.id, item]),
    );
    const userCategoryDeleted = deleteUserCategories
      ? allCategories.filter((category) => {
          const parentName =
            category.parentId !== null
              ? (categoriesById.get(category.parentId)?.name ?? null)
              : null;
          const key = buildSeedCategoryKey(
            category.type,
            category.name,
            parentName,
          );
          return !seedCategoryKeys.has(key);
        }).length
      : 0;

    return {
      cashLogDeleted,
      monthlyBudgetDeleted,
      walletDeleted: deleteWallets ? allWallets.length : 0,
      cashLogDeletedByWallet,
      userCategoryDeleted,
    };
  }, [
    allBudgets,
    allCategories,
    allLogs,
    allWallets,
    budgetMonths,
    budgetScope,
    cashLogMonths,
    cashLogScope,
    deleteUserCategories,
    deleteWallets,
  ]);

  const toggleMonth = (
    month: string,
    selected: string[],
    setter: (next: string[]) => void,
  ) => {
    setter(
      selected.includes(month)
        ? selected.filter((item) => item !== month)
        : [...selected, month],
    );
  };

  const submitPurge = async () => {
    if (!hasAnyAction) {
      toast.warning('No action selected');
      return;
    }

    if (cashLogScope === 'months' && cashLogMonths.length === 0) {
      toast.warning('Pick at least one month or switch to all.');
      return;
    }

    if (budgetScope === 'months' && budgetMonths.length === 0) {
      toast.warning('Pick at least one month or switch to all.');
      return;
    }

    const userInput = window.prompt(`Type ${confirmPhrase} to continue:\n\nThis action cannot be undone.`);
    if (userInput !== confirmPhrase) {
      if (userInput !== null) {
        toast.error(`Please type ${confirmPhrase} exactly.`);
      }
      return;
    }

    const payload: PurgePayload = {
      cashLog: { scope: cashLogScope, months: cashLogMonths },
      monthlyBudget: { scope: budgetScope, months: budgetMonths },
      deleteWallets,
      deleteUserCategories,
    };

    setSubmitting(true);
    const result = await asyncToast(
      () => settingsService.purgeData(payload),
      { success: 'Deletion completed', error: 'Failed to purge data' }
    );
    if (result) {
      router.refresh();
    }
    setSubmitting(false);
  };

  return (
    <div className='max-w-3xl mx-auto pt-0 pb-8'>
      <Card className='app-card rounded-xl shadow border border-slate-200 dark:border-slate-700 p-6'>
        <CardHeader className='px-0 pt-0'>
          <CardTitle className='text-2xl font-bold'>Settings</CardTitle>
        </CardHeader>
        <CardContent className='px-0'>
          <hr className='my-6 border-slate-300 dark:border-slate-600' />

          <div className='mb-6 rounded-lg border border-slate-200 bg-card p-4 dark:border-slate-700'>
            <h2 className='font-semibold mb-2'>Offline sync queue</h2>
            <p className='text-sm text-slate-700 dark:text-slate-200'>
              Pending offline write requests: <b>{queueCount}</b>
            </p>
            <Button
              onClick={syncNow}
              disabled={syncingQueue || queueCount === 0}
              className='mt-3 bg-emerald-600 hover:bg-emerald-700 text-white'
            >
              {syncingQueue ? 'Syncing...' : 'Sync now'}
            </Button>

            <div className='mt-4 rounded-lg border border-slate-200 bg-background p-3 dark:border-slate-700'>
              <div className='flex flex-wrap items-center justify-between gap-2 mb-2'>
                <h3 className='text-sm font-semibold'>Recent failed sync</h3>
                <Button
                  onClick={clearFailedHistoryAction}
                  disabled={failedHistory.length === 0}
                  size='sm'
                  className='bg-slate-700 text-white hover:bg-slate-800'
                >
                  Clear history
                </Button>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-2 mb-3'>
                <label className='text-xs text-slate-600 dark:text-slate-300'>
                  Method
                  <select
                    value={failedMethodFilter}
                    onChange={(event) =>
                      setFailedMethodFilter(event.target.value)
                    }
                    className='mt-1 w-full p-2 border rounded bg-card border-slate-300 dark:border-slate-700 text-xs'
                  >
                    <option value='all'>All methods</option>
                    {availableFailedMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
                <label className='text-xs text-slate-600 dark:text-slate-300'>
                  Status
                  <select
                    value={failedStatusFilter}
                    onChange={(event) =>
                      setFailedStatusFilter(
                        event.target.value as 'all' | 'network' | 'http',
                      )
                    }
                    className='mt-1 w-full p-2 border rounded bg-card border-slate-300 dark:border-slate-700 text-xs'
                  >
                    <option value='all'>All statuses</option>
                    <option value='network'>Network error</option>
                    <option value='http'>HTTP error</option>
                  </select>
                </label>
              </div>

              {filteredFailedHistory.length === 0 ? (
                <p className='text-xs text-slate-500 dark:text-slate-400'>
                  No failed requests match current filter.
                </p>
              ) : (
                <ul className='space-y-2'>
                  {filteredFailedHistory.map((item) => (
                    <li
                      key={item.id}
                      className='rounded border border-slate-200 px-2 py-2 text-xs dark:border-slate-700'
                    >
                      <p className='font-semibold text-slate-700 dark:text-slate-200'>
                        {item.method}{' '}
                        {item.status === -1 ? 'NETWORK' : item.status}
                      </p>
                      <p className='truncate text-slate-600 dark:text-slate-300'>
                        {item.url}
                      </p>
                      <p className='text-slate-500 dark:text-slate-400'>
                        {item.statusText} -{' '}
                        {new Date(item.lastAttemptAt).toLocaleString('id-ID')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <hr className='my-6 border-slate-300 dark:border-slate-600' />

          <div className='mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/20'>
            <h2 className='font-semibold mb-2'>Deletion summary (preview)</h2>
            <ul className='text-sm space-y-1 text-slate-700 dark:text-slate-200'>
              <li>Cash Log to delete: {summary.cashLogDeleted}</li>
              <li>
                Cash Log to delete by wallets option:{' '}
                {summary.cashLogDeletedByWallet}
              </li>
              <li>Monthly Budget to delete: {summary.monthlyBudgetDeleted}</li>
              <li>Wallets to delete: {summary.walletDeleted}</li>
              <li>User categories to delete: {summary.userCategoryDeleted}</li>
            </ul>
          </div>

          {loadingOptions ? (
            <p className='text-sm text-slate-500 dark:text-slate-400'>
              Loading month options...
            </p>
          ) : (
            <div className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>
                    1. Delete Cash Log transactions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    value={cashLogScope}
                    onChange={(event) =>
                      setCashLogScope(event.target.value as DeleteScope)
                    }
                    className='w-full md:w-72 p-2 border rounded bg-card border-slate-300 dark:border-slate-700'
                  >
                    <option value='none'>Do not delete</option>
                    <option value='months'>Delete selected months</option>
                    <option value='all'>Delete all</option>
                  </select>

                  {cashLogScope === 'months' && (
                    <div className='mt-3 grid grid-cols-2 md:grid-cols-4 gap-2'>
                      {availableCashLogMonths.length === 0 && (
                        <p className='text-sm text-slate-500 dark:text-slate-400'>
                          No months found.
                        </p>
                      )}
                      {availableCashLogMonths.map((month) => (
                        <Label
                          key={month}
                          className='text-sm flex items-center gap-2'
                        >
                          <Checkbox
                            checked={cashLogMonths.includes(month)}
                            onCheckedChange={() =>
                              toggleMonth(
                                month,
                                cashLogMonths,
                                setCashLogMonths,
                              )
                            }
                          />
                          {month}
                        </Label>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    2. Delete Monthly Budget data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <select
                    value={budgetScope}
                    onChange={(event) =>
                      setBudgetScope(event.target.value as DeleteScope)
                    }
                    className='w-full md:w-72 p-2 border rounded bg-card border-slate-300 dark:border-slate-700'
                  >
                    <option value='none'>Do not delete</option>
                    <option value='months'>Delete selected months</option>
                    <option value='all'>Delete all</option>
                  </select>

                  {budgetScope === 'months' && (
                    <div className='mt-3 grid grid-cols-2 md:grid-cols-4 gap-2'>
                      {availableBudgetMonths.length === 0 && (
                        <p className='text-sm text-slate-500 dark:text-slate-400'>
                          No months found.
                        </p>
                      )}
                      {availableBudgetMonths.map((month) => (
                        <Label
                          key={month}
                          className='text-sm flex items-center gap-2'
                        >
                          <Checkbox
                            checked={budgetMonths.includes(month)}
                            onCheckedChange={() =>
                              toggleMonth(
                                month,
                                budgetMonths,
                                setBudgetMonths,
                              )
                            }
                          />
                          {month}
                        </Label>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>3. Delete Wallets</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label className='text-sm flex items-center gap-2'>
                    <Checkbox
                      checked={deleteWallets}
                      onCheckedChange={(checked) =>
                        setDeleteWallets(checked === true)
                      }
                    />
                    Reset wallets to initial state (keep 1 seed wallet Cash) and
                    delete all related cash log transactions.
                  </Label>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    4. Delete user-added categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label className='text-sm flex items-center gap-2'>
                    <Checkbox
                      checked={deleteUserCategories}
                      onCheckedChange={(checked) =>
                        setDeleteUserCategories(checked === true)
                      }
                    />
                    Delete only categories created by users (default seed
                    categories are protected).
                  </Label>
                </CardContent>
              </Card>

              <div className='pt-2'>
                <Button
                  onClick={submitPurge}
                  disabled={!hasAnyAction || submitting}
                  variant='destructive'
                >
                  {submitting ? 'Deleting...' : 'Delete selected data'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
