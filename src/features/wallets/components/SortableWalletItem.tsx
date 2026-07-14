import { computeGoalProgress } from '@/features/wallets/utils/goalProgress';
import { goalStatusTone } from '@/features/wallets/utils/goalStatusTone';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import type { Wallets } from '@/features/wallets/services/walletsService';
import MenuActions from './MenuActions';

interface SortableWalletItemProps {
  wallet: Wallets;
  showNominal: boolean;
  totalAllocationBase: number;
  onOpenCashLog: (wallet: Wallets) => void;
  onEdit: (wallet: Wallets) => void;
  onTransfer: (wallet: Wallets) => void;
  onDelete: (wallet: Wallets) => void;
  onTrackGoal: (wallet: Wallets) => void;
  canDelete: boolean;
}

export default function SortableWalletItem({
  wallet,
  showNominal,
  totalAllocationBase,
  onOpenCashLog,
  onEdit,
  onTransfer,
  onDelete,
  onTrackGoal,
  canDelete,
}: SortableWalletItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: wallet.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1)',
  };

  const allocationPercent =
    totalAllocationBase > 0
      ? (Math.max(wallet.balance, 0) / totalAllocationBase) * 100
      : 0;
  const clampedPercent = Math.max(0, Math.min(allocationPercent, 100));
  const goalSummary =
    wallet.walletKind === 'goal'
      ? computeGoalProgress({
          balance: wallet.balance,
          goalAmount: wallet.goalAmount,
          goalStartMonth: wallet.goalStartMonth,
          goalDueMonth: wallet.goalDueMonth,
        })
      : null;
  const creditLimit = wallet.creditLimit ?? 0;
  const outstandingAmount =
    wallet.walletKind === 'credit_card'
      ? Math.abs(wallet.balance)
      : Math.max(wallet.balance, 0);
  const creditUtilization =
    wallet.walletKind === 'credit_card' && creditLimit > 0
      ? (outstandingAmount / creditLimit) * 100
      : 0;
  const clampedCreditUtilization = Math.max(0, Math.min(creditUtilization, 100));
  const remainingLimit =
    wallet.walletKind === 'credit_card' && creditLimit > 0
      ? Math.max(creditLimit - outstandingAmount, 0)
      : 0;
  const utilizationToneClass =
    creditUtilization >= 90
      ? 'text-red-600 dark:text-red-400'
      : creditUtilization >= 70
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400';

  const walletKindBadge =
    wallet.walletKind === 'goal'
      ? 'Goal'
      : wallet.walletKind === 'credit_card'
        ? 'Credit Card'
        : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onOpenCashLog(wallet)}
      className={`flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700/80 px-3 py-3 transition-all hover:bg-emerald-50 dark:hover:bg-slate-700/40 ${
        isDragging ? 'opacity-70 scale-[0.99] shadow-md' : ''
      }`}
      role='button'
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenCashLog(wallet);
        }
      }}
    >
      <div className='text-left transition-colors flex-1' title='Open cash log for this wallet'>
        <div className='flex items-center gap-2'>
          <div className='font-bold'>{wallet.name}</div>
          {walletKindBadge && (
            <span className='px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'>
              {walletKindBadge}
            </span>
          )}
        </div>
        <div
          className={`font-mono ${
            showNominal
              ? wallet.walletKind === 'credit_card' || wallet.balance < 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-700 dark:text-green-300'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {wallet.walletKind === 'credit_card' ? 'Outstanding: ' : wallet.balance < 0 ? '- ' : ''}
          Rp {showNominal ? Math.abs(wallet.balance).toLocaleString('id-ID') : '••••••••'}
        </div>
        {wallet.walletKind === 'credit_card' && (
          <div className='mt-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-2 space-y-1.5'>
            <div className='flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400'>
              <span>Utilization</span>
              <span className={`font-semibold ${utilizationToneClass}`}>
                {showNominal ? `${creditUtilization.toFixed(1)}%` : '•••'}
              </span>
            </div>
            <div className='h-1.5 rounded overflow-hidden border border-gray-300 dark:border-slate-700'>
              <div className='h-full bg-red-500' style={{ width: `${clampedCreditUtilization}%` }} />
            </div>
            <div className='grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400'>
              <span className='truncate'>
                O/L:{' '}
                {creditLimit > 0
                  ? showNominal
                    ? `${outstandingAmount.toLocaleString('id-ID')} / ${creditLimit.toLocaleString('id-ID')}`
                    : '•••• / ••••'
                  : 'Limit not set'}
              </span>
              <span className='truncate text-right'>
                Remaining: {showNominal ? remainingLimit.toLocaleString('id-ID') : '••••••'}
              </span>
            </div>
          </div>
        )}
        {goalSummary && (
          <div className='flex items-center gap-2 mt-1 flex-wrap'>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${goalStatusTone[goalSummary.status]}`}>
              {goalSummary.status.toUpperCase()}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                goalSummary.withdrawalReady
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {goalSummary.withdrawalReady ? 'Ready for Withdrawal' : 'Locked'}
            </span>
          </div>
        )}
        {!wallet.excludeFromTotal && (
          <div className='flex items-center gap-2 mt-1'>
            <div className='h-2 rounded overflow-hidden flex border border-gray-300 dark:border-slate-700' style={{ width: 140 }}>
              <div className={wallet.balance < 0 ? 'bg-red-500' : 'bg-green-500'} style={{ width: `${clampedPercent}%` }} />
              <div className='bg-transparent' style={{ width: `${100 - clampedPercent}%` }} />
            </div>
            <span className='text-xs text-gray-500 min-w-12 text-right'>{clampedPercent.toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className='flex items-center gap-1'>
        {goalSummary && (
          <div className='inline-flex items-center justify-center w-10 h-10 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-800/60' title='Track Goal'>
            <button
              type='button'
              onClick={(event) => {
                event.stopPropagation();
                onTrackGoal(wallet);
              }}
              className='inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800/60'
              aria-label='Track goal'
            >
              <TrackChangesIcon fontSize='small' />
            </button>
          </div>
        )}
        <span
          onClick={(event) => event.stopPropagation()}
          className={`p-2 cursor-move text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded transition-all ${
            isDragging ? 'bg-emerald-100 dark:bg-slate-700 shadow ring-2 ring-emerald-300 dark:ring-emerald-600' : ''
          }`}
          {...attributes}
          {...listeners}
          title='Drag to reorder'
        >
          <DragIndicatorIcon fontSize='small' />
        </span>
        <MenuActions
          onEdit={() => onEdit(wallet)}
          onTransfer={() => onTransfer(wallet)}
          onDelete={() => onDelete(wallet)}
          canDelete={canDelete}
          transferLabel={goalSummary?.withdrawalReady ? 'Withdrawal' : 'Transfer'}
        />
      </div>
    </div>
  );
}
