import { useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  walletService,
  Wallet,
} from '@/features/wallet/services/walletService';
import { WalletInput } from '@/features/wallet/types/wallet';

interface WalletFormProps {
  initial?: Wallet | null;
  onSuccess: () => void;
}

const defaultForm: WalletInput = {
  name: '',
  balance: 0,
  includeFromTotal: true,
};

export default function WalletForm({ initial, onSuccess }: WalletFormProps) {
  const [form, setForm] = useState<WalletInput>(
    initial
      ? {
          name: initial.name,
          balance: initial.balance,
          includeFromTotal: initial.includeFromTotal,
        }
      : defaultForm,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedBalance = useMemo(() => {
    return form.balance.toLocaleString('id-ID');
  }, [form.balance]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'balance'
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
        await walletService.update(initial.id, form);
        await Swal.fire({
          icon: 'success',
          title: 'Wallet updated!',
          showConfirmButton: false,
          timer: 1200,
        });
      } else {
        await walletService.create(form);
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

      <div className='flex items-center justify-between'>
        <span className='font-medium'>Include from total</span>
        <button
          type='button'
          role='switch'
          aria-checked={form.includeFromTotal}
          aria-label='Include from total'
          onClick={() =>
            setForm((prev) => ({
              ...prev,
              includeFromTotal: !prev.includeFromTotal,
            }))
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.includeFromTotal
              ? 'bg-emerald-600'
              : 'bg-gray-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              form.includeFromTotal ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
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
