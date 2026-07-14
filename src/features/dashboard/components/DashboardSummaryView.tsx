'use client';

import type { ReactNode } from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SavingsIcon from '@mui/icons-material/Savings';
import {
  BarChart,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatCompact } from '../utils/dashboardCharts';
import SummaryCard from './SummaryCard';
import ChartCard from './ChartCard';
import type { useDashboardData } from '../hooks/useDashboardData';

type DashboardData = ReturnType<typeof useDashboardData>;

type Props = { d: DashboardData };

export default function DashboardSummaryView({ d }: Props) {
  const overallSummaryCards: Array<{ key: string; icon: ReactNode; label: string; value: string; color: 'green' | 'red' | 'emerald' }> = [
    { key: 'assets', icon: <AccountBalanceWalletIcon />, label: 'Total Assets', value: d.val(d.totalAssets), color: 'emerald' },
    { key: 'debt', icon: <ReceiptLongIcon />, label: 'Total Debt', value: d.val(d.totalDebt), color: 'red' },
    { key: 'networth', icon: <SavingsIcon />, label: 'Net Worth', value: d.val(d.netWorth), color: d.netWorth >= 0 ? 'green' : 'red' },
    { key: 'avg-income', icon: <TrendingUpIcon />, label: 'Average Income (6 Months)', value: d.val(Math.round(d.avgIncome6Months)), color: 'green' },
    { key: 'avg-outcome', icon: <TrendingDownIcon />, label: 'Average Outcome (6 Months)', value: d.val(Math.round(d.avgOutcome6Months)), color: 'red' },
    { key: 'net-acc', icon: <SavingsIcon />, label: 'Net Accumulation (6 Months)', value: d.val(d.net6Months), color: d.net6Months >= 0 ? 'green' : 'red' },
  ];

  return (
    <section className='space-y-4'>
      <div className='flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-6'>
        <h2 className='text-lg font-semibold text-slate-800 dark:text-slate-100'>Overall Summary</h2>
        <span className='text-sm text-slate-500 dark:text-slate-400'>Cross-month overview</span>
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-3 gap-4'>
        {overallSummaryCards.map((card, index) => (
          <div key={card.key} className={`min-w-0 ${overallSummaryCards.length % 2 === 1 && index === overallSummaryCards.length - 1 ? 'col-span-2' : ''}`}>
            <SummaryCard icon={card.icon} label={card.label} value={card.value} color={card.color} />
          </div>
        ))}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <ChartCard title='Income vs Outcome (6 Months)'>
          <ResponsiveContainer width='100%' height={280}>
            <BarChart data={d.monthlyTrend} barGap={4}>
              <CartesianGrid strokeDasharray='3 3' stroke={d.isDark ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey='label' tick={{ fontSize: 12, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
              <YAxis tickFormatter={(v) => d.showNominal ? formatCompact(v) : '•••'} tick={{ fontSize: 11, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
              <Tooltip contentStyle={d.tooltipStyle} formatter={d.currencyFormatter} cursor={d.chartTooltipCursor} />
              <Bar dataKey='income' name='Income' fill='#10b981' radius={[4, 4, 0, 0]} activeBar={d.mobileActiveBarStyle} />
              <Bar dataKey='outcome' name='Outcome' fill='#ef4444' radius={[4, 4, 0, 0]} activeBar={d.mobileActiveBarStyle} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title='Cashflow & Net Trend (6 Months)'>
          <ResponsiveContainer width='100%' height={280}>
            <LineChart data={d.balanceTrend}>
              <CartesianGrid strokeDasharray='3 3' stroke={d.isDark ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey='label' tick={{ fontSize: 12, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
              <YAxis tickFormatter={(v) => d.showNominal ? formatCompact(v) : '•••'} tick={{ fontSize: 11, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
              <Tooltip contentStyle={d.tooltipStyle} formatter={d.currencyFormatter} cursor={d.chartTooltipCursor} />
              <Legend />
              <Line type='monotone' dataKey='income' name='Income' stroke='#10b981' strokeWidth={2} strokeDasharray='5 4' dot={false} activeDot={d.mediumActiveDot} />
              <Line type='monotone' dataKey='outcome' name='Outcome' stroke='#ef4444' strokeWidth={2} strokeDasharray='5 4' dot={false} activeDot={d.mediumActiveDot} />
              <Line type='monotone' dataKey='balance' name='Net Balance' stroke='#38bdf8' strokeWidth={3} dot={{ r: 4, fill: '#38bdf8' }} activeDot={d.strongActiveDot} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6'>
        <ChartCard title='Credit Utilization Trend (6 Months)'>
          {d.creditCardMonths6.every((item) => item.billed === 0) ? (
            <p className='text-sm text-slate-500 dark:text-slate-400'>No billed credit card activity in the last 6 months.</p>
          ) : (
            <ResponsiveContainer width='100%' height={d.isMobileViewport ? 200 : 240}>
              <LineChart data={d.creditCardMonths6}>
                <CartesianGrid strokeDasharray='3 3' stroke={d.isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey='label' interval={d.isMobileViewport ? 1 : 0} tick={{ fontSize: d.isMobileViewport ? 10 : 12, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis tickFormatter={(value) => `${Number(value).toFixed(0)}%`} tick={{ fontSize: d.isMobileViewport ? 10 : 11, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip contentStyle={d.tooltipStyle} formatter={(value) => `${Number(value).toFixed(1)}%`} />
                <ReferenceLine y={30} stroke='#10b981' strokeDasharray='4 4' />
                <ReferenceLine y={80} stroke='#ef4444' strokeDasharray='4 4' />
                <Line type='monotone' dataKey='cycleUtilization' name='Cycle Utilization' stroke='#f59e0b' strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} activeDot={d.strongActiveDot} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title='Statement vs Payment (6 Months)'>
          {d.creditCardMonths6.every((item) => item.billed === 0 && item.paid === 0) ? (
            <p className='text-sm text-slate-500 dark:text-slate-400'>No statement or payment activity in the last 6 months.</p>
          ) : (
            <ResponsiveContainer width='100%' height={d.isMobileViewport ? 200 : 240}>
              <ComposedChart data={d.creditCardMonths6}>
                <CartesianGrid strokeDasharray='3 3' stroke={d.isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey='label' interval={d.isMobileViewport ? 1 : 0} tick={{ fontSize: d.isMobileViewport ? 10 : 12, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
                <YAxis tickFormatter={(v) => d.showNominal ? formatCompact(v) : '•••'} tick={{ fontSize: d.isMobileViewport ? 10 : 11, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
                <Tooltip contentStyle={d.tooltipStyle} formatter={d.currencyFormatter} cursor={d.chartTooltipCursor} />
                {!d.isMobileViewport && <Legend />}
                <Bar dataKey='billed' name='Statement (Billed)' fill='#ef4444' radius={[4, 4, 0, 0]} activeBar={d.mobileActiveBarStyle} />
                <Bar dataKey='paid' name='Paid' fill='#10b981' radius={[4, 4, 0, 0]} activeBar={d.mobileActiveBarStyle} />
                <Line type='monotone' dataKey='carryover' name='Carryover' stroke='#f59e0b' strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} activeDot={d.mediumActiveDot} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title='Payment Discipline (6 Months)'>
          <div className='space-y-2 sm:space-y-3'>
            <div className='grid grid-cols-2 gap-2 sm:gap-3 text-[11px] sm:text-xs'>
              <div className='rounded-lg border border-slate-200 dark:border-slate-700 p-2 sm:p-2.5'>
                <p className='text-slate-500 dark:text-slate-400'>Active Months</p>
                <p className='mt-1 font-semibold text-slate-700 dark:text-slate-200'>{d.paymentDisciplineSummary.activeMonths}</p>
              </div>
              <div className='rounded-lg border border-slate-200 dark:border-slate-700 p-2 sm:p-2.5'>
                <p className='text-slate-500 dark:text-slate-400'>On-Track Months</p>
                <p className='mt-1 font-semibold text-emerald-600 dark:text-emerald-400'>{d.paymentDisciplineSummary.onTrackMonths}</p>
              </div>
              <div className='rounded-lg border border-slate-200 dark:border-slate-700 p-2 sm:p-2.5'>
                <p className='text-slate-500 dark:text-slate-400'>At-Risk Months</p>
                <p className='mt-1 font-semibold text-red-600 dark:text-red-400'>{d.paymentDisciplineSummary.atRiskMonths}</p>
              </div>
              <div className='rounded-lg border border-slate-200 dark:border-slate-700 p-2 sm:p-2.5'>
                <p className='text-slate-500 dark:text-slate-400'>Avg Coverage</p>
                <p className='mt-1 font-semibold text-blue-600 dark:text-blue-400'>{d.paymentDisciplineSummary.avgCoverage.toFixed(1)}%</p>
              </div>
            </div>
            <div className='rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 text-[11px] sm:text-xs'>
              <p className='text-slate-500 dark:text-slate-400'>Total Statement (6 months)</p>
              <p className='mt-1 font-semibold text-slate-700 dark:text-slate-200'>{d.val(d.paymentDisciplineSummary.totalBilled)}</p>
              <p className='mt-2 text-slate-500 dark:text-slate-400'>Total Paid</p>
              <p className='mt-1 font-semibold text-emerald-600 dark:text-emerald-400'>{d.val(d.paymentDisciplineSummary.totalPaid)}</p>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className='grid grid-cols-1 gap-6'>
        <ChartCard title='Top 5 Expenses (Last 6 Months)'>
          {d.summaryExpenseDrillMode !== 'top' && (
            <div className='mb-2 flex items-center justify-between'>
              <p className='text-xs text-slate-500 dark:text-slate-400'>
                {d.summaryExpenseDrillMode === 'child' && d.selectedSummaryParent
                  ? `Child categories of ${d.selectedSummaryParent} (${d.val(d.selectedSummaryParentAmount)})`
                  : 'Parent categories outside Top 5'}
              </p>
              <div className='flex items-center gap-3'>
                {d.summaryExpenseDrillMode === 'child' && d.summaryChildFromOther && (
                  <button type='button' onClick={() => { d.setSummaryExpenseDrillMode('top'); d.setSelectedSummaryParent(null); d.setSummaryChildFromOther(false); }} className='text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline'>
                    Back to Top 5
                  </button>
                )}
                <button type='button' onClick={() => {
                  if (d.summaryExpenseDrillMode === 'child') {
                    if (d.summaryChildFromOther) { d.setSummaryExpenseDrillMode('other'); } else { d.setSummaryExpenseDrillMode('top'); }
                    d.setSelectedSummaryParent(null); d.setSummaryChildFromOther(false);
                    return;
                  }
                  d.setSummaryExpenseDrillMode('top');
                }} className='text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline'>Back</button>
              </div>
            </div>
          )}
          <ResponsiveContainer width='100%' height={d.summaryExpenseChartHeight}>
            <BarChart data={d.summaryExpenseChartData} layout='vertical'>
              <CartesianGrid strokeDasharray='3 3' stroke={d.isDark ? '#334155' : '#e2e8f0'} />
              <XAxis type='number' tickFormatter={(v) => d.showNominal ? formatCompact(v) : '•••'} tick={{ fontSize: 11, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
              <YAxis dataKey='name' type='category' width={120} tick={{ fontSize: 11, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
              <Tooltip contentStyle={d.tooltipStyle} formatter={d.currencyFormatter} cursor={d.chartTooltipCursor} />
              <Bar dataKey='amount' name='Amount' radius={[0, 4, 4, 0]} activeBar={d.mobileActiveBarStyle}>
                {d.summaryExpenseChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} className={d.summaryExpenseDrillMode !== 'child' && (entry.name !== 'Other' || d.summaryOtherParentExpenses.length > 0) ? 'cursor-pointer' : ''}
                    onClick={() => {
                      if (d.summaryExpenseDrillMode === 'child') return;
                      if (d.summaryExpenseDrillMode === 'top') {
                        if (entry.name === 'Other') { if (d.summaryOtherParentExpenses.length === 0) return; d.setSummaryExpenseDrillMode('other'); return; }
                        d.setSummaryChildFromOther(false);
                      } else { d.setSummaryChildFromOther(true); }
                      d.setSelectedSummaryParent(entry.name); d.setSummaryExpenseDrillMode('child');
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </section>
  );
}
