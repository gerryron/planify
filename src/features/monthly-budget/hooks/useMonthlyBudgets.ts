import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  monthlyBudgetService,
  type Budget,
} from '../services/monthlyBudgetService';
import type { BudgetInput } from '../types/budget';
import { QUERY_KEYS } from '@/lib/queryClient';

export function useMonthlyBudgets(month?: string) {
  return useQuery<Budget[]>({
    queryKey: QUERY_KEYS.MONTHLY_BUDGETS(month ?? 'all'),
    queryFn: () => monthlyBudgetService.getAll(month),
  });
}

export function useCreateMonthlyBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BudgetInput) => monthlyBudgetService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['monthly-budgets'],
      });
    },
  });
}

export function useUpdateMonthlyBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BudgetInput> }) =>
      monthlyBudgetService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['monthly-budgets'],
      });
    },
  });
}

export function useDeleteMonthlyBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => monthlyBudgetService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['monthly-budgets'],
      });
    },
  });
}

export function useToggleDoneMonthlyBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isDone }: { id: number; isDone: boolean }) =>
      monthlyBudgetService.toggleDone(id, isDone),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['monthly-budgets'],
      });
    },
  });
}

export function useReorderMonthlyBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: number[]) =>
      monthlyBudgetService.reorder(orderedIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['monthly-budgets'],
      });
    },
  });
}
