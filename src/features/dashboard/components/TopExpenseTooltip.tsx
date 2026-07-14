import { formatCurrency } from '../utils/dashboardCharts';

export const HIDDEN_VALUE = '••••••';

interface TopExpenseTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    payload?: { category?: string };
  }>;
  label?: string;
  isDark: boolean;
  showNominal: boolean;
}

export default function TopExpenseTooltip({ active, payload, label, isDark, showNominal }: TopExpenseTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const budgetValue = Number(payload.find((item) => item.name === 'Budget')?.value ?? 0);
  const actualValue = Number(payload.find((item) => item.name === 'Actual')?.value ?? 0);
  const categoryLabel = payload[0]?.payload?.category ?? label ?? 'Category';

  return (
    <div
      className={`rounded-lg border px-3 py-2 shadow-md ${
        isDark ? 'bg-slate-800 border-slate-600 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
      }`}
    >
      <div className='font-semibold'>{categoryLabel}</div>
      <div className={isDark ? 'text-slate-200' : 'text-slate-700'}>
        Budget : {showNominal ? formatCurrency(budgetValue) : HIDDEN_VALUE}
      </div>
      <div className={isDark ? 'text-slate-200' : 'text-slate-700'}>
        Actual : {showNominal ? formatCurrency(actualValue) : HIDDEN_VALUE}
      </div>
    </div>
  );
}
