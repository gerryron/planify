import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { categoryService } from '@/features/categories/services/categoryService';
import {
  Category,
  CategoryInput,
  CategoryType,
} from '@/features/categories/types/category';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { asyncToast } from '@/shared/utils/asyncHelper';

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
  const confirm = useConfirm();

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
    if (!await confirm({
      title: isUpdate ? 'Update this category?' : 'Add this category?',
      description: isUpdate ? 'Are you sure you want to update this category?' : 'Are you sure you want to add this category?',
      confirmLabel: isUpdate ? 'Update' : 'Add',
      variant: 'default',
    })) return;

    setLoading(true);
    setError(null);

    const result = await asyncToast(
      () => isUpdate && initial ? categoryService.update(initial.id, form) : categoryService.create(form),
      { success: isUpdate ? 'Category updated!' : 'Category added!', error: 'Failed to save category' }
    );
    if (result) {
      onSuccess();
      setForm(defaultForm);
    }
    setLoading(false);
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
        <div className='relative w-full rounded border border-input bg-transparent dark:bg-input/30 p-1 overflow-hidden'>
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
        <Label>Name</Label>
        <Input
          name='name'
          value={form.name}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              name: e.target.value,
            }))
          }
          placeholder='e.g. Food, Salary, Groceries'
          required
        />
      </div>

      <div>
        <Label>Parent Category</Label>
        <Select
          value={form.parentId?.toString() ?? ''}
          onValueChange={(value) =>
            setForm((prev) => ({
              ...prev,
              parentId: value === '' ? null : Number(value),
            }))
          }
          name='parentId'
        >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='No parent (root category)' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=''>No parent (root category)</SelectItem>
            {parentOptions.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <div className='text-red-500 text-sm'>{error}</div>}

      <Button
        type='submit'
        className='w-full'
        disabled={loading}
      >
        {initial ? 'Update' : 'Add'}
      </Button>
    </form>
  );
}
