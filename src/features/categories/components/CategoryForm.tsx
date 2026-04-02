import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import { categoryService } from '@/features/categories/services/categoryService';
import {
  Category,
  CategoryInput,
  CategoryType,
} from '@/features/categories/types/category';

interface CategoryFormProps {
  initial?: Category | null;
  categories: Category[];
  onSuccess: () => void;
}

const defaultForm: CategoryInput = {
  name: '',
  type: 'outcome',
  parentId: null,
};

export default function CategoryForm({
  initial,
  categories,
  onSuccess,
}: CategoryFormProps) {
  const [form, setForm] = useState<CategoryInput>(
    initial
      ? {
          name: initial.name,
          type: initial.type,
          parentId: initial.parentId ?? null,
        }
      : defaultForm,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentOptions = useMemo(() => {
    return categories
      .filter((category) => category.type === form.type)
      .filter((category) => category.parentId === null)
      .filter((category) => !initial || category.id !== initial.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, form.type, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isUpdate = Boolean(initial?.id);
    const confirmResult = await Swal.fire({
      title: isUpdate ? 'Update this category?' : 'Add this category?',
      text: isUpdate
        ? 'Are you sure you want to update this category?'
        : 'Are you sure you want to add this category?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: isUpdate ? 'Update' : 'Add',
      cancelButtonText: 'Cancel',
    });

    if (!confirmResult.isConfirmed) return;

    setLoading(true);
    setError(null);

    try {
      if (isUpdate && initial) {
        await categoryService.update(initial.id, form);
        await Swal.fire({
          icon: 'success',
          title: 'Category updated!',
          showConfirmButton: false,
          timer: 1200,
        });
      } else {
        await categoryService.create(form);
        await Swal.fire({
          icon: 'success',
          title: 'Category added!',
          showConfirmButton: false,
          timer: 1200,
        });
      }

      onSuccess();
      setForm(defaultForm);
    } catch {
      setError('Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (nextType: CategoryType) => {
    setForm((prev) => ({
      ...prev,
      type: nextType,
      parentId: null,
    }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-4 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded shadow'
    >
      <div>
        <div className='relative w-full rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 overflow-hidden'>
          <span
            className={
              'absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded transition-all duration-300 ease-out ' +
              (form.type === 'income' ? 'bg-emerald-500 ' : 'bg-red-500 ') +
              (form.type === 'income' ? 'translate-x-0' : 'translate-x-full')
            }
            aria-hidden='true'
          />
          <div className='relative z-10 grid grid-cols-2'>
            <button
              type='button'
              onClick={() => handleTypeChange('income')}
              className={
                'rounded px-3 py-2.5 text-sm transition-colors duration-500 ' +
                (form.type === 'income'
                  ? 'text-white dark:text-slate-900'
                  : 'text-gray-700 dark:text-gray-200')
              }
            >
              Income
            </button>
            <button
              type='button'
              onClick={() => handleTypeChange('outcome')}
              className={
                'rounded px-3 py-2.5 text-sm transition-colors duration-500 ' +
                (form.type === 'outcome'
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
        <label className='block text-sm font-medium'>Name</label>
        <input
          name='name'
          value={form.name}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              name: e.target.value,
            }))
          }
          placeholder='e.g. Food, Salary, Groceries'
          className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>

      <div>
        <label className='block text-sm font-medium'>Parent Category</label>
        <select
          name='parentId'
          value={form.parentId ?? ''}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              parentId: e.target.value === '' ? null : Number(e.target.value),
            }))
          }
          className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
        >
          <option value=''>No parent (root category)</option>
          {parentOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {error && <div className='text-red-500'>{error}</div>}

      <div>
        <button
          type='submit'
          className='w-full px-4 py-2.5 bg-green-600 text-white rounded mt-2 min-h-11'
          disabled={loading}
        >
          {initial ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  );
}
