import { goalStatusTone } from './goalStatusTone';

describe('goalStatusTone', () => {
  it('has all expected goal status keys', () => {
    expect(Object.keys(goalStatusTone).sort()).toEqual([
      'achieved',
      'at-risk',
      'on-track',
      'overdue',
    ]);
  });

  it('has non-empty class strings for every status', () => {
    for (const status of Object.keys(goalStatusTone)) {
      expect(goalStatusTone[status as keyof typeof goalStatusTone]).toBeTruthy();
      expect(typeof goalStatusTone[status as keyof typeof goalStatusTone]).toBe('string');
    }
  });

  it('uses different colors for different statuses', () => {
    const values = Object.values(goalStatusTone);
    const uniqueColors = new Set(values);
    expect(uniqueColors.size).toBe(4);
  });
});
