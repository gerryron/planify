import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  cashLogService,
  CashLog,
} from '@/features/cash-log/services/cashLogService';
import { CashLogInput } from '@/features/cash-log/types/cashLog';
import {
  walletsService,
  Wallets,
} from '@/features/wallets/services/walletsService';
import { categoryService } from '@/features/categories/services/categoryService';
import { Category } from '@/features/categories/types/category';

interface CashLogFormProps {
  initial?: CashLog | null;
  defaultWalletName?: string | null;
  onSuccess: () => void;
}

function getCurrentDate() {
  return new Date().toISOString().slice(0, 10);
}

const defaultForm: CashLogInput = {
  date: getCurrentDate(),
  description: '',
  amount: 0,
  walletName: '',
  categoryId: 0,
  excludeFromReport: false,
};

export default function CashLogForm({
  initial,
  defaultWalletName,
  onSuccess,
}: CashLogFormProps) {
  const initialCategoryType = initial?.category?.type ?? 'outcome';
  const [form, setForm] = useState<CashLogInput>(
    initial
      ? {
          date: initial.date,
          description: initial.description,
          amount: Math.abs(initial.amount),
          walletName: initial.walletName,
          categoryId: initial.categoryId,
          excludeFromReport: initial.excludeFromReport,
        }
      : {
          ...defaultForm,
          walletName: defaultWalletName ?? '',
        },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallets[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryType, setActiveCategoryType] = useState<
    'income' | 'outcome'
  >(initialCategoryType);

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const data = await walletsService.getAll();
        setWallets(data);
        setForm((prev) => {
          if (prev.walletName) return prev;

          const preferredWallet = defaultWalletName
            ? data.find((wallet) => wallet.name === defaultWalletName)
            : null;

          return {
            ...prev,
            walletName: preferredWallet?.name ?? data[0]?.name ?? '',
          };
        });
      } catch {}
    };

    fetchWallets();
  }, [defaultWalletName]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getAll();
        setCategories(data);
        setForm((prev) => {
          const selectedCategory = data.find(
            (category) => category.id === prev.categoryId,
          );

          if (selectedCategory) {
            setActiveCategoryType(selectedCategory.type);
            return prev;
          }

          const defaultByType = data
            .filter((category) => category.type === initialCategoryType)
            .sort((a, b) => a.name.localeCompare(b.name))[0];

          const fallbackCategory =
            defaultByType ??
            [...data].sort((a, b) => a.name.localeCompare(b.name))[0];

          if (fallbackCategory) {
            setActiveCategoryType(fallbackCategory.type);
          }

          return {
            ...prev,
            categoryId: fallbackCategory?.id ?? 0,
          };
        });
      } catch {}
    };

    fetchCategories();
  }, [initialCategoryType]);

  const categoriesByType = useMemo(() => {
    const buildByType = (type: 'income' | 'outcome') => {
      const categoriesOfType = categories.filter(
        (category) => category.type === type,
      );
      const parents = categoriesOfType
        .filter((category) => category.parentId === null)
        .sort((a, b) => a.name.localeCompare(b.name));

      return parents.flatMap((parent) => {
        const children = categoriesOfType
          .filter((category) => category.parentId === parent.id)
          .sort((a, b) => a.name.localeCompare(b.name));

        return [parent, ...children];
      });
    };

    const income = buildByType('income');
    const outcome = buildByType('outcome');

    return { income, outcome };
  }, [categories]);

  const groupedWallets = useMemo(() => {
    const included = wallets.filter((wallet) => !wallet.excludeFromTotal);
    const excluded = wallets.filter((wallet) => wallet.excludeFromTotal);

    return { included, excluded };
  }, [wallets]);

  const activeCategories =
    activeCategoryType === 'income'
      ? categoriesByType.income
      : categoriesByType.outcome;

  const handleCategoryTypeChange = (type: 'income' | 'outcome') => {
    setActiveCategoryType(type);
    const firstCategory =
      type === 'income'
        ? categoriesByType.income[0]
        : categoriesByType.outcome[0];

    setForm((prev) => ({
      ...prev,
      categoryId: firstCategory?.id ?? 0,
    }));
  };

  const formattedAmount = useMemo(() => {
    if (!form.amount) return '';
    return `Rp ${Math.abs(form.amount).toLocaleString('id-ID')}`;
  }, [form.amount]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'amount'
          ? value === ''
            ? 0
            : Number(value.replace(/[^\d]/g, ''))
          : name === 'categoryId'
            ? Number(value)
            : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedAmount = Math.abs(form.amount);

    const payload: CashLogInput = {
      ...form,
      amount: normalizedAmount,
    };

    const isUpdate = initial && initial.id;
    const confirmResult = await Swal.fire({
      title: isUpdate ? 'Update this transaction?' : 'Add this transaction?',
      text: isUpdate
        ? 'Are you sure you want to update this entry?'
        : 'Are you sure you want to add this entry?',
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
        await cashLogService.update(initial.id, payload);
        await Swal.fire({
          icon: 'success',
          title: 'Transaction updated!',
          showConfirmButton: false,
          timer: 1200,
        });
      } else {
        await cashLogService.create(payload);
        await Swal.fire({
          icon: 'success',
          title: 'Transaction added!',
          showConfirmButton: false,
          timer: 1200,
        });
      }

      onSuccess();
      setForm(defaultForm);
    } catch {
      setError('Failed to save cash log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-4 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded shadow'
    >
      <div>
        <div className='relative w-full rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 overflow-hidden mb-3'>
          <span
            className={
              'absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded transition-all duration-300 ease-out ' +
              (activeCategoryType === 'income'
                ? 'bg-emerald-500 '
                : 'bg-red-500 ') +
              (activeCategoryType === 'income'
                ? 'translate-x-0'
                : 'translate-x-full')
            }
            aria-hidden='true'
          />
          <div className='relative z-10 grid grid-cols-2'>
            <button
              type='button'
              onClick={() => handleCategoryTypeChange('income')}
              className={
                'rounded px-3 py-2.5 text-sm transition-colors duration-500 ' +
                (activeCategoryType === 'income'
                  ? 'text-white dark:text-slate-900'
                  : 'text-gray-700 dark:text-gray-200')
              }
            >
              Income
            </button>
            <button
              type='button'
              onClick={() => handleCategoryTypeChange('outcome')}
              className={
                'rounded px-3 py-2.5 text-sm transition-colors duration-500 ' +
                (activeCategoryType === 'outcome'
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
        <label className='block text-sm font-medium'>Wallet</label>
        <select
          name='walletName'
          value={form.walletName}
          onChange={handleChange}
          className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        >
          {groupedWallets.included.length > 0 && (
            <optgroup label='Included from total'>
              {groupedWallets.included.map((wallet) => (
                <option key={wallet.id} value={wallet.name}>
                  {wallet.name}
                  {wallet.walletKind === 'credit_card' ? ' - Credit Card' : ''}
                </option>
              ))}
            </optgroup>
          )}
          {groupedWallets.excluded.length > 0 && (
            <optgroup label='Excluded from total'>
              {groupedWallets.excluded.map((wallet) => (
                <option key={wallet.id} value={wallet.name}>
                  {wallet.name}
                  {wallet.walletKind === 'credit_card' ? ' - Credit Card' : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div>
        <label className='block text-sm font-medium'>Category</label>
        <select
          name='categoryId'
          value={form.categoryId}
          onChange={handleChange}
          className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        >
          <option value='' disabled>
            Select category
          </option>
          {activeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.parentId ? `— ${category.name}` : category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className='block text-sm font-medium'>Transaction Date</label>
        <input
          name='date'
          type='date'
          value={form.date}
          onChange={handleChange}
          className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>

      <div>
        <label className='block text-sm font-medium'>Amount</label>
        <input
          name='amount'
          type='text'
          inputMode='numeric'
          value={formattedAmount}
          onChange={handleChange}
          placeholder='e.g. 50000'
          className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>

      <div>
        <label className='block text-sm font-medium'>Description</label>
        <input
          name='description'
          value={form.description}
          onChange={handleChange}
          placeholder='Optional: e.g. Lunch, Fuel, Freelance'
          className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
        />
      </div>

      <div className='flex items-center justify-between gap-3'>
        <span className='text-sm font-medium'>Exclude from report</span>
        <button
          type='button'
          role='switch'
          aria-checked={form.excludeFromReport}
          aria-label='Exclude from report'
          onClick={() =>
            setForm((prev) => ({
              ...prev,
              excludeFromReport: !prev.excludeFromReport,
            }))
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.excludeFromReport
              ? 'bg-emerald-600'
              : 'bg-gray-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              form.excludeFromReport ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
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
