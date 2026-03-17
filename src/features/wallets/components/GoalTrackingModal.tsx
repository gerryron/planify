import CloseIcon from '@mui/icons-material/Close';
import { Pie, PieChart, ResponsiveContainer, Cell } from 'recharts';
import { Wallets } from '@/features/wallets/services/walletsService';
import { computeGoalProgress } from '@/features/wallets/utils/goalProgress';

type GoalTrackingModalProps = {
  wallet: Wallets;
  onClose: () => void;
};

function formatMonth(value: string | null) {
  if (!value) return '-';
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function SemiGauge({
  value,
  fill,
  track,
}: {
  value: number;
  fill: string;
  track: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const data = [
    { name: 'progress', value: clamped },
    { name: 'remaining', value: 100 - clamped },
  ];

  return (
    <div className='w-full h-44'>
      <ResponsiveContainer width='100%' height='100%'>
        <PieChart>
          <Pie
            data={data}
            dataKey='value'
            startAngle={180}
            endAngle={0}
            innerRadius='68%'
            outerRadius='90%'
            stroke='none'
            cx='50%'
            cy='95%'
          >
            <Cell fill={fill} />
            <Cell fill={track} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function GoalTrackingModal({
  wallet,
  onClose,
}: GoalTrackingModalProps) {
  if (
    wallet.walletKind !== 'goal' ||
    !wallet.goalAmount ||
    !wallet.goalDueMonth
  ) {
    return null;
  }

  const summary = computeGoalProgress({
    balance: wallet.balance,
    goalAmount: wallet.goalAmount,
    goalStartMonth: wallet.goalStartMonth,
    goalDueMonth: wallet.goalDueMonth,
  });

  const statusTone: Record<string, string> = {
    'on-track':
      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    'at-risk':
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
    achieved:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  };

  return (
    <div className='fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4'>
      <div className='w-full max-w-2xl rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 shadow-xl'>
        <div className='flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700'>
          <div>
            <h3 className='text-lg font-semibold'>
              Goal Tracking - {wallet.name}
            </h3>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              Due Month: {formatMonth(wallet.goalDueMonth)}
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700'
            aria-label='Close goal tracking modal'
          >
            <CloseIcon fontSize='small' />
          </button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-5'>
          <div className='rounded-lg border border-emerald-200 dark:border-slate-700 p-4'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              Nominal progress
            </p>
            <SemiGauge
              value={summary.progressPercent}
              fill='#10b981'
              track='#d1fae5'
            />
            <p className='-mt-6 text-center text-2xl font-bold'>
              {summary.progressPercent.toFixed(1)}%
            </p>
            <p className='text-sm text-center text-gray-600 dark:text-gray-300 mt-2'>
              Rp {Math.max(wallet.balance, 0).toLocaleString('id-ID')} / Rp{' '}
              {wallet.goalAmount.toLocaleString('id-ID')}
            </p>
          </div>

          <div className='rounded-lg border border-emerald-200 dark:border-slate-700 p-4'>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              Time progress
            </p>
            <SemiGauge
              value={summary.timeProgressPercent}
              fill='#0ea5e9'
              track='#dbeafe'
            />
            <p className='-mt-6 text-center text-2xl font-bold'>
              {summary.timeProgressPercent.toFixed(1)}%
            </p>
            <p className='text-sm text-center text-gray-600 dark:text-gray-300 mt-2'>
              {summary.monthsLeft} month(s) left
            </p>
          </div>
        </div>

        <div className='px-5 pb-5 space-y-3'>
          <div className='flex items-center flex-wrap gap-2'>
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${statusTone[summary.status]}`}
            >
              {summary.status.toUpperCase()}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                summary.withdrawalReady
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {summary.withdrawalReady ? 'Ready for Withdrawal' : 'Locked'}
            </span>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-2 text-sm'>
            <div className='rounded-md bg-slate-50 dark:bg-slate-900/60 p-3'>
              <div className='text-gray-500 dark:text-gray-400'>Remaining</div>
              <div className='font-semibold'>
                Rp {summary.remainingAmount.toLocaleString('id-ID')}
              </div>
            </div>
            <div className='rounded-md bg-slate-50 dark:bg-slate-900/60 p-3'>
              <div className='text-gray-500 dark:text-gray-400'>
                Required / month
              </div>
              <div className='font-semibold'>
                Rp {summary.requiredPerMonth.toLocaleString('id-ID')}
              </div>
            </div>
            <div className='rounded-md bg-slate-50 dark:bg-slate-900/60 p-3'>
              <div className='text-gray-500 dark:text-gray-400'>Timeline</div>
              <div className='font-semibold'>
                {summary.totalTimelineMonths} month(s)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
