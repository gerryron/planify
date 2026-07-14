import { formatCurrency } from '../utils/dashboardCharts';
import { HIDDEN_VALUE } from './TopExpenseTooltip';

interface DailyTrendTooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number | string;
    name?: string;
    payload?: { fullDate?: string };
  }>;
  isDark: boolean;
  showNominal: boolean;
}

export default function DailyTrendTooltip({ active, payload, isDark, showNominal }: DailyTrendTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const dateLabel = payload[0]?.payload?.fullDate ?? '';
  const incomeRaw = payload.find((item) => item.name === 'Income')?.value ?? 0;
  const outcomeRaw = payload.find((item) => item.name === 'Outcome')?.value ?? 0;
  const incomeValue = Number(incomeRaw);
  const outcomeValue = Math.abs(Number(outcomeRaw));

  return (
    <div
      className={`rounded-lg border px-3 py-2 shadow-md ${
        isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
      }`}
    >
      <div className='font-semibold'>{dateLabel}</div>
      <div className={isDark ? 'text-slate-200' : 'text-slate-700'}>
        Income : {showNominal ? formatCurrency(incomeValue) : HIDDEN_VALUE}
      </div>
      <div className={isDark ? 'text-slate-200' : 'text-slate-700'}>
        Outcome : {showNominal ? formatCurrency(outcomeValue) : HIDDEN_VALUE}
      </div>
    </div>
  );
}
