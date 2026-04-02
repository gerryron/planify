import { computeGoalProgress, GoalStatus } from './goalProgress';

function makeDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

describe('computeGoalProgress', () => {
  describe('edge cases - invalid / missing input', () => {
    it('returns zero summary when goalAmount is null', () => {
      const result = computeGoalProgress({
        balance: 1000,
        goalAmount: null,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
      });

      expect(result.progressPercent).toBe(0);
      expect(result.status).toBe('on-track');
      expect(result.achieved).toBe(false);
      expect(result.withdrawalReady).toBe(false);
    });

    it('returns zero summary when goalAmount is 0', () => {
      const result = computeGoalProgress({
        balance: 500,
        goalAmount: 0,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
      });

      expect(result.progressPercent).toBe(0);
      expect(result.achieved).toBe(false);
    });

    it('returns zero summary when goalAmount is negative', () => {
      const result = computeGoalProgress({
        balance: 500,
        goalAmount: -100,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
      });

      expect(result.progressPercent).toBe(0);
    });

    it('returns zero summary when goalDueMonth is null', () => {
      const result = computeGoalProgress({
        balance: 1000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: null,
      });

      expect(result.progressPercent).toBe(0);
      expect(result.totalTimelineMonths).toBe(0);
    });

    it('returns zero summary when goalDueMonth has invalid format', () => {
      const result = computeGoalProgress({
        balance: 1000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-13',
      });

      expect(result.progressPercent).toBe(0);
    });

    it('returns zero summary when goalDueMonth is empty string', () => {
      const result = computeGoalProgress({
        balance: 1000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '',
      });

      expect(result.progressPercent).toBe(0);
    });
  });

  describe('progress calculation', () => {
    it('calculates correct progress percentage', () => {
      const result = computeGoalProgress({
        balance: 2500,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
        now: makeDate(2026, 3, 15),
      });

      expect(result.progressPercent).toBe(50);
      expect(result.remainingAmount).toBe(2500);
    });

    it('clamps progress at 100% when balance exceeds goal', () => {
      const result = computeGoalProgress({
        balance: 6000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
        now: makeDate(2026, 3, 15),
      });

      expect(result.progressPercent).toBe(100);
      expect(result.remainingAmount).toBe(0);
    });

    it('clamps progress at 0% when balance is negative', () => {
      const result = computeGoalProgress({
        balance: -500,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
        now: makeDate(2026, 3, 15),
      });

      expect(result.progressPercent).toBe(0);
    });

    it('calculates remaining amount correctly', () => {
      const result = computeGoalProgress({
        balance: 3000,
        goalAmount: 10000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-12',
        now: makeDate(2026, 6, 1),
      });

      expect(result.remainingAmount).toBe(7000);
    });
  });

  describe('timeline calculation', () => {
    it('calculates total timeline months correctly', () => {
      const result = computeGoalProgress({
        balance: 0,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
        now: makeDate(2026, 1, 15),
      });

      expect(result.totalTimelineMonths).toBe(6);
    });

    it('calculates months left correctly', () => {
      const result = computeGoalProgress({
        balance: 0,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
        now: makeDate(2026, 3, 15),
      });

      expect(result.monthsLeft).toBe(4);
    });

    it('uses current month as startMonth when goalStartMonth is null', () => {
      const result = computeGoalProgress({
        balance: 0,
        goalAmount: 5000,
        goalStartMonth: null,
        goalDueMonth: '2026-06',
        now: makeDate(2026, 3, 1),
      });

      expect(result.totalTimelineMonths).toBe(4);
    });

    it('returns at least 1 for monthsLeft even when past due', () => {
      const result = computeGoalProgress({
        balance: 0,
        goalAmount: 5000,
        goalStartMonth: '2025-01',
        goalDueMonth: '2025-06',
        now: makeDate(2026, 3, 15),
      });

      expect(result.monthsLeft).toBeGreaterThanOrEqual(1);
    });
  });

  describe('requiredPerMonth calculation', () => {
    it('calculates required per month correctly', () => {
      const result = computeGoalProgress({
        balance: 1000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-04',
        now: makeDate(2026, 1, 15),
      });

      expect(result.requiredPerMonth).toBe(Math.ceil(4000 / 4));
    });

    it('returns 0 requiredPerMonth when goal is achieved', () => {
      const result = computeGoalProgress({
        balance: 5000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
        now: makeDate(2026, 3, 15),
      });

      expect(result.requiredPerMonth).toBe(0);
    });
  });

  describe('status determination', () => {
    it('returns "achieved" when balance meets goal', () => {
      const result = computeGoalProgress({
        balance: 5000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
        now: makeDate(2026, 3, 15),
      });

      expect(result.status).toBe<GoalStatus>('achieved');
      expect(result.achieved).toBe(true);
    });

    it('returns "achieved" when balance exceeds goal', () => {
      const result = computeGoalProgress({
        balance: 7000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
        now: makeDate(2026, 3, 15),
      });

      expect(result.status).toBe<GoalStatus>('achieved');
    });

    it('returns "overdue" when past due and not achieved', () => {
      const result = computeGoalProgress({
        balance: 3000,
        goalAmount: 5000,
        goalStartMonth: '2025-01',
        goalDueMonth: '2025-06',
        now: makeDate(2026, 1, 15),
      });

      expect(result.status).toBe<GoalStatus>('overdue');
      expect(result.overdue).toBe(true);
    });

    it('returns "at-risk" when <=2 months left and progress < 70%', () => {
      const result = computeGoalProgress({
        balance: 2000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-04',
        now: makeDate(2026, 3, 15),
      });

      expect(result.status).toBe<GoalStatus>('at-risk');
    });

    it('returns "at-risk" when time progress >= 75% and amount progress < 60%', () => {
      const result = computeGoalProgress({
        balance: 1000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-12',
        now: makeDate(2026, 10, 15),
      });

      expect(result.status).toBe<GoalStatus>('at-risk');
    });

    it('returns "on-track" when progress is healthy relative to time', () => {
      const result = computeGoalProgress({
        balance: 3000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-12',
        now: makeDate(2026, 3, 15),
      });

      expect(result.status).toBe<GoalStatus>('on-track');
    });
  });

  describe('withdrawal readiness', () => {
    it('allows withdrawal when goal is achieved', () => {
      const result = computeGoalProgress({
        balance: 5000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
        now: makeDate(2026, 3, 15),
      });

      expect(result.withdrawalReady).toBe(true);
    });

    it('locks withdrawal when goal is not yet achieved', () => {
      const result = computeGoalProgress({
        balance: 4999,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
        now: makeDate(2026, 3, 15),
      });

      expect(result.withdrawalReady).toBe(false);
    });

    it('locks withdrawal even when overdue but not achieved', () => {
      const result = computeGoalProgress({
        balance: 3000,
        goalAmount: 5000,
        goalStartMonth: '2025-01',
        goalDueMonth: '2025-06',
        now: makeDate(2026, 3, 15),
      });

      expect(result.withdrawalReady).toBe(false);
    });
  });

  describe('time progress', () => {
    it('returns 100% time progress when achieved', () => {
      const result = computeGoalProgress({
        balance: 5000,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-06',
        now: makeDate(2026, 3, 15),
      });

      expect(result.timeProgressPercent).toBe(100);
    });

    it('calculates time progress correctly midway', () => {
      const result = computeGoalProgress({
        balance: 0,
        goalAmount: 5000,
        goalStartMonth: '2026-01',
        goalDueMonth: '2026-12',
        now: makeDate(2026, 7, 1),
      });

      expect(result.timeProgressPercent).toBeGreaterThan(40);
      expect(result.timeProgressPercent).toBeLessThan(60);
    });

    it('clamps time progress at 100% when past due', () => {
      const result = computeGoalProgress({
        balance: 0,
        goalAmount: 5000,
        goalStartMonth: '2025-01',
        goalDueMonth: '2025-06',
        now: makeDate(2026, 1, 15),
      });

      expect(result.timeProgressPercent).toBe(100);
    });
  });
});
