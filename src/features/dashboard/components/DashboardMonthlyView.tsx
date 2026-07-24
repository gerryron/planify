'use client';

import { useCallback, type ReactNode } from 'react';
import { TrendingUp, TrendingDown, Receipt, PiggyBank, ChevronLeft, ChevronRight } from 'lucide-react';
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
  Line,
  CartesianGrid,
} from 'recharts';
import { formatCurrency, formatCompact, monthLabel } from '../utils/dashboardCharts';
import TopExpenseTooltip from './TopExpenseTooltip';
import DailyTrendTooltip from './DailyTrendTooltip';
import SummaryCard from './SummaryCard';
import ChartCard from './ChartCard';
import { HIDDEN_VALUE } from './TopExpenseTooltip';
import type { useDashboardData } from '../hooks/useDashboardData';

type DashboardData = ReturnType<typeof useDashboardData>;

type Props = { d: DashboardData };

export default function DashboardMonthlyView({ d }: Props) {
  const budgetVsActualTick = useCallback(
    ({
      x,
      y,
      payload,
    }: {
      x?: string | number;
      y?: string | number;
      payload?: { value?: string | number };
    }) => {
      const key = String(payload?.value ?? '');
      const item = d.budgetVsActualVisibleMap.get(key);
      const label = item?.category ?? key;
      const fill = item
        ? item.type === 'income'
          ? d.isDark ? '#86efac' : '#15803d'
          : d.isDark ? '#fca5a5' : '#b91c1c'
        : d.isDark ? '#94a3b8' : '#64748b';

      return (
        <text x={Number(x ?? 0) - 6} y={Number(y ?? 0)} dy={4} textAnchor='end' fill={fill} fontSize={11}>
          {label}
        </text>
      );
    },
    [d.budgetVsActualVisibleMap, d.isDark],
  );

  const monthlySummaryCards: Array<{ key: string; icon: ReactNode; label: string; value: string; color: 'green' | 'red' | 'blue' }> = [
    { key: 'income', icon: <TrendingUp />, label: 'Income', value: d.val(d.totalIncome), color: 'green' },
    { key: 'outcome', icon: <TrendingDown />, label: 'Outcome', value: d.val(d.totalOutcome), color: 'red' },
    { key: 'net', icon: <PiggyBank />, label: 'Net', value: d.val(d.netBalance), color: d.netBalance >= 0 ? 'green' : 'red' },
    { key: 'tx', icon: <Receipt />, label: 'Total Transactions', value: d.txCount.toString(), color: 'blue' },
  ];

  return (
    <section className='space-y-4'>
      <div className='flex items-center justify-between border-t border-slate-200 dark:border-slate-700 pt-6'>
        <h2 className='text-lg font-semibold text-slate-800 dark:text-slate-100'>Selected Month Data</h2>
        <span className='text-sm text-slate-500 dark:text-slate-400'>{monthLabel(d.selectedMonth)}</span>
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        {monthlySummaryCards.map((card, index) => (
          <div key={card.key} className={`min-w-0 ${monthlySummaryCards.length % 2 === 1 && index === monthlySummaryCards.length - 1 ? 'col-span-2' : ''}`}>
            <SummaryCard icon={card.icon} label={card.label} value={card.value} color={card.color} />
          </div>
        ))}
      </div>

      {/* Credit card cards */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <ChartCard title='Credit Card Due Reminder'>
          {d.creditCardDueReminders.length === 0 ? (
            <p className='text-sm text-slate-500 dark:text-slate-400'>No credit card due reminder for current data.</p>
          ) : (
            <div className='space-y-2'>
              {d.creditCardDueReminders.map((item) => (
                <div key={item.id} className='flex items-center justify-between rounded border border-slate-200 dark:border-slate-700 px-3 py-2'>
                  <div>
                    <p className='text-sm font-semibold text-slate-800 dark:text-slate-200'>{item.name}</p>
                    <p className='text-xs text-slate-500 dark:text-slate-400'>Due: {item.dueDate}</p>
                  </div>
                  <div className='text-right'>
                    <p className={`text-xs font-semibold ${item.severity === 'overdue' ? 'text-red-600 dark:text-red-400' : item.severity === 'due-soon' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {item.severity === 'overdue' ? `${Math.abs(item.days)} day(s) overdue` : `${item.days} day(s) remaining`}
                    </p>
                    <p className='text-xs text-slate-500 dark:text-slate-400'>Outstanding: {d.val(item.outstanding)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title='Credit Card Billing Cycle (Selected Month)'>
          {d.creditCardCycleSummaries.length === 0 ? (
            <p className='text-sm text-slate-500 dark:text-slate-400'>Billing cycle data is unavailable. Add credit card wallet with statement and due day.</p>
          ) : (
            <div className='space-y-3'>
              {d.creditCardCycleSummaries.map((item) => (
                <div key={item.id} className='rounded border border-slate-200 dark:border-slate-700 p-3'>
                  <div className='mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                    <p className='text-sm font-semibold text-slate-800 dark:text-slate-200'>{item.name}</p>
                    <p className='text-xs text-slate-500 dark:text-slate-400'>Utilization {item.utilization.toFixed(1)}%</p>
                  </div>
                  <p className='text-xs text-slate-500 dark:text-slate-400 wrap-break-word'>Cycle: {item.cycleStart} to {item.cycleEnd} - Due {item.dueDate}</p>
                  <p className='text-xs text-slate-500 dark:text-slate-400 wrap-break-word'>Payment window: {item.cycleEnd} to {item.dueDate}</p>
                  <div className='mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs'>
                    <p className='text-slate-600 dark:text-slate-300 wrap-break-word'>Spent: {d.val(item.spent)}</p>
                    <p className='text-slate-600 dark:text-slate-300 wrap-break-word'>Paid: {d.val(item.paid)}</p>
                    <p className='text-slate-600 dark:text-slate-300 wrap-break-word'>Cycle net: {d.val(item.netChange)}</p>
                    <p className='text-slate-600 dark:text-slate-300 wrap-break-word'>Outstanding: {d.val(item.outstanding)}</p>
                    <p className='text-slate-600 dark:text-slate-300 wrap-break-word'>Limit: {d.val(item.creditLimit)}</p>
                    <p className='text-slate-600 dark:text-slate-300 wrap-break-word'>Remaining: {d.val(item.remainingLimit)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Daily Trend */}
      <div className='grid grid-cols-1 gap-6'>
        <ChartCard title='Daily Trend (Selected Month)'>
          <ResponsiveContainer width='100%' height={280}>
            <ComposedChart data={d.dailyTrend}>
              <CartesianGrid strokeDasharray='3 3' stroke={d.isDark ? '#334155' : '#e2e8f0'} />
              <XAxis dataKey='day' tick={{ fontSize: 10, fill: d.isDark ? '#94a3b8' : '#64748b' }} interval={3} />
              <YAxis yAxisId='trend' hide tickFormatter={(v: number) => d.showNominal ? formatCompact(Math.abs(v)) : '•••'} domain={[-d.dailyTrendMaxAbs, d.dailyTrendMaxAbs]} />
              <YAxis yAxisId='left' domain={[0, d.dailyOutcomeMax]} tickFormatter={(v: number) => d.showNominal ? formatCompact(v) : '•••'} tick={{ fontSize: 10, fill: d.isDark ? '#fca5a5' : '#dc2626' }} />
              <YAxis yAxisId='right' orientation='right' domain={[0, d.dailyIncomeMax]} tickFormatter={(v: number) => d.showNominal ? formatCompact(v) : '•••'} tick={{ fontSize: 10, fill: d.isDark ? '#86efac' : '#059669' }} />
              <ReferenceLine yAxisId='trend' y={0} stroke={d.isDark ? '#64748b' : '#94a3b8'} strokeDasharray='4 4' />
              <Tooltip content={<DailyTrendTooltip isDark={d.isDark} showNominal={d.showNominal} />} cursor={d.chartTooltipCursor} />
              <Line type='monotone' yAxisId='trend' dataKey='incomeTrend' name='Income Trend' hide={!d.showDailyTrend} stroke='#10b981' strokeWidth={1.8} strokeDasharray='5 3' dot={false} activeDot={d.smallActiveDot} />
              <Line type='monotone' yAxisId='trend' dataKey='outcomeTrend' name='Outcome Trend' hide={!d.showDailyTrend} stroke='#ef4444' strokeWidth={1.8} strokeDasharray='5 3' dot={false} activeDot={d.smallActiveDot} />
              <Bar yAxisId='left' dataKey='outcome' name='Outcome' hide={!d.showDailyOutcome} fill='#ef4444' radius={[4, 4, 0, 0]} activeBar={d.mobileActiveBarStyle} />
              <Bar yAxisId='right' dataKey='income' name='Income' hide={!d.showDailyIncome} fill='#10b981' radius={[4, 4, 0, 0]} activeBar={d.mobileActiveBarStyle} />
            </ComposedChart>
          </ResponsiveContainer>

          <div className='mt-3 flex items-center justify-center gap-6 text-sm'>
            <button type='button' onClick={() => d.setShowDailyIncome((v) => !v)} className='flex items-center gap-2 text-slate-700 dark:text-slate-300'>
              <span className='inline-block w-3 h-3 rounded-sm bg-emerald-500' />
              <span className={d.showDailyIncome ? '' : 'line-through opacity-60'}>Income</span>
            </button>
            <button type='button' onClick={() => d.setShowDailyOutcome((v) => !v)} className='flex items-center gap-2 text-slate-700 dark:text-slate-300'>
              <span className='inline-block w-3 h-3 rounded-sm bg-red-500' />
              <span className={d.showDailyOutcome ? '' : 'line-through opacity-60'}>Outcome</span>
            </button>
            <button type='button' onClick={() => d.setShowDailyTrend((v) => !v)} className='flex items-center gap-2 text-slate-700 dark:text-slate-300'>
              <span className='inline-flex flex-col gap-1 w-4'>
                <span className='block w-4 border-t-2 border-dashed border-emerald-500' />
                <span className='block w-4 border-t-2 border-dashed border-red-500' />
              </span>
              <span className={d.showDailyTrend ? '' : 'line-through opacity-60'}>Trend</span>
            </button>
          </div>
        </ChartCard>
      </div>

      {/* Top 5 Expenses + Budget vs Actual */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <ChartCard title='Top 5 Expenses (Selected Month)'>
          {d.monthlyExpenseDrillMode !== 'top' && (
            <div className='mb-2 flex items-center justify-between'>
              <p className='text-xs text-slate-500 dark:text-slate-400'>
                {d.monthlyExpenseDrillMode === 'child' && d.selectedMonthlyParent
                  ? `Child categories of ${d.selectedMonthlyParent} (${d.val(d.selectedMonthlyParentAmount)})`
                  : 'Parent categories outside Top 5'}
              </p>
              <div className='flex items-center gap-3'>
                {d.monthlyExpenseDrillMode === 'child' && d.monthlyChildFromOther && (
                  <button type='button' onClick={() => { d.setMonthlyExpenseDrillMode('top'); d.setSelectedMonthlyParent(null); d.setMonthlyChildFromOther(false); }} className='text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline'>
                    Back to Top 5
                  </button>
                )}
                <button type='button' onClick={() => {
                  if (d.monthlyExpenseDrillMode === 'child') {
                    if (d.monthlyChildFromOther) { d.setMonthlyExpenseDrillMode('other'); } else { d.setMonthlyExpenseDrillMode('top'); }
                    d.setSelectedMonthlyParent(null); d.setMonthlyChildFromOther(false);
                    return;
                  }
                  d.setMonthlyExpenseDrillMode('top');
                }} className='text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline'>Back</button>
              </div>
            </div>
          )}
          <ResponsiveContainer width='100%' height={d.monthlyExpenseChartHeight}>
            <BarChart data={d.monthlyExpenseChartData} layout='vertical'>
              <CartesianGrid strokeDasharray='3 3' stroke={d.isDark ? '#334155' : '#e2e8f0'} />
              <XAxis type='number' domain={[0, 'dataMax']} tickFormatter={(v) => d.showNominal ? formatCompact(v) : '•••'} tick={{ fontSize: 11, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
              <YAxis dataKey='name' type='category' width={100} tick={{ fontSize: 11, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
              <Tooltip contentStyle={d.tooltipStyle} labelStyle={d.tooltipLabelStyle} itemStyle={d.tooltipItemStyle} formatter={d.currencyFormatter} cursor={d.chartTooltipCursor} />
              <Bar dataKey='amount' name='Amount' radius={[0, 4, 4, 0]} activeBar={d.mobileActiveBarStyle}>
                {d.monthlyExpenseChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} className={d.monthlyExpenseDrillMode !== 'child' && (entry.name !== 'Other' || d.monthlyOtherParentExpenses.length > 0) ? 'cursor-pointer' : ''}
                    onClick={() => {
                      if (d.monthlyExpenseDrillMode === 'child') return;
                      if (d.monthlyExpenseDrillMode === 'top') {
                        if (entry.name === 'Other') { if (d.monthlyOtherParentExpenses.length === 0) return; d.setMonthlyExpenseDrillMode('other'); return; }
                        d.setMonthlyChildFromOther(false);
                      } else { d.setMonthlyChildFromOther(true); }
                      d.setSelectedMonthlyParent(entry.name); d.setMonthlyExpenseDrillMode('child');
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title='Budget vs Actual (Selected Month)'>
          <ResponsiveContainer width='100%' height={340}>
            <BarChart data={d.budgetVsActualVisible} layout='vertical' barGap={2}>
              <CartesianGrid strokeDasharray='3 3' stroke={d.isDark ? '#334155' : '#e2e8f0'} />
              <XAxis type='number' tickFormatter={(v) => d.showNominal ? formatCompact(v) : '•••'} tick={{ fontSize: 11, fill: d.isDark ? '#94a3b8' : '#64748b' }} />
              <YAxis dataKey='rowKey' type='category' width={100} padding={d.isSingleBudgetVsActualRow ? { top: 80, bottom: 80 } : undefined} tick={budgetVsActualTick} />
              <Tooltip content={<TopExpenseTooltip isDark={d.isDark} showNominal={d.showNominal} />} cursor={d.chartTooltipCursor} />
              {d.hasBudgetSeriesValue && <Bar dataKey='budget' name='Budget' fill='#3b82f6' radius={[0, 4, 4, 0]} maxBarSize={d.isSingleBudgetVsActualRow ? 26 : undefined} activeBar={d.mobileActiveBarStyle} />}
              {d.hasActualSeriesValue && <Bar dataKey='actual' name='Actual' fill='#f59e0b' radius={[0, 4, 4, 0]} maxBarSize={d.isSingleBudgetVsActualRow ? 26 : undefined} activeBar={d.mobileActiveBarStyle} />}
            </BarChart>
          </ResponsiveContainer>

          <div className='mt-2 flex items-center justify-between gap-3 flex-wrap'>
            <div className='flex items-center gap-4 text-xs'>
              <span className='flex items-center gap-1 text-slate-600 dark:text-slate-300'><span className='inline-block w-3 h-3 rounded-sm bg-blue-500' />Budget</span>
              <span className='flex items-center gap-1 text-slate-600 dark:text-slate-300'><span className='inline-block w-3 h-3 rounded-sm bg-amber-500' />Actual</span>
            </div>
            <div className='flex items-center gap-2'>
              <button type='button' onClick={() => d.setBudgetVsActualPageRaw((v) => Math.max(0, v - 1))} disabled={d.budgetVsActualPage === 0} className='px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed' aria-label='Previous page'>
                <ChevronLeft size={16} />
              </button>
              <span className='text-xs text-slate-500 dark:text-slate-400 min-w-14 text-center'>{d.budgetVsActualPage + 1}/{d.budgetVsActualTotalPages}</span>
              <button type='button' onClick={() => d.setBudgetVsActualPageRaw((v) => Math.min(d.budgetVsActualTotalPages - 1, v + 1))} disabled={d.budgetVsActualPage >= d.budgetVsActualTotalPages - 1} className='px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed' aria-label='Next page'>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Recent Transactions + Budget Summary */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <ChartCard title='Recent Transactions (Selected Month)'>
          <div className='overflow-x-auto max-h-90 overflow-y-auto'>
            <table className='w-full text-sm'>
              <thead className='sticky top-0 bg-white dark:bg-slate-800'>
                <tr className='text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700'>
                  <th className='py-2 pr-2'>Date</th><th className='py-2 pr-2'>Description</th><th className='py-2 pr-2'>Category</th><th className='py-2 pr-2'>Wallet</th><th className='py-2 text-right'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {d.recentTransactions.map((tx) => (
                  <tr key={tx.id} className='border-b border-slate-100 dark:border-slate-700/50 last:border-b-0'>
                    <td className='py-2 pr-2 whitespace-nowrap text-slate-600 dark:text-slate-400'>{tx.date.slice(5)}</td>
                    <td className='py-2 pr-2 text-slate-800 dark:text-slate-200 truncate max-w-40'>{tx.description}</td>
                    <td className='py-2 pr-2 text-slate-500 dark:text-slate-400'>{tx.category?.name ?? '-'}</td>
                    <td className='py-2 pr-2 text-slate-500 dark:text-slate-400'>{tx.walletName}</td>
                    <td className={`py-2 text-right font-mono whitespace-nowrap ${tx.category?.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {d.showNominal ? formatCurrency(tx.amount) : HIDDEN_VALUE}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title='Budget Summary (Selected Month)'>
          <div className='overflow-x-auto max-h-90 overflow-y-auto'>
            <table className='w-full text-sm'>
              <thead className='sticky top-0 bg-white dark:bg-slate-800'>
                <tr className='text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700'>
                  <th className='py-2 pr-2'>Item</th><th className='py-2 pr-2'>Type</th><th className='py-2 text-right'>Amount</th>
                </tr>
              </thead>
              <tbody>
                {d.monthBudgets.map((b) => (
                  <tr key={b.id} className={`border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 ${b.isDone ? 'opacity-60' : ''}`}>
                    <td className='py-2 pr-2'>
                      <span className={`text-slate-800 dark:text-slate-200 ${b.isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>{b.name}</span>
                      {b.isDone && <span className='ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'>✓ Done</span>}
                    </td>
                    <td className='py-2 pr-2'>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${b.type === 'income' || b.type === 'carryover' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{b.type}</span>
                    </td>
                    <td className={`py-2 text-right font-mono ${b.isDone ? 'line-through text-slate-400 dark:text-slate-500' : b.type === 'income' || b.type === 'carryover' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {d.val(b.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className='flex items-center justify-between border-t-2 border-slate-300 dark:border-slate-600 mt-2 pt-2 font-bold'>
            <span className='text-slate-800 dark:text-slate-200'>Total Budget</span>
            <span className='font-mono text-emerald-700 dark:text-emerald-400'>{d.val(d.totalBudget)}</span>
          </div>
        </ChartCard>
      </div>
    </section>
  );
}
