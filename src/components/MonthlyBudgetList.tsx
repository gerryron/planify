import { useEffect, useState, useMemo, useRef } from 'react';
import { monthlyBudgetService, Budget } from '@/services/monthlyBudgetService';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Swal from 'sweetalert2';

interface MonthlyBudgetListProps {
  onEdit: (budget: Budget) => void;
  onAdd?: () => void;
}

type MonthFilter = string | 'future';

function shiftMonth(base: Date, offset: number) {
  const shifted = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function MonthlyBudgetList({
  onEdit,
  onAdd,
}: MonthlyBudgetListProps) {
  const monthPickerRef = useRef<HTMLInputElement>(null);
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<MonthFilter>(currentMonth);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Button group: 3 prev months, this month, future; month picker for other months
  const now = useMemo(() => new Date(), []);
  const prevMonths = useMemo(
    () => Array.from({ length: 3 }, (_, i) => shiftMonth(now, -4 + i + 1)),
    [now],
  );

  const fetchBudgets = async (monthFilter: MonthFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await monthlyBudgetService.getAll(monthFilter);
      setBudgets(data);
    } catch {
      setError('Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets(selectedMonth);
  }, [selectedMonth]);

  const total = useMemo(() => {
    return budgets.reduce((sum, budget) => {
      return budget.type === 'income'
        ? sum + budget.amount
        : sum - budget.amount;
    }, 0);
  }, [budgets]);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete budget?',
      text: 'Deleted data cannot be restored.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      await monthlyBudgetService.remove(id);
      setBudgets(budgets.filter((b) => b.id !== id));
      await Swal.fire({
        title: 'Success',
        text: 'Budget deleted successfully.',
        icon: 'success',
        timer: 1400,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire({
        title: 'Failed',
        text: 'Failed to delete budget.',
        icon: 'error',
      });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className='text-red-500'>{error}</div>;

  return (
    <div className='w-full'>
      <div className='flex items-center justify-between mb-4'>
        <div>
          <div className='text-lg font-semibold'>Total Transaction</div>
          <div
            className={`text-2xl font-bold ${
              total < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-700 dark:text-green-300'
            }`}
          >
            {total < 0 ? '- ' : ''}Rp {Math.abs(total).toLocaleString()}
          </div>
        </div>
        {onAdd && (
          <button
            className='px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition ml-4'
            onClick={onAdd}
          >
            + Add Budget
          </button>
        )}
      </div>
      <div className='mb-4 w-full flex flex-wrap gap-2 items-center'>
        {/* Button group */}
        {prevMonths.map((month) => (
          <button
            key={month}
            type='button'
            onClick={() => setSelectedMonth(month)}
            className={`rounded px-3 py-1.5 text-sm border transition ${
              selectedMonth === month
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
            }`}
          >
            {monthLabel(month)}
          </button>
        ))}
        {!prevMonths.includes(currentMonth) && (
          <button
            type='button'
            onClick={() => setSelectedMonth(currentMonth)}
            className={`rounded px-3 py-1.5 text-sm border transition ${
              selectedMonth === currentMonth
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
            }`}
          >
            This Month
          </button>
        )}
        <button
          type='button'
          onClick={() => setSelectedMonth('future')}
          className={`rounded px-3 py-1.5 text-sm border transition ${
            selectedMonth === 'future'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
              : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
          }`}
        >
          Future
        </button>
        {/* Dropdown for other months */}
        <div className='relative'>
          <button
            type='button'
            className={`rounded px-3 py-1.5 text-sm border transition flex items-center gap-2 ${
              selectedMonth &&
              selectedMonth !== 'future' &&
              selectedMonth !== currentMonth &&
              !prevMonths.includes(selectedMonth)
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100'
                : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
            }`}
            onClick={() => {
              const input = monthPickerRef.current;
              if (input) {
                if (typeof input.showPicker === 'function') {
                  input.showPicker();
                } else {
                  input.click();
                }
              }
            }}
          >
            Pick Another Month
          </button>
          <input
            ref={monthPickerRef}
            type='month'
            className='absolute left-0 top-0 opacity-0 w-0 h-0 pointer-events-none'
            tabIndex={-1}
            value={
              selectedMonth &&
              selectedMonth !== 'future' &&
              selectedMonth !== currentMonth &&
              !prevMonths.includes(selectedMonth)
                ? selectedMonth
                : ''
            }
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>
      <div className='bg-white dark:bg-slate-800 rounded-lg shadow p-6'>
        {budgets.length === 0 ? (
          <div>No budgets found.</div>
        ) : (
          <div className='space-y-4'>
            {budgets.map((budget) => (
              <div
                key={budget.id}
                className='flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-3 last:border-b-0 last:pb-0'
              >
                <div>
                  <div className='font-bold'>{budget.name}</div>
                  <div className='text-sm text-gray-500'>
                    {budget.month} | {budget.category}
                  </div>
                  <div
                    className={`font-mono ${
                      budget.type === 'outcome'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-700 dark:text-green-300'
                    }`}
                  >
                    {budget.type === 'outcome' ? '- ' : ''}Rp{' '}
                    {budget.amount.toLocaleString()}
                  </div>
                </div>
                <div className='relative group'>
                  <button
                    className='p-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
                    aria-label='Action'
                    type='button'
                  >
                    <MoreVertIcon fontSize='small' />
                  </button>
                  <div className='absolute right-0 top-10 z-10 hidden min-w-32 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md group-hover:block group-focus-within:block'>
                    <button
                      className='w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2'
                      onClick={() => onEdit(budget)}
                      type='button'
                    >
                      <EditIcon fontSize='small' />
                      Edit
                    </button>
                    <button
                      className='w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600 dark:text-red-400'
                      onClick={() => handleDelete(budget.id)}
                      type='button'
                    >
                      <DeleteIcon fontSize='small' />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
