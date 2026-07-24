'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useConfirm } from '@/shared/ui/ConfirmDialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const isLinkedTransferEntry = Boolean(initial?.transferGroupId);
  const confirm = useConfirm();

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
    return `Rp ${Math.abs(form.amount).toLocaleString('id-ID')}`;
  }, [form.amount]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setForm((prev) => ({
      ...prev,
      amount: value === '' ? 0 : Number(value.replace(/[^\d]/g, '')),
    }));
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
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

    if (isUpdate && isLinkedTransferEntry) {
      if (!await confirm({
        title: 'Transaksi transfer terhubung',
        description: 'Perubahan pada transaksi ini akan otomatis disinkronkan ke transaksi transfer pasangannya.',
        confirmLabel: 'Continue',
        variant: 'default',
      })) return;
    }

    if (!await confirm({
      title: isUpdate ? 'Update this transaction?' : 'Add this transaction?',
      description: isUpdate ? 'Are you sure you want to update this entry?' : 'Are you sure you want to add this entry?',
      confirmLabel: isUpdate ? 'Update' : 'Add',
      variant: 'default',
    })) return;

    setLoading(true);
    setError(null);

    try {
      if (isUpdate) {
        await cashLogService.update(initial.id, payload);
        toast.success('Transaction updated!');
      } else {
        await cashLogService.create(payload);
        toast.success('Transaction added!');
      }

      onSuccess();
      setForm(defaultForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cash log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-5"
    >
      {/* Income / Outcome toggle */}
      <div className="flex rounded-lg border border-border bg-muted/50 p-1">
        <Button
          type="button"
          variant={activeCategoryType === 'income' ? 'default' : 'ghost'}
          className={
            activeCategoryType === 'income'
              ? 'flex-1 bg-emerald-600 text-white hover:bg-emerald-600/80'
              : 'flex-1'
          }
          onClick={() => handleCategoryTypeChange('income')}
        >
          Income
        </Button>
        <Button
          type="button"
          variant={activeCategoryType === 'outcome' ? 'default' : 'ghost'}
          className={
            activeCategoryType === 'outcome'
              ? 'flex-1 bg-red-600 text-white hover:bg-red-600/80'
              : 'flex-1'
          }
          onClick={() => handleCategoryTypeChange('outcome')}
        >
          Outcome
        </Button>
      </div>

      {/* Wallet */}
      <div className="space-y-1.5">
        <Label>Wallet</Label>
        <Select value={form.walletName} onValueChange={(value) => setForm((prev) => ({ ...prev, walletName: value ?? '' }))}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select wallet" />
          </SelectTrigger>
          <SelectContent>
            {groupedWallets.included.length > 0 && (
              <SelectGroup>
                <SelectLabel>Included from total</SelectLabel>
                {groupedWallets.included.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.name}>
                    {wallet.name}
                    {wallet.walletKind === 'credit_card' ? ' - Credit Card' : ''}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {groupedWallets.excluded.length > 0 && (
              <SelectGroup>
                <SelectLabel>Excluded from total</SelectLabel>
                {groupedWallets.excluded.map((wallet) => (
                  <SelectItem key={wallet.id} value={wallet.name}>
                    {wallet.name}
                    {wallet.walletKind === 'credit_card' ? ' - Credit Card' : ''}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select
          value={String(form.categoryId)}
          onValueChange={(value) =>
            setForm((prev) => ({ ...prev, categoryId: Number(value ?? 0) }))
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {activeCategories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.parentId ? `— ${category.name}` : category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transaction Date */}
      <div className="space-y-1.5">
        <Label htmlFor="date">Transaction Date</Label>
        <Input
          id="date"
          name="date"
          type="date"
          value={form.date}
          onChange={handleFieldChange}
          required
        />
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          name="amount"
          type="text"
          inputMode="numeric"
          value={formattedAmount}
          onChange={handleAmountChange}
          placeholder="e.g. 50000"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          value={form.description}
          onChange={handleFieldChange}
          placeholder="Optional: e.g. Lunch, Fuel, Freelance"
        />
      </div>

      {/* Exclude from report */}
      <div className="flex items-center justify-between">
        <Label htmlFor="exclude-from-report">Exclude from report</Label>
        <Switch
          id="exclude-from-report"
          checked={form.excludeFromReport}
          onCheckedChange={(checked) =>
            setForm((prev) => ({
              ...prev,
              excludeFromReport: checked,
            }))
          }
        />
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <Button type="submit" className="w-full" disabled={loading}>
        {initial ? 'Update' : 'Add'}
      </Button>
    </form>
  );
}
