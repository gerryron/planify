'use client';

import { useMemo } from 'react';

type DashboardOfflineSnapshot = {
  month: string;
  income: number;
  outcome: number;
  net: number;
  walletTotal: number;
  totalAssets?: number;
  totalDebt?: number;
  netWorth?: number;
  savedAt: string;
};

const SNAPSHOT_KEY = 'dashboard-offline-snapshot-v1';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OfflineSummaryCard() {
  const snapshot = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as DashboardOfflineSnapshot;
      if (
        typeof parsed.month === 'string' &&
        typeof parsed.income === 'number' &&
        typeof parsed.outcome === 'number' &&
        typeof parsed.net === 'number' &&
        typeof parsed.walletTotal === 'number' &&
        typeof parsed.savedAt === 'string'
      ) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  if (!snapshot) {
    return null;
  }

  const totalAssets = snapshot.totalAssets ?? snapshot.walletTotal;
  const totalDebt = snapshot.totalDebt ?? 0;
  const netWorth = snapshot.netWorth ?? snapshot.walletTotal;

  return (
    <div className='mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left dark:border-slate-700 dark:bg-slate-800/50'>
      <h2 className='text-sm font-semibold text-slate-800 dark:text-slate-100'>
        Ringkasan Dashboard Terakhir
      </h2>
      <p className='mt-1 text-xs text-slate-600 dark:text-slate-300'>
        Snapshot bulan {snapshot.month} - tersimpan {snapshot.savedAt}
      </p>
      <ul className='mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200'>
        <li>Total assets: {formatCurrency(totalAssets)}</li>
        <li>Total debt: {formatCurrency(totalDebt)}</li>
        <li>Net worth: {formatCurrency(netWorth)}</li>
        <li>Total income: {formatCurrency(snapshot.income)}</li>
        <li>Total outcome: {formatCurrency(snapshot.outcome)}</li>
        <li>Cashflow bersih: {formatCurrency(snapshot.net)}</li>
      </ul>
    </div>
  );
}
