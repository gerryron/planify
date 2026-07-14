'use client';

import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useDashboardData } from '../hooks/useDashboardData';
import DashboardMonthlyView from './DashboardMonthlyView';
import DashboardSummaryView from './DashboardSummaryView';

export default function DashboardView() {
  const d = useDashboardData();

  if (d.loadingData) {
    return <div className='text-slate-500 dark:text-slate-400'>Loading...</div>;
  }

  if (d.dataError) {
    return <div className='text-red-500'>{d.dataError}</div>;
  }

  return (
    <div className='space-y-6'>
      {/* ─── Header ─── */}
      <div className='md:sticky md:top-0 z-40 bg-emerald-50 dark:bg-slate-900 pt-1 pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2'>
        <div className='flex flex-col gap-2 w-full md:w-auto'>
          <div className='flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap'>
            <h1 className='text-2xl font-bold text-emerald-700 dark:text-slate-100 mr-1'>
              Dashboard
            </h1>

            <div className='relative w-full sm:w-auto'>
              <select
                value={d.selectedWalletId}
                onChange={(event) => d.setSelectedWalletId(event.target.value)}
                className='w-full sm:w-auto min-h-11 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:min-w-44'
                aria-label='Wallet filter'
              >
                <option value='all'>All Wallets</option>
                {d.groupedWallets.included.length > 0 && (
                  <optgroup label='Included from total'>
                    {d.groupedWallets.included.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                    ))}
                  </optgroup>
                )}
                {d.groupedWallets.excluded.length > 0 && (
                  <optgroup label='Excluded from total'>
                    {d.groupedWallets.excluded.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <input
              type='month'
              value={d.selectedMonth}
              onChange={(e) => d.setSelectedMonth(e.target.value)}
              className='w-full sm:w-auto min-h-11 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500'
            />
          </div>
        </div>
        <div className='w-full md:w-auto flex items-center gap-3'>
          <div className='flex-1 md:flex-none inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden'>
            <button
              type='button'
              onClick={() => d.setMode('month')}
              className={`flex-1 md:flex-none px-3 py-2 text-sm transition-colors ${
                d.mode === 'month'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
              }`}
            >
              Monthly
            </button>
            <button
              type='button'
              onClick={() => d.setMode('summary')}
              className={`flex-1 md:flex-none px-3 py-2 text-sm transition-colors ${
                d.mode === 'summary'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-slate-700'
              }`}
            >
              6-Month Summary
            </button>
          </div>

          <button
            onClick={() => d.setShowNominal((v) => !v)}
            className='p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors'
            aria-label='Toggle nominal visibility'
          >
            {d.showNominal ? <LockOpenIcon fontSize='small' /> : <LockIcon fontSize='small' />}
          </button>
        </div>
      </div>

      {d.mode === 'month' ? <DashboardMonthlyView d={d} /> : <DashboardSummaryView d={d} />}
    </div>
  );
}
