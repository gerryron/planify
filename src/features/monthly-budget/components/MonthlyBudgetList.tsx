import { useEffect, useMemo, useRef, useState } from 'react';
import {
  monthlyBudgetService,
  Budget,
} from '@/features/monthly-budget/services/monthlyBudgetService';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import Swal from 'sweetalert2';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MonthlyBudgetListProps {
  onEdit: (budget: Budget) => void;
  onAdd?: () => void;
  stickyHeader?: boolean;
}

type MonthFilter = string | 'future';

function shiftMonth(base: Date, offset: number) {
  const shifted = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function nextMonth(value: string) {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1 + 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function MenuActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className='relative'>
      <button
        className='p-2 rounded hover:bg-emerald-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
        aria-label='Action'
        type='button'
        onClick={() => setOpen((value) => !value)}
      >
        <MoreVertIcon fontSize='small' />
      </button>
      {open && (
        <div className='absolute right-0 top-10 z-10 min-w-32 rounded-md border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md'>
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-emerald-100 dark:hover:bg-slate-700 flex items-center gap-2'
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            type='button'
          >
            <EditIcon fontSize='small' />
            Edit
          </button>
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-emerald-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600 dark:text-red-400'
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            type='button'
          >
            <DeleteIcon fontSize='small' />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function buildNextBudgets(
  budgets: Budget[],
  fromId: string,
  toId: string,
): Budget[] | null {
  const fromIndex = budgets.findIndex((budget) => budget.id === fromId);
  const toIndex = budgets.findIndex((budget) => budget.id === toId);
  if (fromIndex < 0 || toIndex < 0) return null;

  const nextBudgets = [...budgets];
  const [moved] = nextBudgets.splice(fromIndex, 1);
  const insertIndex = fromIndex < toIndex ? toIndex : toIndex;
  nextBudgets.splice(insertIndex, 0, moved);
  return nextBudgets;
}

function SortableBudgetItem({
  budget,
  showNominal,
  totalIncome,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  showNominal: boolean;
  totalIncome: number;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: budget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  let percentage = 0;
  if (budget.type === 'income' || budget.type === 'carryover') {
    percentage = totalIncome > 0 ? (budget.amount / totalIncome) * 100 : 0;
  } else {
    percentage =
      Math.abs(totalIncome) > 0
        ? (budget.amount / Math.abs(totalIncome)) * 100
        : 0;
  }

  const clampedPercentage = Math.max(0, Math.min(percentage, 100));
  const remainderPercentage = 100 - clampedPercentage;

  const filledColor =
    budget.type === 'income' || budget.type === 'carryover'
      ? 'bg-green-500'
      : 'bg-red-500';
  const remainderColor = 'bg-transparent';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between border-b border-gray-300 dark:border-slate-700 pb-3 last:border-b-0 last:pb-0 transition-all ${
        isDragging ? 'opacity-70 scale-[0.99] shadow-md' : ''
      }`}
    >
      <div>
        <div className='font-bold'>{budget.name}</div>
        <div className='text-sm text-gray-500'>
          {budget.month} | {budget.category}
        </div>
        <div
          className={`font-mono ${
            showNominal
              ? budget.type === 'outcome'
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-700 dark:text-green-300'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {budget.type === 'outcome' ? '- ' : ''}Rp{' '}
          {showNominal ? budget.amount.toLocaleString('id-ID') : '••••••••'}
        </div>

        <div className='flex items-center gap-2 mt-1'>
          <div
            className='h-2 rounded overflow-hidden flex border border-gray-300 dark:border-slate-700'
            style={{ width: 140 }}
          >
            <div
              className={filledColor}
              style={{ width: `${clampedPercentage}%` }}
            />
            <div
              className={remainderColor}
              style={{ width: `${remainderPercentage}%` }}
            />
          </div>
          <span className='text-xs text-gray-500 min-w-12 text-right'>
            {clampedPercentage.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className='flex items-center gap-1 relative'>
        <span
          className={`p-2 cursor-move text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded transition-all ${
            isDragging
              ? 'bg-emerald-100 dark:bg-slate-700 shadow ring-2 ring-emerald-300 dark:ring-emerald-600'
              : ''
          }`}
          {...attributes}
          {...listeners}
          title='Drag to reorder'
        >
          <DragIndicatorIcon fontSize='small' />
        </span>
        <MenuActions
          onEdit={() => onEdit(budget)}
          onDelete={() => onDelete(budget.id)}
        />
      </div>
    </div>
  );
}

export default function MonthlyBudgetList({
  onEdit,
  onAdd,
  stickyHeader = false,
}: MonthlyBudgetListProps) {
  const [showNominal, setShowNominal] = useState(true);
  const monthPickerRef = useRef<HTMLInputElement>(null);
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<MonthFilter>(currentMonth);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const now = useMemo(() => new Date(), []);
  const prevMonths = useMemo(
    () => Array.from({ length: 3 }, (_, i) => shiftMonth(now, -4 + i + 1)),
    [now],
  );

  const fetchBudgets = async (monthFilter: MonthFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await monthlyBudgetService.getAll(monthFilter);
      setBudgets(data);
    } catch {
      setError('Failed to fetch budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets(selectedMonth);
  }, [selectedMonth]);

  const totalTransaction = useMemo(() => {
    return budgets.reduce((sum, budget) => {
      return budget.type === 'income' || budget.type === 'carryover'
        ? sum + budget.amount
        : sum - budget.amount;
    }, 0);
  }, [budgets]);

  const totalIncome = useMemo(() => {
    return budgets
      .filter(
        (budget) => budget.type === 'income' || budget.type === 'carryover',
      )
      .reduce((sum, budget) => sum + budget.amount, 0);
  }, [budgets]);

  const canCarryOver = selectedMonth !== 'future' && totalTransaction > 0;

  const handleCarryOver = async () => {
    if (selectedMonth === 'future') {
      await Swal.fire({
        title: 'Carry over unavailable',
        text: 'Please select a specific month first.',
        icon: 'info',
      });
      return;
    }

    if (totalTransaction <= 0) {
      await Swal.fire({
        title: 'No surplus',
        text: 'Carry over is only available when total transaction is positive.',
        icon: 'info',
      });
      return;
    }

    const targetMonth = nextMonth(selectedMonth);
    const confirm = await Swal.fire({
      title: 'Carry over this surplus?',
      text: `Rp ${totalTransaction.toLocaleString('id-ID')} will be added to ${monthLabel(targetMonth)} as carryover income, and deducted from this month as outcome.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Carry Over',
      cancelButtonText: 'Cancel',
    });

    if (!confirm.isConfirmed) return;

    try {
      // 1. Add outcome (minus) to current month
      await monthlyBudgetService.create({
        name: `Carry Over Out ${selectedMonth}`,
        amount: totalTransaction,
        month: selectedMonth,
        category: 'Carry Over',
        type: 'outcome',
      });
      // 2. Add carryover income to next month
      await monthlyBudgetService.create({
        name: `Carry Over ${selectedMonth}`,
        amount: totalTransaction,
        month: targetMonth,
        category: 'Carry Over',
        type: 'carryover',
      });
      await Swal.fire({
        title: 'Success',
        text: `Carry over added to ${monthLabel(targetMonth)} and deducted from this month.`,
        icon: 'success',
        timer: 1400,
        showConfirmButton: false,
      });
      fetchBudgets(selectedMonth);
    } catch {
      await Swal.fire({
        title: 'Failed',
        text: 'Failed to create carry over.',
        icon: 'error',
      });
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: 'Delete budget?',
      text: 'Deleted data cannot be restored.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      await monthlyBudgetService.remove(id);
      setBudgets((prev) => prev.filter((budget) => budget.id !== id));
      await Swal.fire({
        title: 'Success',
        text: 'Budget deleted successfully.',
        icon: 'success',
        timer: 1400,
        showConfirmButton: false,
      });
    } catch {
      await Swal.fire({
        title: 'Failed',
        text: 'Failed to delete budget.',
        icon: 'error',
      });
    }
  };

  const moveBudget = async (fromId: string, toId: string) => {
    if (fromId === toId) return;

    const nextBudgets = buildNextBudgets(budgets, fromId, toId);
    if (!nextBudgets) return;

    setBudgets(nextBudgets);

    try {
      await monthlyBudgetService.reorder(
        nextBudgets.map((budget) => budget.id),
      );
    } catch {
    } finally {
      await fetchBudgets(selectedMonth);
    }
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over) return;

    const fromId = String(active.id);
    const toId = String(over.id);
    if (!fromId || !toId || fromId === toId) return;

    await moveBudget(fromId, toId);
  };

  if (error) return <div className='text-red-500'>{error}</div>;

  return (
    <div className='w-full'>
      <div
        className={
          stickyHeader
            ? 'sticky top-0 z-40 bg-emerald-50 dark:bg-slate-900 py-4'
            : ''
        }
      >
        <div className='flex items-center justify-between mb-4'>
          <div>
            <div className='text-lg font-semibold'>Total Budget</div>
            <div
              className={`text-2xl font-bold flex items-center gap-1 ${
                showNominal
                  ? totalTransaction < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-700 dark:text-green-300'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
              style={{ minHeight: '2.5rem', alignItems: 'center' }}
            >
              {totalTransaction < 0 ? '- ' : ''}Rp{' '}
              {showNominal
                ? Math.abs(totalTransaction).toLocaleString('id-ID')
                : '••••••••'}
              <button
                type='button'
                className='ml-1 flex items-center justify-center p-1 rounded hover:bg-emerald-100 dark:hover:bg-slate-700'
                aria-label={
                  showNominal ? 'Sembunyikan nominal' : 'Tampilkan nominal'
                }
                onClick={() => setShowNominal((v) => !v)}
                tabIndex={0}
                style={{
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {showNominal ? (
                  <LockIcon fontSize='small' />
                ) : (
                  <LockOpenIcon fontSize='small' />
                )}
              </button>
            </div>
          </div>

          {onAdd && (
            <div className='ml-4 flex items-center gap-2'>
              <button
                className='px-4 py-2 bg-emerald-600 text-white rounded shadow hover:bg-emerald-800 transition disabled:opacity-40 disabled:cursor-not-allowed'
                onClick={handleCarryOver}
                type='button'
                disabled={!canCarryOver}
              >
                Carry Over
              </button>
              <button
                className='px-4 py-2 bg-emerald-600 text-white rounded shadow hover:bg-emerald-800 transition'
                onClick={onAdd}
                type='button'
              >
                + Add Budget
              </button>
            </div>
          )}
        </div>

        <div className='mb-4 w-full flex flex-wrap gap-2 items-center'>
          {prevMonths.map((month) => (
            <button
              key={month}
              type='button'
              onClick={() => setSelectedMonth(month)}
              className={`rounded px-3 py-1.5 text-sm border transition ${
                selectedMonth === month
                  ? 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-900 border-emerald-600 dark:border-slate-100'
                  : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
              }`}
            >
              {monthLabel(month)}
            </button>
          ))}

          {!prevMonths.includes(currentMonth) && (
            <button
              type='button'
              onClick={() => setSelectedMonth(currentMonth)}
              className={`rounded px-3 py-1.5 text-sm border transition ${
                selectedMonth === currentMonth
                  ? 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-900 border-emerald-600 dark:border-slate-100'
                  : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
              }`}
            >
              This Month
            </button>
          )}

          <button
            type='button'
            onClick={() => setSelectedMonth('future')}
            className={`rounded px-3 py-1.5 text-sm border transition ${
              selectedMonth === 'future'
                ? 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-slate-900 border-emerald-600 dark:border-slate-100'
                : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
            }`}
          >
            Future
          </button>

          <div className='relative'>
            <button
              type='button'
              className={`rounded px-3 py-1.5 text-sm border transition flex items-center gap-2 ${
                selectedMonth !== 'future' &&
                selectedMonth !== currentMonth &&
                !prevMonths.includes(selectedMonth)
                  ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-900 border-emerald-600 dark:border-slate-100'
                  : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700'
              }`}
              onClick={() => {
                const input = monthPickerRef.current;
                if (!input) return;
                if (typeof input.showPicker === 'function') {
                  input.showPicker();
                } else {
                  input.click();
                }
              }}
            >
              Pick Another Month
            </button>
            <input
              ref={monthPickerRef}
              type='month'
              className='absolute left-0 top-0 opacity-0 w-0 h-0 pointer-events-none'
              tabIndex={-1}
              value={
                selectedMonth !== 'future' &&
                selectedMonth !== currentMonth &&
                !prevMonths.includes(selectedMonth)
                  ? selectedMonth
                  : ''
              }
              onChange={(event) => setSelectedMonth(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className='bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-slate-700 shadow p-6'>
        {loading ? (
          <div className='min-h-56 flex items-center justify-center'>
            <AutorenewIcon
              className='animate-spin text-emerald-600 dark:text-emerald-400'
              fontSize='large'
            />
          </div>
        ) : budgets.length === 0 ? (
          <div>No budgets found.</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={budgets.map((budget) => budget.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className='space-y-4'>
                {budgets.map((budget) => (
                  <SortableBudgetItem
                    key={budget.id}
                    budget={budget}
                    showNominal={showNominal}
                    totalIncome={totalIncome}
                    onEdit={onEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
