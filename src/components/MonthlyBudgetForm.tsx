import { useState } from 'react';
import { monthlyBudgetService, Budget } from '@/services/monthlyBudgetService';
import { BudgetInput } from '@/types/budget';

interface MonthlyBudgetFormProps {
  initial?: Budget | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

const defaultForm: BudgetInput = {
  name: '',
  amount: 0,
  month: '',
  category: '',
  type: 'outcome',
};

export default function MonthlyBudgetForm({
  initial,
  onSuccess,
  onCancel,
}: MonthlyBudgetFormProps) {
  const [form, setForm] = useState<BudgetInput>(
    initial ? { ...initial } : defaultForm,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === 'amount' ? (value === '' ? 0 : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (initial && initial.id) {
        await monthlyBudgetService.update(initial.id, form);
      } else {
        await monthlyBudgetService.create(form);
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
        <label className='block font-medium'>Name</label>
        <input
          name='name'
          value={form.name}
          onChange={handleChange}
          className='w-full p-2 border rounded'
          required
        />
      </div>
      <div>
        <label className='block font-medium'>Amount</label>
        <input
          name='amount'
          type='number'
          value={form.amount === 0 ? '' : form.amount}
          onChange={handleChange}
          className='w-full p-2 border rounded'
          required
          min={0}
        />
      </div>
      <div>
        <label className='block font-medium'>Month</label>
        <input
          name='month'
          type='month'
          value={form.month}
          onChange={handleChange}
          className='w-full p-2 border rounded'
          required
        />
      </div>
      <div>
        <label className='block font-medium'>Category</label>
        <input
          name='category'
          value={form.category}
          onChange={handleChange}
          className='w-full p-2 border rounded'
          required
        />
      </div>
      <div>
        <label className='block font-medium'>Type</label>
        <select
          name='type'
          value={form.type}
          onChange={handleChange}
          className='w-full p-2 border rounded'
          required
        >
          <option value='outcome'>Outcome</option>
          <option value='income'>Income</option>
        </select>
      </div>
      {error && <div className='text-red-500'>{error}</div>}
      <div className='flex gap-2'>
        <button
          type='submit'
          className='px-4 py-2 bg-green-600 text-white rounded'
          disabled={loading}
        >
          {initial ? 'Update' : 'Add'}
        </button>
        {onCancel && (
          <button
            type='button'
            className='px-4 py-2 bg-gray-400 text-white rounded'
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
