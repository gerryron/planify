import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  walletsService,
  WalletTransferInput,
  Wallets,
} from '@/features/wallets/services/walletsService';
import { computeGoalProgress } from '@/features/wallets/utils/goalProgress';

interface WalletTransferFormProps {
  initialFromWalletId?: number;
  onSuccess: () => void;
}

type FeePayer = 'sender' | 'receiver';

type TransferFormState = {
  fromWalletId: number;
  toWalletId: number;
  amount: number;
  date: string;
  transferNote: string;
  enableFee: boolean;
  feeAmount: number;
  feePayer: FeePayer;
  feeNote: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const initialState: TransferFormState = {
  fromWalletId: 0,
  toWalletId: 0,
  amount: 0,
  date: todayIsoDate(),
  transferNote: '',
  enableFee: false,
  feeAmount: 0,
  feePayer: 'sender',
  feeNote: '',
};

export default function WalletTransferForm({
  initialFromWalletId,
  onSuccess,
}: WalletTransferFormProps) {
  const [wallets, setWallets] = useState<Wallets[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TransferFormState>(initialState);

  useEffect(() => {
    const loadWallets = async () => {
      setLoadingWallets(true);
      setError(null);
      try {
        const data = await walletsService.getAll();
        setWallets(data);

        const fallbackFromId = initialFromWalletId ?? data[0]?.id ?? 0;
        const fallbackToId =
          data.find((wallet) => wallet.id !== fallbackFromId)?.id ?? 0;

        setForm((prev) => ({
          ...prev,
          fromWalletId: fallbackFromId,
          toWalletId: fallbackToId,
        }));
      } catch {
        setError('Failed to load wallets');
      } finally {
        setLoadingWallets(false);
      }
    };

    loadWallets();
  }, [initialFromWalletId]);

  const fromWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === form.fromWalletId) ?? null,
    [wallets, form.fromWalletId],
  );

  const toWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === form.toWalletId) ?? null,
    [wallets, form.toWalletId],
  );

  const senderRequiredBalance = useMemo(() => {
    if (!form.enableFee || form.feePayer !== 'sender') return form.amount;
    return form.amount + form.feeAmount;
  }, [form.amount, form.enableFee, form.feeAmount, form.feePayer]);

  const availableToTransfer = useMemo(() => {
    if (!fromWallet) return 0;
    if (form.enableFee && form.feePayer === 'sender') {
      return Math.max(fromWallet.balance - form.feeAmount, 0);
    }
    return fromWallet.balance;
  }, [fromWallet, form.enableFee, form.feeAmount, form.feePayer]);

  const receiverNetAmount = useMemo(() => {
    if (!form.enableFee || form.feePayer !== 'receiver') {
      return form.amount;
    }
    return Math.max(form.amount - form.feeAmount, 0);
  }, [form.amount, form.enableFee, form.feeAmount, form.feePayer]);

  const handleNumberChange = (name: 'amount' | 'feeAmount', value: string) => {
    const parsed = value === '' ? 0 : Number(value.replace(/[^\d]/g, ''));
    setForm((prev) => ({
      ...prev,
      [name]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const validate = () => {
    if (!form.fromWalletId || !form.toWalletId) {
      return 'Wallet asal dan wallet tujuan wajib dipilih';
    }

    if (form.fromWalletId === form.toWalletId) {
      return 'Wallet asal dan wallet tujuan tidak boleh sama';
    }

    if (form.amount <= 0) {
      return 'Nominal transfer harus lebih dari 0';
    }

    if (!fromWallet || !toWallet) {
      return 'Wallet tidak valid';
    }

    const fromGoalSummary =
      fromWallet.walletKind === 'goal'
        ? computeGoalProgress({
            balance: fromWallet.balance,
            goalAmount: fromWallet.goalAmount,
            goalStartMonth: fromWallet.goalStartMonth,
            goalDueMonth: fromWallet.goalDueMonth,
          })
        : null;

    if (fromGoalSummary && !fromGoalSummary.withdrawalReady) {
      return 'Goal Wallet asal masih terkunci. Withdrawal tersedia setelah target tercapai';
    }

    const toGoalSummary =
      toWallet.walletKind === 'goal'
        ? computeGoalProgress({
            balance: toWallet.balance,
            goalAmount: toWallet.goalAmount,
            goalStartMonth: toWallet.goalStartMonth,
            goalDueMonth: toWallet.goalDueMonth,
          })
        : null;

    if (toGoalSummary && toGoalSummary.achieved) {
      return 'Goal Wallet tujuan sudah achieved dan tidak menerima transfer lagi';
    }

    if (fromWallet.balance < senderRequiredBalance) {
      return 'Saldo wallet asal tidak mencukupi';
    }

    if (form.enableFee) {
      if (form.feeAmount <= 0) {
        return 'Nominal fee harus lebih dari 0';
      }

      if (form.feePayer === 'receiver' && form.amount <= form.feeAmount) {
        return 'Jika fee dibayar penerima, nominal transfer harus lebih besar dari fee';
      }
    }

    if (!form.date) {
      return 'Tanggal transfer wajib diisi';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const confirm = await Swal.fire({
      title: 'Lanjutkan transfer?',
      text: 'Pastikan nominal dan wallet tujuan sudah benar.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Transfer',
      cancelButtonText: 'Batal',
    });

    if (!confirm.isConfirmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: WalletTransferInput = {
        fromWalletId: form.fromWalletId,
        toWalletId: form.toWalletId,
        amount: form.amount,
        date: form.date,
        transferNote: form.transferNote.trim() || undefined,
        enableFee: form.enableFee,
        feeAmount: form.enableFee ? form.feeAmount : undefined,
        feePayer: form.enableFee ? form.feePayer : undefined,
        feeNote: form.enableFee ? form.feeNote.trim() || undefined : undefined,
      };

      await walletsService.transfer(payload);

      await Swal.fire({
        icon: 'success',
        title: 'Transfer berhasil',
        timer: 1200,
        showConfirmButton: false,
      });

      onSuccess();
      setForm(initialState);
    } catch {
      setError('Transfer gagal. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingWallets) {
    return <div className='text-sm text-gray-500'>Loading wallets...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div>
        <label className='block text-sm font-medium'>Wallet Asal</label>
        <select
          value={form.fromWalletId}
          onChange={(e) => {
            const nextFromWalletId = Number(e.target.value);
            const nextToWalletId =
              form.toWalletId === nextFromWalletId
                ? (wallets.find((wallet) => wallet.id !== nextFromWalletId)
                    ?.id ?? 0)
                : form.toWalletId;

            setForm((prev) => ({
              ...prev,
              fromWalletId: nextFromWalletId,
              toWalletId: nextToWalletId,
            }));
          }}
          className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        >
          <option value={0} disabled>
            Pilih wallet asal
          </option>
          {wallets.map((wallet) => (
            <option key={wallet.id} value={wallet.id}>
              {wallet.name}
              {wallet.walletKind === 'goal' ? ' - Goal' : ''} (Rp{' '}
              {wallet.balance.toLocaleString('id-ID')})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className='block text-sm font-medium'>Wallet Tujuan</label>
        <select
          value={form.toWalletId}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, toWalletId: Number(e.target.value) }))
          }
          className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        >
          <option value={0} disabled>
            Pilih wallet tujuan
          </option>
          {wallets
            .filter((wallet) => wallet.id !== form.fromWalletId)
            .map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
                {wallet.walletKind === 'goal' ? ' - Goal' : ''} (Rp{' '}
                {wallet.balance.toLocaleString('id-ID')})
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className='block text-sm font-medium'>Nominal Transfer</label>
        <input
          type='text'
          inputMode='numeric'
          value={form.amount.toLocaleString('id-ID')}
          onChange={(e) => handleNumberChange('amount', e.target.value)}
          className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
        <p className='text-xs text-gray-500 mt-1'>
          Maksimal bisa ditransfer: Rp{' '}
          {availableToTransfer.toLocaleString('id-ID')}
        </p>
      </div>

      <div>
        <label className='block text-sm font-medium'>Tanggal Transfer</label>
        <input
          type='date'
          value={form.date}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, date: e.target.value }))
          }
          className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
          required
        />
      </div>

      <div>
        <label className='block text-sm font-medium'>
          Note Transfer (opsional)
        </label>
        <input
          value={form.transferNote}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, transferNote: e.target.value }))
          }
          placeholder='Contoh: Pindah dana operasional'
          className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
        />
      </div>

      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>Aktifkan Transfer Fee</span>
        <button
          type='button'
          role='switch'
          aria-checked={form.enableFee}
          aria-label='Aktifkan transfer fee'
          onClick={() =>
            setForm((prev) => ({
              ...prev,
              enableFee: !prev.enableFee,
              feeAmount: !prev.enableFee ? prev.feeAmount : 0,
              feePayer: 'sender',
              feeNote: !prev.enableFee ? prev.feeNote : '',
            }))
          }
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            form.enableFee ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              form.enableFee ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {form.enableFee && (
        <div className='space-y-4 rounded border border-emerald-200 dark:border-slate-700 p-3'>
          <div>
            <label className='block text-sm font-medium'>Nominal Fee</label>
            <input
              type='text'
              inputMode='numeric'
              value={form.feeAmount.toLocaleString('id-ID')}
              onChange={(e) => handleNumberChange('feeAmount', e.target.value)}
              className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
              required
            />
          </div>

          <div>
            <label className='block text-sm font-medium'>Pembayar Fee</label>
            <select
              value={form.feePayer}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  feePayer: e.target.value as FeePayer,
                }))
              }
              className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
            >
              <option value='sender'>Wallet Pengirim</option>
              <option value='receiver'>Wallet Penerima</option>
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium'>
              Note Fee (opsional)
            </label>
            <input
              value={form.feeNote}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, feeNote: e.target.value }))
              }
              placeholder='Contoh: Biaya admin transfer'
              className='w-full min-h-11 p-2.5 border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-gray-300 dark:border-slate-700'
            />
          </div>

          {form.feePayer === 'receiver' && (
            <p className='text-xs text-gray-500'>
              Nominal bersih yang diterima wallet tujuan: Rp{' '}
              {receiverNetAmount.toLocaleString('id-ID')}
            </p>
          )}
        </div>
      )}

      {error && <div className='text-red-500 text-sm'>{error}</div>}

      <button
        type='submit'
        disabled={submitting}
        className='w-full px-4 py-2.5 bg-emerald-600 text-white rounded mt-2 min-h-11 disabled:opacity-60'
      >
        {submitting ? 'Memproses...' : 'Transfer'}
      </button>
    </form>
  );
}
