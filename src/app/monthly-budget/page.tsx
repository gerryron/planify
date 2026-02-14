'use client';
import { useState } from 'react';
import MonthlyBudgetList from '@/components/MonthlyBudgetList';
import MonthlyBudgetForm from '@/components/MonthlyBudgetForm';
import { Budget } from '@/services/monthlyBudgetService';

export default function MonthlyBudgetPage() {
  const [editing, setEditing] = useState<Budget | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);

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
    <div className='max-w-2xl mx-auto py-8 space-y-8'>
      <h1 className='text-2xl font-bold mb-4'>Monthly Budget</h1>
      <MonthlyBudgetList
        key={refreshKey}
        onEdit={handleEdit}
        onAdd={handleAdd}
      />
      {showForm && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 min-w-[320px] max-w-md w-full relative'>
            <button
              className='absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-white text-2xl font-bold'
              onClick={handleCancel}
              aria-label='Tutup'
            >
              ×
            </button>
            <MonthlyBudgetForm
              key={editing ? editing.id : 'new'}
              initial={editing}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
