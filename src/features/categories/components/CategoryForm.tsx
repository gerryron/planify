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
      className='space-y-4 bg-white dark:bg-slate-800 p-4 rounded shadow'
    >
      <div>
        <label className='block font-medium'>Name</label>
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
          className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>

      <div>
        <label className='block font-medium'>Type</label>
        <select
          name='type'
          value={form.type}
          onChange={(e) => handleTypeChange(e.target.value as CategoryType)}
          className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        >
          <option value='outcome'>Outcome</option>
          <option value='income'>Income</option>
        </select>
      </div>

      <div>
        <label className='block font-medium'>Parent Category</label>
        <select
          name='parentId'
          value={form.parentId ?? ''}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              parentId: e.target.value || null,
            }))
          }
          className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
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
          className='w-full px-4 py-2 bg-green-600 text-white rounded mt-2'
          disabled={loading}
        >
          {initial ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  );
}
