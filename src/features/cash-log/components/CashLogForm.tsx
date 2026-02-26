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
};

export default function CashLogForm({
  initial,
  defaultWalletName,
  onSuccess,
}: CashLogFormProps) {
  const [form, setForm] = useState<CashLogInput>(
    initial
      ? {
          date: initial.date,
          description: initial.description,
          amount: initial.amount,
          walletName: initial.walletName,
        }
      : {
          ...defaultForm,
          walletName: defaultWalletName ?? '',
        },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<Wallets[]>([]);

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

  const formattedAmount = useMemo(() => {
    if (!form.amount) return '';
    return `Rp ${form.amount.toLocaleString('id-ID')}`;
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
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        await cashLogService.update(initial.id, form);
        await Swal.fire({
          icon: 'success',
          title: 'Transaction updated!',
          showConfirmButton: false,
          timer: 1200,
        });
      } else {
        await cashLogService.create(form);
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
      className='space-y-4 bg-white dark:bg-slate-800 p-4 rounded shadow'
    >
      <div>
        <label className='block font-medium'>Date</label>
        <input
          name='date'
          type='date'
          value={form.date}
          onChange={handleChange}
          className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>

      <div>
        <label className='block font-medium'>Description</label>
        <input
          name='description'
          value={form.description}
          onChange={handleChange}
          placeholder='e.g. Lunch, Fuel, Freelance'
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
          placeholder='e.g. 50000'
          className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>

      <div>
        <label className='block font-medium'>Wallet</label>
        <select
          name='walletName'
          value={form.walletName}
          onChange={handleChange}
          className='w-full p-2 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        >
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.name}>
              {wallet.name}
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
