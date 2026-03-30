'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import MonthlyBudgetList from '@/features/monthly-budget/components/MonthlyBudgetList';
import MonthlyBudgetForm from '@/features/monthly-budget/components/MonthlyBudgetForm';
import { Budget } from '@/features/monthly-budget/services/monthlyBudgetService';

export default function MonthlyBudgetPage() {
  const [editing, setEditing] = useState<Budget | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const canUsePortal = typeof document !== 'undefined';

  const handleEdit = (budget: Budget) => {
    setEditing(budget);
    setShowForm(true);
  };
  const handleAdd = () => {
    setEditing(null);
    setShowForm(true);
  };
  const handleSuccess = () => {
    setEditing(null);
    setShowForm(false);
    setRefreshKey((k) => k + 1);
  };
  const handleCancel = () => {
    setEditing(null);
    setShowForm(false);
  };

  return (
    <div className='max-w-2xl mx-auto pt-0 pb-8 space-y-8'>
      <MonthlyBudgetList
        key={refreshKey}
        onEdit={handleEdit}
        onAdd={handleAdd}
        stickyHeader
      />

      {canUsePortal &&
        showForm &&
        createPortal(
          <div
            className='fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-4'
            onClick={handleCancel}
          >
            <div
              className='bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-[calc(100vw-1.5rem)] sm:min-w-[320px] sm:max-w-md relative'
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className='absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:text-slate-300 dark:hover:text-white text-2xl font-bold'
                onClick={handleCancel}
                aria-label='Close dialog'
              >
                ×
              </button>
              <MonthlyBudgetForm
                key={editing ? editing.id : 'new'}
                initial={editing}
                onSuccess={handleSuccess}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
