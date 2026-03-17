import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  walletsService,
  Wallets,
} from '@/features/wallets/services/walletsService';
import { WalletsInput } from '@/features/wallets/types/wallets';
import { computeGoalProgress } from '@/features/wallets/utils/goalProgress';

interface WalletsFormProps {
  initial?: Wallets | null;
  onSuccess: () => void;
}

const defaultForm: WalletsInput = {
  name: '',
  balance: 0,
  excludeFromTotal: false,
  walletKind: 'basic',
  goalAmount: null,
  goalStartMonth: null,
  goalDueMonth: null,
};

export default function WalletsForm({ initial, onSuccess }: WalletsFormProps) {
  const [form, setForm] = useState<WalletsInput>(
    initial
      ? {
          name: initial.name,
          balance: initial.balance,
          excludeFromTotal: initial.excludeFromTotal,
          walletKind: initial.walletKind,
          goalAmount: initial.goalAmount,
          goalStartMonth: initial.goalStartMonth,
          goalDueMonth: initial.goalDueMonth,
        }
      : defaultForm,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedBalance = useMemo(() => {
    return form.balance.toLocaleString('id-ID');
  }, [form.balance]);

  const formattedGoalAmount = useMemo(() => {
    if (form.goalAmount === null) return '';
    return form.goalAmount.toLocaleString('id-ID');
  }, [form.goalAmount]);

  const goalSummary = useMemo(() => {
    if (form.walletKind !== 'goal') return null;
    return computeGoalProgress({
      balance: form.balance,
      goalAmount: form.goalAmount,
      goalStartMonth: form.goalStartMonth,
      goalDueMonth: form.goalDueMonth,
    });
  }, [
    form.balance,
    form.goalAmount,
    form.goalDueMonth,
    form.goalStartMonth,
    form.walletKind,
  ]);

  const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'balance'
          ? value === ''
            ? 0
            : Number(value.replace(/[^\d]/g, ''))
          : name === 'goalAmount'
            ? value === ''
              ? null
              : Number(value.replace(/[^\d]/g, ''))
            : value,
    }));
  };

  const handleKindChange = (walletKind: WalletsInput['walletKind']) => {
    if (initial?.walletKind) return;

    setForm((prev) => ({
      ...prev,
      walletKind,
      excludeFromTotal: walletKind === 'goal' ? true : prev.excludeFromTotal,
      goalAmount: walletKind === 'goal' ? prev.goalAmount : null,
      goalStartMonth: walletKind === 'goal' ? currentMonth : null,
      goalDueMonth: walletKind === 'goal' ? prev.goalDueMonth : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isUpdate = initial && initial.id;
    const confirmResult = await Swal.fire({
      title: isUpdate ? 'Update this wallet?' : 'Add this wallet?',
      text: isUpdate
        ? 'Are you sure you want to update this wallet?'
        : 'Are you sure you want to add this wallet?',
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
        await walletsService.update(initial.id, form);
        await Swal.fire({
          icon: 'success',
          title: 'Wallet updated!',
          showConfirmButton: false,
          timer: 1200,
        });
      } else {
        await walletsService.create(form);
        await Swal.fire({
          icon: 'success',
          title: 'Wallet added!',
          showConfirmButton: false,
          timer: 1200,
        });
      }

      onSuccess();
      setForm(defaultForm);
    } catch {
      setError('Failed to save wallet');
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
          placeholder='e.g. Cash, Bank, E-Wallet'
          className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>

      <div>
        <label className='block font-medium mb-2'>Wallet Type</label>
        <div className='inline-flex rounded-lg border border-gray-300 dark:border-slate-700 overflow-hidden w-full'>
          <button
            type='button'
            onClick={() => handleKindChange('basic')}
            disabled={Boolean(initial)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              form.walletKind === 'basic'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
            } ${initial ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            Basic Wallet
          </button>
          <button
            type='button'
            onClick={() => handleKindChange('goal')}
            disabled={Boolean(initial)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              form.walletKind === 'goal'
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200'
            } ${initial ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            Goal Wallet
          </button>
        </div>
        {initial && (
          <p className='text-xs mt-1 text-gray-500 dark:text-gray-400'>
            Wallet type cannot be changed after creation.
          </p>
        )}
      </div>

      <div>
        <label className='block font-medium'>Balance</label>
        <input
          name='balance'
          type='text'
          inputMode='numeric'
          value={formattedBalance}
          onChange={handleChange}
          placeholder='e.g. 1000000'
          className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>

      {form.walletKind === 'goal' && (
        <>
          <div>
            <label className='block font-medium'>Savings Goal</label>
            <input
              name='goalAmount'
              type='text'
              inputMode='numeric'
              value={formattedGoalAmount}
              onChange={handleChange}
              placeholder='e.g. 5000000'
              className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
              required
            />
          </div>

          <div>
            <label className='block font-medium'>Due Month</label>
            <input
              type='month'
              value={form.goalDueMonth ?? ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, goalDueMonth: e.target.value }))
              }
              className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
              required
            />
          </div>

          {goalSummary && form.goalAmount && form.goalDueMonth && (
            <div className='rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-slate-900/60 px-3 py-2 text-sm'>
              <p className='font-medium text-emerald-700 dark:text-emerald-300'>
                Required per month: Rp{' '}
                {goalSummary.requiredPerMonth.toLocaleString('id-ID')}
              </p>
              <p className='text-xs text-gray-600 dark:text-gray-300 mt-1'>
                Status: {goalSummary.status.replace('-', ' ')} • Months left:{' '}
                {goalSummary.monthsLeft}
              </p>
            </div>
          )}
        </>
      )}

      {form.walletKind === 'basic' && (
        <div className='flex items-center justify-between'>
          <span className='font-medium'>Exclude from total</span>
          <button
            type='button'
            role='switch'
            aria-checked={form.excludeFromTotal}
            aria-label='Exclude from total'
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                excludeFromTotal: !prev.excludeFromTotal,
              }))
            }
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.excludeFromTotal
                ? 'bg-emerald-600'
                : 'bg-gray-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.excludeFromTotal ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      )}

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
