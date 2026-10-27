import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashLogService, type CashLog } from '../services/cashLogService';
import type { CashLogInput } from '../types/cashLog';
import { QUERY_KEYS } from '@/lib/queryClient';

export function useCashLogs(month?: string, description?: string) {
  const normalizedDescription = description?.trim() ?? '';

  return useQuery<CashLog[]>({
    queryKey: [...QUERY_KEYS.CASH_LOGS(), { month: month ?? null, description: normalizedDescription }],
    queryFn: () => cashLogService.getAll(month, normalizedDescription),
  });
}

export function useCreateCashLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CashLogInput) => cashLogService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CASH_LOGS() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WALLETS });
    },
  });
}

export function useUpdateCashLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CashLogInput> }) =>
      cashLogService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CASH_LOGS() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WALLETS });
    },
  });
}

export function useDeleteCashLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cashLogService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CASH_LOGS() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.WALLETS });
    },
  });
}
