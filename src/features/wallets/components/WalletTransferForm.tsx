import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  walletsService,
  WalletTransferInput,
  Wallets,
} from '@/features/wallets/services/walletsService';
import { computeGoalProgress } from '@/features/wallets/utils/goalProgress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

function formatRupiahInput(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
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

  const groupedWallets = useMemo(() => {
    const included = wallets.filter((wallet) => !wallet.excludeFromTotal);
    const excluded = wallets.filter((wallet) => wallet.excludeFromTotal);
    return { included, excluded };
  }, [wallets]);

  const destinationWallets = useMemo(() => {
    return {
      included: groupedWallets.included.filter(
        (wallet) => wallet.id !== form.fromWalletId,
      ),
      excluded: groupedWallets.excluded.filter(
        (wallet) => wallet.id !== form.fromWalletId,
      ),
    };
  }, [groupedWallets, form.fromWalletId]);

  const senderRequiredBalance = useMemo(() => {
    if (!form.enableFee || form.feePayer !== 'sender') return form.amount;
    return form.amount + form.feeAmount;
  }, [form.amount, form.enableFee, form.feeAmount, form.feePayer]);

  const availableToTransfer = useMemo(() => {
    if (!fromWallet) return 0;
    if (fromWallet.walletKind === 'credit_card') {
      const limit = fromWallet.creditLimit ?? 0;
      const reservedFee =
        form.enableFee && form.feePayer === 'sender' ? form.feeAmount : 0;
      return Math.max(limit - fromWallet.balance - reservedFee, 0);
    }
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
      return 'Transfer amount must be greater than 0';
    }

    if (!fromWallet || !toWallet) {
      return 'Invalid wallet selection';
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
      return 'Source Goal Wallet is still locked. Withdrawal is available after target is achieved';
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
      return 'Destination Goal Wallet is already achieved and no longer accepts transfers';
    }

    if (
      fromWallet.walletKind !== 'credit_card' &&
      fromWallet.balance < senderRequiredBalance
    ) {
      return 'Source wallet balance is insufficient';
    }

    if (fromWallet.walletKind === 'credit_card') {
      if (!fromWallet.creditLimit || fromWallet.creditLimit <= 0) {
        return 'Source credit card has no credit limit configured';
      }
      const remainingLimit = fromWallet.creditLimit - fromWallet.balance;
      if (senderRequiredBalance > remainingLimit) {
        return 'Transfer exceeds source credit card remaining limit';
      }
    }

    if (form.enableFee) {
      if (form.feeAmount <= 0) {
        return 'Fee amount must be greater than 0';
      }

      if (form.feePayer === 'receiver' && form.amount <= form.feeAmount) {
        return 'If receiver pays the fee, transfer amount must be greater than the fee';
      }
    }

    if (!form.date) {
      return 'Transfer date is required';
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

    if (!window.confirm('Continue transfer?\nMake sure the amount and destination wallet are correct.')) return;

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

      toast.success('Transfer successful');

      onSuccess();
      setForm(initialState);
    } catch {
      setError('Transfer failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingWallets) {
    return <div className='text-sm text-muted-foreground'>Loading wallets...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='grid gap-2'>
        <Label>Source Wallet</Label>
        <Select
          value={String(form.fromWalletId)}
          onValueChange={(value) => {
            const nextFromWalletId = Number(value);
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
        >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Select source wallet' />
          </SelectTrigger>
          <SelectContent>
            {groupedWallets.included.length > 0 && (
              <SelectGroup>
                <SelectLabel>Included from total</SelectLabel>
                {groupedWallets.included.map((wallet) => (
                  <SelectItem key={wallet.id} value={String(wallet.id)}>
                    {wallet.name}
                    {wallet.walletKind === 'goal'
                      ? ' - Goal'
                      : wallet.walletKind === 'credit_card'
                        ? ' - Credit Card'
                        : ''}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {groupedWallets.excluded.length > 0 && (
              <SelectGroup>
                <SelectLabel>Excluded from total</SelectLabel>
                {groupedWallets.excluded.map((wallet) => (
                  <SelectItem key={wallet.id} value={String(wallet.id)}>
                    {wallet.name}
                    {wallet.walletKind === 'goal'
                      ? ' - Goal'
                      : wallet.walletKind === 'credit_card'
                        ? ' - Credit Card'
                        : ''}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className='grid gap-2'>
        <Label>Destination Wallet</Label>
        <Select
          value={String(form.toWalletId)}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, toWalletId: Number(value) }))
          }
        >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Select destination wallet' />
          </SelectTrigger>
          <SelectContent>
            {destinationWallets.included.length > 0 && (
              <SelectGroup>
                <SelectLabel>Included from total</SelectLabel>
                {destinationWallets.included.map((wallet) => (
                  <SelectItem key={wallet.id} value={String(wallet.id)}>
                    {wallet.name}
                    {wallet.walletKind === 'goal'
                      ? ' - Goal'
                      : wallet.walletKind === 'credit_card'
                        ? ' - Credit Card'
                        : ''}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {destinationWallets.excluded.length > 0 && (
              <SelectGroup>
                <SelectLabel>Excluded from total</SelectLabel>
                {destinationWallets.excluded.map((wallet) => (
                  <SelectItem key={wallet.id} value={String(wallet.id)}>
                    {wallet.name}
                    {wallet.walletKind === 'goal'
                      ? ' - Goal'
                      : wallet.walletKind === 'credit_card'
                        ? ' - Credit Card'
                        : ''}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className='grid gap-2'>
        <Label>Transfer Amount</Label>
        <Input
          type='text'
          inputMode='numeric'
          value={formatRupiahInput(form.amount)}
          onChange={(e) => handleNumberChange('amount', e.target.value)}
          required
        />
        <p className='text-xs text-muted-foreground mt-1'>
          {fromWallet?.walletKind === 'credit_card'
            ? `Remaining credit limit: Rp ${availableToTransfer.toLocaleString('id-ID')}`
            : `Maximum transferable: Rp ${availableToTransfer.toLocaleString('id-ID')}`}
        </p>
      </div>

      <div className='grid gap-2'>
        <Label>Transfer Date</Label>
        <Input
          type='date'
          value={form.date}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, date: e.target.value }))
          }
          required
        />
      </div>

      <div className='grid gap-2'>
        <Label>Transfer Note (optional)</Label>
        <Input
          value={form.transferNote}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, transferNote: e.target.value }))
          }
          placeholder='Example: Move operating funds'
        />
      </div>

      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>Enable Transfer Fee</span>
        <button
          type='button'
          role='switch'
          aria-checked={form.enableFee}
          aria-label='Enable transfer fee'
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
          <div className='grid gap-2'>
            <Label>Fee Amount</Label>
            <Input
              type='text'
              inputMode='numeric'
              value={formatRupiahInput(form.feeAmount)}
              onChange={(e) => handleNumberChange('feeAmount', e.target.value)}
              required
            />
          </div>

          <div className='grid gap-2'>
            <Label>Fee Payer</Label>
            <Select
              value={form.feePayer}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  feePayer: value as FeePayer,
                }))
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='sender'>Sender Wallet</SelectItem>
                <SelectItem value='receiver'>Receiver Wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='grid gap-2'>
            <Label>Fee Note (optional)</Label>
            <Input
              value={form.feeNote}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, feeNote: e.target.value }))
              }
              placeholder='Example: Transfer admin fee'
            />
          </div>

          {form.feePayer === 'receiver' && (
            <p className='text-xs text-muted-foreground'>
              Net amount received by destination wallet: Rp{' '}
              {receiverNetAmount.toLocaleString('id-ID')}
            </p>
          )}
        </div>
      )}

      {error && <div className='text-sm text-destructive'>{error}</div>}

      <Button type='submit' disabled={submitting} className='w-full'>
        {submitting ? 'Processing...' : 'Transfer'}
      </Button>
    </form>
  );
}
