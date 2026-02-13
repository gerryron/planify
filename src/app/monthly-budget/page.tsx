'use client';
import { useState } from 'react';
import MonthlyBudgetList from '@/components/MonthlyBudgetList';
import MonthlyBudgetForm from '@/components/MonthlyBudgetForm';
import { Budget } from '@/services/monthlyBudgetService';

export default function MonthlyBudgetPage() {
  const [editing, setEditing] = useState<Budget | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = (budget: Budget) => setEditing(budget);
  const handleSuccess = () => {
    setEditing(null);
    setRefreshKey((k) => k + 1);
  };
  const handleCancel = () => setEditing(null);

  return (
    <div className='max-w-2xl mx-auto py-8 space-y-8'>
      <h1 className='text-2xl font-bold mb-4'>Monthly Budget</h1>
      <MonthlyBudgetForm
        key={editing ? editing.id : 'new'}
        initial={editing}
        onSuccess={handleSuccess}
        onCancel={editing ? handleCancel : undefined}
      />
      <MonthlyBudgetList key={refreshKey} onEdit={handleEdit} />
    </div>
  );
}
