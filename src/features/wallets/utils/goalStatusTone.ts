import type { GoalStatus } from './goalProgress';

export const goalStatusTone: Record<GoalStatus, string> = {
  'on-track':
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  'at-risk':
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  achieved:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
};
