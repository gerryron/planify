import React from 'react';

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'emerald' | 'green' | 'red' | 'blue';
  highlight?: boolean;
}

const colorMap = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    value: 'text-emerald-700 dark:text-emerald-300',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    value: 'text-green-700 dark:text-green-300',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    value: 'text-red-700 dark:text-red-300',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    value: 'text-blue-700 dark:text-blue-300',
  },
} as const;

export default function SummaryCard({ icon, label, value, color, highlight }: SummaryCardProps) {
  const c = colorMap[color];

  return (
    <div
      className={`h-full min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 sm:p-4 shadow-sm flex flex-col justify-between ${
        highlight ? 'ring-2 ring-emerald-400/40 dark:ring-emerald-500/30' : ''
      }`}
    >
      <div className='flex items-start gap-2 sm:gap-3 min-w-0'>
        <div className={`p-1.5 sm:p-2 rounded-lg ${c.bg}`}>
          <span className={c.icon}>{icon}</span>
        </div>
        <span className='min-w-0 text-[10px] sm:text-xs leading-tight font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide wrap-break-word'>
          {label}
        </span>
      </div>
      <div className={`mt-2 min-w-0 text-sm sm:text-lg leading-snug font-bold font-mono ${c.value} wrap-break-word`}>
        {value}
      </div>
    </div>
  );
}
