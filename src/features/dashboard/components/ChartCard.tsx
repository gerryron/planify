import React from 'react';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
}

export default function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className='rounded-xl border border-slate-200 dark:border-slate-700 bg-card p-5 shadow-sm'>
      <h3 className='text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4'>
        {title}
      </h3>
      {children}
    </div>
  );
}
