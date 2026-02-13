import { useEffect, useState } from 'react';
import { monthlyBudgetService, Budget } from '@/services/monthlyBudgetService';

interface MonthlyBudgetListProps {
  onEdit: (budget: Budget) => void;
}

export default function MonthlyBudgetList({ onEdit }: MonthlyBudgetListProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await monthlyBudgetService.getAll();
      setBudgets(data);
    } catch {
      setError('Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    try {
      await monthlyBudgetService.remove(id);
      setBudgets(budgets.filter((b) => b.id !== id));
    } catch {
      alert('Failed to delete');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className='text-red-500'>{error}</div>;

  return (
    <div className='space-y-4'>
      {budgets.length === 0 && <div>No budgets found.</div>}
      {budgets.map((budget) => (
        <div
          key={budget.id}
          className='flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded shadow'
        >
          <div>
            <div className='font-bold'>{budget.name}</div>
            <div className='text-sm text-gray-500'>
              {budget.month} | {budget.category}
            </div>
            <div className='text-green-700 dark:text-green-300 font-mono'>
              Rp {budget.amount.toLocaleString()}
            </div>
          </div>
          <div className='flex gap-2'>
            <button
              className='px-2 py-1 bg-blue-500 text-white rounded'
              onClick={() => onEdit(budget)}
            >
              Edit
            </button>
            <button
              className='px-2 py-1 bg-red-500 text-white rounded'
              onClick={() => handleDelete(budget.id)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
