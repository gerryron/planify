type MonthFilter = string | 'future';

export function resolveMonthForQuery(
  selectedMonth: MonthFilter,
  description: string,
) {
  return description.trim() ? undefined : selectedMonth;
}

export function buildDescriptionSyncedUrl(
  pathname: string,
  searchParams: URLSearchParams,
  description: string,
) {
  const next = new URLSearchParams(searchParams.toString());
  const normalized = description.trim();

  if (normalized) {
    next.set('description', normalized);
  } else {
    next.delete('description');
  }

  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}
