export type GoalStatus = 'on-track' | 'at-risk' | 'overdue' | 'achieved';

type GoalProgressInput = {
  balance: number;
  goalAmount: number | null;
  goalStartMonth: string | null;
  goalDueMonth: string | null;
  now?: Date;
};

type GoalProgressSummary = {
  progressPercent: number;
  timeProgressPercent: number;
  remainingAmount: number;
  monthsLeft: number;
  totalTimelineMonths: number;
  requiredPerMonth: number;
  status: GoalStatus;
  achieved: boolean;
  overdue: boolean;
  withdrawalReady: boolean;
};

function parseMonth(value: string | null): Date | null {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;

  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function monthDiffInclusive(start: Date, end: Date): number {
  const diff =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1;
  return Math.max(diff, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeGoalProgress(
  input: GoalProgressInput,
): GoalProgressSummary {
  const now = input.now ?? new Date();

  if (!input.goalAmount || input.goalAmount <= 0 || !input.goalDueMonth) {
    return {
      progressPercent: 0,
      timeProgressPercent: 0,
      remainingAmount: 0,
      monthsLeft: 0,
      totalTimelineMonths: 0,
      requiredPerMonth: 0,
      status: 'on-track',
      achieved: false,
      overdue: false,
      withdrawalReady: false,
    };
  }

  const dueStart = parseMonth(input.goalDueMonth);
  const startMonth =
    parseMonth(input.goalStartMonth) ??
    new Date(now.getFullYear(), now.getMonth(), 1);

  if (!dueStart) {
    return {
      progressPercent: 0,
      timeProgressPercent: 0,
      remainingAmount: 0,
      monthsLeft: 0,
      totalTimelineMonths: 0,
      requiredPerMonth: 0,
      status: 'on-track',
      achieved: false,
      overdue: false,
      withdrawalReady: false,
    };
  }

  const dueEnd = endOfMonth(dueStart);
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const remainingAmount = Math.max(input.goalAmount - input.balance, 0);
  const achieved = remainingAmount === 0;

  const monthsLeftRaw =
    (dueStart.getFullYear() - currentMonth.getFullYear()) * 12 +
    (dueStart.getMonth() - currentMonth.getMonth()) +
    1;
  const monthsLeft = Math.max(monthsLeftRaw, 1);

  const totalTimelineMonths = monthDiffInclusive(startMonth, dueStart);
  const timelineStart = new Date(
    startMonth.getFullYear(),
    startMonth.getMonth(),
    1,
  );

  const elapsedMs = clamp(
    now.getTime() - timelineStart.getTime(),
    0,
    dueEnd.getTime() - timelineStart.getTime(),
  );
  const totalMs = Math.max(dueEnd.getTime() - timelineStart.getTime(), 1);
  const timeProgressPercent = achieved
    ? 100
    : clamp((elapsedMs / totalMs) * 100, 0, 100);

  const progressPercent = clamp(
    (input.balance / input.goalAmount) * 100,
    0,
    100,
  );
  const requiredPerMonth = achieved
    ? 0
    : Math.ceil(remainingAmount / monthsLeft);

  const overdue = !achieved && now.getTime() > dueEnd.getTime();

  let status: GoalStatus = 'on-track';
  if (achieved) {
    status = 'achieved';
  } else if (overdue) {
    status = 'overdue';
  } else if (monthsLeft <= 2 && progressPercent < 70) {
    status = 'at-risk';
  } else if (timeProgressPercent >= 75 && progressPercent < 60) {
    status = 'at-risk';
  }

  return {
    progressPercent,
    timeProgressPercent,
    remainingAmount,
    monthsLeft,
    totalTimelineMonths,
    requiredPerMonth,
    status,
    achieved,
    overdue,
    withdrawalReady: achieved,
  };
}
