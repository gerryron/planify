import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  monthlyBudgetService,
  Budget,
} from '@/features/monthly-budget/services/monthlyBudgetService';
import { BudgetInput } from '@/features/monthly-budget/types/budget';

interface MonthlyBudgetFormProps {
  initial?: Budget | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const defaultForm: BudgetInput = {
  name: '',
  amount: 0,
  month: getCurrentMonth(),
  category: '',
  type: 'outcome',
};

export default function MonthlyBudgetForm({
  initial,
  onSuccess,
}: MonthlyBudgetFormProps) {
  const initialBudgetType: 'income' | 'outcome' =
    initial?.type === 'outcome' ? 'outcome' : 'income';

  const [form, setForm] = useState<BudgetInput>(
    initial
      ? {
          name: initial.name,
          amount: initial.amount,
          month: initial.month,
          category: initial.category,
          type: initial.type,
        }
      : defaultForm,
  );
  const [activeBudgetType, setActiveBudgetType] = useState<
    'income' | 'outcome'
  >(initialBudgetType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedAmount = useMemo(() => {
    if (!form.amount) return '';
    return `Rp ${Math.abs(form.amount).toLocaleString('id-ID')}`;
  }, [form.amount]);

  const handleBudgetTypeChange = (type: 'income' | 'outcome') => {
    setActiveBudgetType(type);
    setForm((prev) => ({
      ...prev,
      type,
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]:
        name === 'amount'
          ? value === ''
            ? 0
            : Number(value.replace(/[^\d]/g, ''))
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isUpdate = initial && initial.id;
    const confirmResult = await Swal.fire({
      title: isUpdate ? 'Update this budget?' : 'Add this budget?',
      text: isUpdate
        ? 'Are you sure you want to update this budget?'
        : 'Are you sure you want to add this budget?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: isUpdate ? 'Update' : 'Add',
      cancelButtonText: 'Cancel',
    });
    if (!confirmResult.isConfirmed) return;
    setLoading(true);
    setError(null);
    try {
      if (isUpdate) {
        await monthlyBudgetService.update(initial.id, form);
        await Swal.fire({
          icon: 'success',
          title: 'Budget updated!',
          showConfirmButton: false,
          timer: 1200,
        });
      } else {
        await monthlyBudgetService.create(form);
        await Swal.fire({
          icon: 'success',
          title: 'Budget added!',
          showConfirmButton: false,
          timer: 1200,
        });
      }
      onSuccess();
      setForm(defaultForm);
    } catch {
      setError('Failed to save budget');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-4 bg-white dark:bg-slate-800 p-4 rounded shadow'
    >
      <div>
        <div className='relative w-full rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 overflow-hidden mb-3'>
          <span
            className={
              'absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded transition-all duration-300 ease-out ' +
              (activeBudgetType === 'income'
                ? 'bg-emerald-500 '
                : 'bg-red-500 ') +
              (activeBudgetType === 'income'
                ? 'translate-x-0'
                : 'translate-x-full')
            }
            aria-hidden='true'
          />
          <div className='relative z-10 grid grid-cols-2'>
            <button
              type='button'
              onClick={() => handleBudgetTypeChange('income')}
              className={
                'rounded px-3 py-1.5 text-sm transition-colors duration-500 ' +
                (activeBudgetType === 'income'
                  ? 'text-white dark:text-slate-900'
                  : 'text-gray-700 dark:text-gray-200')
              }
            >
              Income
            </button>
            <button
              type='button'
              onClick={() => handleBudgetTypeChange('outcome')}
              className={
                'rounded px-3 py-1.5 text-sm transition-colors duration-500 ' +
                (activeBudgetType === 'outcome'
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-200')
              }
            >
              Outcome
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className='block font-medium'>Name</label>
        <input
          name='name'
          value={form.name}
          onChange={handleChange}
          placeholder='e.g. Groceries, Salary'
          className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>
      <div>
        <label className='block font-medium'>Amount</label>
        <input
          name='amount'
          type='text'
          inputMode='numeric'
          value={formattedAmount}
          onChange={handleChange}
          placeholder='e.g. 1000000'
          className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>
      <div>
        <label className='block font-medium'>Month</label>
        <input
          name='month'
          type='month'
          value={form.month}
          onChange={handleChange}
          placeholder='Select month'
          className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>
      <div>
        <label className='block font-medium'>Category</label>
        <input
          name='category'
          value={form.category}
          onChange={handleChange}
          placeholder='e.g. Food, Salary, Utilities'
          className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>
      {error && <div className='text-red-500'>{error}</div>}
      <div>
        <button
          type='submit'
          className='w-full px-4 py-2 bg-green-600 text-white rounded mt-2'
          disabled={loading}
        >
          {initial ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  );
}
