import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  walletsService,
  Wallets,
} from '@/features/wallets/services/walletsService';
import { WalletsInput } from '@/features/wallets/types/wallets';
import { computeGoalProgress } from '@/features/wallets/utils/goalProgress';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import { asyncToast } from '@/shared/utils/asyncHelper';

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
  creditLimit: null,
  statementDay: null,
  dueDay: null,
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
          creditLimit: initial.creditLimit,
          statementDay: initial.statementDay,
          dueDay: initial.dueDay,
        }
      : defaultForm,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();

  const formattedBalance = useMemo(() => {
    return `Rp ${form.balance.toLocaleString('id-ID')}`;
  }, [form.balance]);

  const formattedGoalAmount = useMemo(() => {
    if (form.goalAmount === null) return '';
    return `Rp ${form.goalAmount.toLocaleString('id-ID')}`;
  }, [form.goalAmount]);

  const formattedCreditLimit = useMemo(() => {
    if (form.creditLimit === null) return '';
    return `Rp ${form.creditLimit.toLocaleString('id-ID')}`;
  }, [form.creditLimit]);

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

  const showFieldInfo = (
    field: 'outstanding' | 'statementDay' | 'dueDay',
  ) => {
    if (field === 'outstanding') {
      toast.info('The total unpaid credit card bill at the moment. This value cannot exceed the credit limit.');
      return;
    }

    if (field === 'statementDay') {
      toast.info('The monthly billing statement date. Example: 20 means the statement is generated every month on the 20th.');
      return;
    }

    toast.info('The payment due date. If the due day is earlier than the statement day (for example, 20 then 7), the due date is in the following month.');
  };

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
            : name === 'creditLimit'
              ? value === ''
                ? null
                : Number(value.replace(/[^\d]/g, ''))
              : name === 'statementDay' || name === 'dueDay'
                ? value === ''
                  ? null
                  : Number(value)
                : value,
    }));
  };

  const handleKindChange = (walletKind: WalletsInput['walletKind']) => {
    if (initial?.walletKind) return;

    setForm((prev) => ({
      ...prev,
      walletKind,
      excludeFromTotal:
        walletKind === 'goal' || walletKind === 'credit_card'
          ? true
          : prev.excludeFromTotal,
      goalAmount: walletKind === 'goal' ? prev.goalAmount : null,
      goalStartMonth: walletKind === 'goal' ? currentMonth : null,
      goalDueMonth: walletKind === 'goal' ? prev.goalDueMonth : null,
      creditLimit: walletKind === 'credit_card' ? prev.creditLimit : null,
      statementDay: walletKind === 'credit_card' ? prev.statementDay : null,
      dueDay: walletKind === 'credit_card' ? prev.dueDay : null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isUpdate = initial && initial.id;
    if (!await confirm({
      title: isUpdate ? 'Update this wallet?' : 'Add this wallet?',
      description: isUpdate ? 'Are you sure you want to update this wallet?' : 'Are you sure you want to add this wallet?',
      confirmLabel: isUpdate ? 'Update' : 'Add',
      variant: 'default',
    })) return;

    setLoading(true);
    setError(null);

    const result = await asyncToast(
      () => isUpdate ? walletsService.update(initial.id, form) : walletsService.create(form),
      { success: isUpdate ? 'Wallet updated!' : 'Wallet added!', error: 'Failed to save wallet' }
    );
    if (result) {
      onSuccess();
      setForm(defaultForm);
    }
    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-4 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded shadow'
    >
      <div>
        <div className='relative inline-flex rounded-lg border border-gray-300 dark:border-slate-700 overflow-hidden w-full p-1 bg-gray-100 dark:bg-slate-900'>
          <span
            aria-hidden='true'
            className={`absolute top-1 bottom-1 w-[calc(33.333%-0.25rem)] rounded-md bg-emerald-600 shadow-sm transition-transform duration-300 ease-out ${
              form.walletKind === 'basic'
                ? 'translate-x-0'
                : form.walletKind === 'goal'
                  ? 'translate-x-full'
                  : 'translate-x-[200%]'
            }`}
          />
          <button
            type='button'
            onClick={() => handleKindChange('basic')}
            disabled={Boolean(initial)}
            className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition-colors duration-300 ${
              form.walletKind === 'basic'
                ? 'text-white'
                : 'text-slate-700 dark:text-slate-200'
            } ${initial ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            Basic Wallet
          </button>
          <button
            type='button'
            onClick={() => handleKindChange('goal')}
            disabled={Boolean(initial)}
            className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition-colors duration-300 ${
              form.walletKind === 'goal'
                ? 'text-white'
                : 'text-slate-700 dark:text-slate-200'
            } ${initial ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            Goal Wallet
          </button>
          <button
            type='button'
            onClick={() => handleKindChange('credit_card')}
            disabled={Boolean(initial)}
            className={`relative z-10 flex-1 py-2.5 text-sm font-medium transition-colors duration-300 ${
              form.walletKind === 'credit_card'
                ? 'text-white'
                : 'text-slate-700 dark:text-slate-200'
            } ${initial ? 'cursor-not-allowed opacity-80' : ''}`}
          >
            Credit Card
          </button>
        </div>
        {initial && (
          <p className='text-xs mt-1 text-gray-500 dark:text-gray-400'>
            Wallet type cannot be changed after creation.
          </p>
        )}
      </div>

      <div>
        <Label className='mb-1.5'>Name</Label>
        <Input
          name='name'
          value={form.name}
          onChange={handleChange}
          placeholder='e.g. Cash, Bank, E-Wallet'
          required
        />
      </div>

      <div>
        <div className='mb-1.5 flex items-center gap-2.5'>
          <Label>
            {form.walletKind === 'credit_card'
              ? 'Outstanding Balance'
              : 'Balance'}
          </Label>
          {form.walletKind === 'credit_card' && (
            <button
              type='button'
              onClick={() => showFieldInfo('outstanding')}
              aria-label='Outstanding balance information'
              className='inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700'
            >
              i
            </button>
          )}
        </div>
        <Input
          name='balance'
          type='text'
          inputMode='numeric'
          value={formattedBalance}
          onChange={handleChange}
          placeholder='e.g. 1000000'
          required
        />
      </div>

      <div
        className={`transition-all duration-300 ease-out overflow-hidden ${
          form.walletKind === 'credit_card'
            ? 'max-h-96 opacity-100 translate-y-0'
            : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
        }`}
      >
        <div className='space-y-4 pb-1'>
          <div>
            <Label className='mb-1.5'>Credit Limit</Label>
            <Input
              name='creditLimit'
              type='text'
              inputMode='numeric'
              value={formattedCreditLimit}
              onChange={handleChange}
              placeholder='e.g. 15000000'
              required={form.walletKind === 'credit_card'}
            />
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div>
              <div className='mb-1.5 flex items-center gap-2.5'>
                <Label>Statement Day</Label>
                <button
                  type='button'
                  onClick={() => showFieldInfo('statementDay')}
                  aria-label='Statement day information'
                  className='inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700'
                >
                  i
                </button>
              </div>
              <Input
                name='statementDay'
                type='number'
                min={1}
                max={31}
                value={form.statementDay ?? ''}
                onChange={handleChange}
                required={form.walletKind === 'credit_card'}
              />
            </div>

            <div>
              <div className='mb-1.5 flex items-center gap-2.5'>
                <Label>Due Day</Label>
                <button
                  type='button'
                  onClick={() => showFieldInfo('dueDay')}
                  aria-label='Due day information'
                  className='inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700'
                >
                  i
                </button>
              </div>
              <Input
                name='dueDay'
                type='number'
                min={1}
                max={31}
                value={form.dueDay ?? ''}
                onChange={handleChange}
                required={form.walletKind === 'credit_card'}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-out overflow-hidden ${
          form.walletKind === 'goal'
            ? 'max-h-112 opacity-100 translate-y-0'
            : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
        }`}
      >
        <div className='space-y-4 pb-1'>
          <div>
            <Label className='mb-1.5'>Savings Goal</Label>
            <Input
              name='goalAmount'
              type='text'
              inputMode='numeric'
              value={formattedGoalAmount}
              onChange={handleChange}
              placeholder='e.g. 5000000'
              required={form.walletKind === 'goal'}
            />
          </div>

          <div>
            <Label className='mb-1.5'>Due Month</Label>
            <Input
              type='month'
              value={form.goalDueMonth ?? ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, goalDueMonth: e.target.value }))
              }
              required={form.walletKind === 'goal'}
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
        </div>
      </div>

      <div
        className={`transition-all duration-300 ease-out overflow-hidden ${
          form.walletKind === 'basic'
            ? 'max-h-24 opacity-100 translate-y-0'
            : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
        }`}
      >
        <div className='flex items-center justify-between pb-1'>
          <span className='text-sm font-medium'>Exclude from total</span>
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
      </div>

      {error && <div className='text-red-500'>{error}</div>}

      <div>
        <Button
          type='submit'
          variant='default'
          className='w-full bg-emerald-600 mt-2'
          disabled={loading}
        >
          {initial ? 'Update' : 'Add'}
        </Button>
      </div>
    </form>
  );
}
