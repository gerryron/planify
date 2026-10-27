import {
  buildDescriptionSyncedUrl,
  resolveMonthForQuery,
} from './searchFilters';

describe('searchFilters', () => {
  it('ignores month filter when description is filled', () => {
    expect(resolveMonthForQuery('2026-10', 'lunch')).toBeUndefined();
    expect(resolveMonthForQuery('future', 'coffee')).toBeUndefined();
  });

  it('keeps month filter when description is empty', () => {
    expect(resolveMonthForQuery('2026-10', '')).toBe('2026-10');
    expect(resolveMonthForQuery('future', '   ')).toBe('future');
  });

  it('syncs only description query in URL params', () => {
    const url = buildDescriptionSyncedUrl(
      '/cash-log',
      new URLSearchParams('walletId=2&month=2026-10'),
      'Lunch',
    );

    expect(url).toBe('/cash-log?walletId=2&month=2026-10&description=Lunch');
  });

  it('removes description query when cleared', () => {
    const url = buildDescriptionSyncedUrl(
      '/cash-log',
      new URLSearchParams('walletId=2&description=lunch'),
      ' ',
    );

    expect(url).toBe('/cash-log?walletId=2');
  });
});
