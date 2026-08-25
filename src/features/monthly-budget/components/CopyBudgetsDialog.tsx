'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Budget,
} from '@/features/monthly-budget/services/monthlyBudgetService';
import { useCopyMonthlyBudgets } from '@/features/monthly-budget/hooks/useMonthlyBudgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useModalKeyboard } from '@/shared/utils/useModalKeyboard';
import { asyncToast } from '@/shared/utils/asyncHelper';

interface CopyBudgetsDialogProps {
  budgets: Budget[];
  sourceMonth: string;
  defaultTargetMonth: string;
  onClose: () => void;
  onSuccess?: () => void;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function CopyBudgetsDialog({
  budgets,
  sourceMonth,
  defaultTargetMonth,
  onClose,
  onSuccess,
}: CopyBudgetsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    () => new Set(budgets.map((budget) => budget.id)),
  );
  const [targetMonth, setTargetMonth] = useState(defaultTargetMonth);
  const [error, setError] = useState<string | null>(null);
  const copyMutation = useCopyMonthlyBudgets();
  const { containerRef: modalRef } = useModalKeyboard({ onClose });

  const allSelected = selectedIds.size === budgets.length;

  const toggleAll = (checked: boolean) => {
    setSelectedIds(
      checked ? new Set(budgets.map((budget) => budget.id)) : new Set(),
    );
  };

  const toggleItem = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) {
      setError('Select at least one item.');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      setError('Target month is invalid.');
      return;
    }
    if (targetMonth === sourceMonth) {
      setError('Target month must be different from the source month.');
      return;
    }

    const result = await asyncToast(
      () => copyMutation.mutateAsync({ ids, targetMonth }),
      {
        success: 'Budgets copied successfully.',
        error: 'Failed to copy budgets.',
      },
    );
    if (result) {
      onSuccess?.();
      onClose();
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className='fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-4'
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className='bg-card rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-[calc(100vw-1.5rem)] sm:min-w-[320px] sm:max-w-md relative max-h-[85vh] flex flex-col'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className='absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:text-slate-300 dark:hover:text-white text-2xl font-bold'
          onClick={onClose}
          aria-label='Close dialog'
        >
          ×
        </button>

        <h2 className='text-lg font-semibold mb-3 pr-8'>
          Copy budgets from {monthLabel(sourceMonth)}
        </h2>

        <label className='flex items-center gap-2 text-sm mb-2 cursor-pointer'>
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => toggleAll(checked)}
          />
          Select all ({budgets.length} items)
        </label>

        <div className='flex-1 min-h-0 overflow-y-auto border border-gray-300 dark:border-slate-700 rounded p-2 space-y-1'>
          {budgets.map((budget) => (
            <label
              key={budget.id}
              className='flex items-center gap-2 p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-slate-700 cursor-pointer text-sm'
            >
              <Checkbox
                checked={selectedIds.has(budget.id)}
                onCheckedChange={(checked) => toggleItem(budget.id, checked)}
              />
              <span className='flex-1 truncate'>{budget.name}</span>
              <span className='text-gray-500 dark:text-gray-400 truncate max-w-24'>
                {budget.category}
              </span>
              <span className='font-mono whitespace-nowrap'>
                Rp {Math.abs(budget.amount).toLocaleString('id-ID')}
              </span>
            </label>
          ))}
        </div>

        <div className='space-y-1.5 mt-4'>
          <Label htmlFor='copy-target-month'>Target month</Label>
          <Input
            id='copy-target-month'
            name='targetMonth'
            type='month'
            value={targetMonth}
            onChange={(event) => {
              setTargetMonth(event.target.value);
              setError(null);
            }}
            className='h-11'
          />
        </div>

        {error && <div className='text-red-500 text-sm mt-2'>{error}</div>}

        <div className='flex justify-end gap-2 mt-4'>
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleSubmit}
            disabled={copyMutation.isPending || selectedIds.size === 0}
          >
            {copyMutation.isPending ? 'Copying...' : `Copy (${selectedIds.size})`}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
