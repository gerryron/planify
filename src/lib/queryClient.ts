import { QueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// React Query client singleton.
// Configured with conservative defaults suitable for a personal finance app:
// - Data that rarely changes (categories) benefits from a longer staleTime.
// - Data that changes often (cash logs, wallets) gets a shorter staleTime
//   configured per‑hook via the `useQuery` options.
// ---------------------------------------------------------------------------
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 menit – reasonable default
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

// ---------------------------------------------------------------------------
// Cache‑key constants.
// Use these everywhere so cache invalidation stays in sync.
// ---------------------------------------------------------------------------
export const QUERY_KEYS = {
  WALLETS: ['wallets'] as const,
  WALLET: (id: number) => ['wallets', id] as const,
  CATEGORIES: ['categories'] as const,
  CASH_LOGS: (walletId?: number) =>
    walletId !== undefined
      ? (['cash-logs', walletId] as const)
      : (['cash-logs'] as const),
  MONTHLY_BUDGETS: (month: string) => ['monthly-budgets', month] as const,
  DASHBOARD: (month: string) => ['dashboard', month] as const,
  USER: ['user'] as const,
} as const;
