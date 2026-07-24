/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import React from 'react';
import {
  useMonthlyBudgets,
  useCreateMonthlyBudget,
  useUpdateMonthlyBudget,
  useDeleteMonthlyBudget,
  useToggleDoneMonthlyBudget,
  useReorderMonthlyBudget,
} from './useMonthlyBudgets';
import { monthlyBudgetService } from '../services/monthlyBudgetService';

jest.mock('@/features/monthly-budget/services/monthlyBudgetService', () => ({
  monthlyBudgetService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    toggleDone: jest.fn(),
    reorder: jest.fn(),
  },
}));

const mockBudgets = [
  {
    id: 1,
    name: 'Rent',
    amount: 1500000,
    month: '2026-07',
    category: 'Housing',
    type: 'outcome' as const,
    isDone: false,
  },
  {
    id: 2,
    name: 'Salary',
    amount: 5000000,
    month: '2026-07',
    category: 'Income',
    type: 'income' as const,
    isDone: true,
  },
  {
    id: 3,
    name: 'Carry Over',
    amount: 200000,
    month: '2026-07',
    category: 'Savings',
    type: 'carryover' as const,
    isDone: false,
  },
];

const mockBudgetInput = {
  name: 'Electricity',
  amount: 300000,
  month: '2026-07',
  category: 'Utilities',
  type: 'outcome' as const,
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function createWrapper() {
  const queryClient = createQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useMonthlyBudgets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in loading state then returns budgets on success', async () => {
    (monthlyBudgetService.getAll as jest.Mock).mockResolvedValue(mockBudgets);

    const { result } = renderHook(() => useMonthlyBudgets(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockBudgets);
    expect(result.current.isLoading).toBe(false);
    expect(monthlyBudgetService.getAll).toHaveBeenCalledWith(undefined);
    expect(monthlyBudgetService.getAll).toHaveBeenCalledTimes(1);
  });

  it('accepts a month parameter and passes it to the service', async () => {
    (monthlyBudgetService.getAll as jest.Mock).mockResolvedValue(mockBudgets);

    const { result } = renderHook(() => useMonthlyBudgets('2026-07'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(monthlyBudgetService.getAll).toHaveBeenCalledWith('2026-07');
    expect(monthlyBudgetService.getAll).toHaveBeenCalledTimes(1);
  });

  it('returns error state when service rejects', async () => {
    const error = new Error('Failed to fetch budgets');
    (monthlyBudgetService.getAll as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useMonthlyBudgets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });
});

describe('useCreateMonthlyBudget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a budget and invalidates monthly-budgets query on success', async () => {
    const queryClient = createQueryClient();
    const createdBudget = { id: 4, ...mockBudgetInput, isDone: false };

    (monthlyBudgetService.create as jest.Mock).mockResolvedValue(createdBudget);

    // Set up a query to observe invalidation
    (monthlyBudgetService.getAll as jest.Mock).mockResolvedValue(mockBudgets);

    const wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: queryResult } = renderHook(() => useMonthlyBudgets(), {
      wrapper,
    });
    await waitFor(() => {
      expect(queryResult.current.isSuccess).toBe(true);
    });
    expect(monthlyBudgetService.getAll).toHaveBeenCalledTimes(1);

    const { result: mutationResult } = renderHook(() => useCreateMonthlyBudget(), {
      wrapper,
    });

    mutationResult.current.mutate(mockBudgetInput);

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    expect(mutationResult.current.data).toEqual(createdBudget);
    expect(monthlyBudgetService.create).toHaveBeenCalledWith(mockBudgetInput);

    // After invalidation, the budgets query should refetch
    await waitFor(() => {
      expect(monthlyBudgetService.getAll).toHaveBeenCalledTimes(2);
    });
  });

  it('returns error when creation fails', async () => {
    const error = new Error('Failed to create budget');
    (monthlyBudgetService.create as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateMonthlyBudget(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(mockBudgetInput);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(monthlyBudgetService.create).toHaveBeenCalledWith(mockBudgetInput);
  });
});

describe('useUpdateMonthlyBudget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates a budget and invalidates monthly-budgets query on success', async () => {
    const queryClient = createQueryClient();
    const updateInput = { id: 1, data: { amount: 1600000 } };
    const updatedBudget = { ...mockBudgets[0], amount: 1600000 };

    (monthlyBudgetService.update as jest.Mock).mockResolvedValue(updatedBudget);

    // Set up a query to observe invalidation
    (monthlyBudgetService.getAll as jest.Mock).mockResolvedValue(mockBudgets);

    const wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: queryResult } = renderHook(() => useMonthlyBudgets(), {
      wrapper,
    });
    await waitFor(() => {
      expect(queryResult.current.isSuccess).toBe(true);
    });
    expect(monthlyBudgetService.getAll).toHaveBeenCalledTimes(1);

    const { result: mutationResult } = renderHook(() => useUpdateMonthlyBudget(), {
      wrapper,
    });

    mutationResult.current.mutate(updateInput);

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    expect(mutationResult.current.data).toEqual(updatedBudget);
    expect(monthlyBudgetService.update).toHaveBeenCalledWith(
      updateInput.id,
      updateInput.data,
    );

    // After invalidation, the budgets query should refetch
    await waitFor(() => {
      expect(monthlyBudgetService.getAll).toHaveBeenCalledTimes(2);
    });
  });

  it('returns error when update fails', async () => {
    const error = new Error('Failed to update budget');
    (monthlyBudgetService.update as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useUpdateMonthlyBudget(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 1, data: { amount: 999 } });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(monthlyBudgetService.update).toHaveBeenCalledWith(1, { amount: 999 });
  });
});

describe('useDeleteMonthlyBudget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes a budget and invalidates monthly-budgets query on success', async () => {
    const queryClient = createQueryClient();

    (monthlyBudgetService.remove as jest.Mock).mockResolvedValue({ success: true });

    // Set up a query to observe invalidation
    (monthlyBudgetService.getAll as jest.Mock).mockResolvedValue(mockBudgets);

    const wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: queryResult } = renderHook(() => useMonthlyBudgets(), {
      wrapper,
    });
    await waitFor(() => {
      expect(queryResult.current.isSuccess).toBe(true);
    });
    expect(monthlyBudgetService.getAll).toHaveBeenCalledTimes(1);

    const { result: mutationResult } = renderHook(() => useDeleteMonthlyBudget(), {
      wrapper,
    });

    mutationResult.current.mutate(1);

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    expect(mutationResult.current.data).toEqual({ success: true });
    expect(monthlyBudgetService.remove).toHaveBeenCalledWith(1);

    // After invalidation, the budgets query should refetch
    await waitFor(() => {
      expect(monthlyBudgetService.getAll).toHaveBeenCalledTimes(2);
    });
  });

  it('returns error when deletion fails', async () => {
    const error = new Error('Failed to delete budget');
    (monthlyBudgetService.remove as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteMonthlyBudget(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(1);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(monthlyBudgetService.remove).toHaveBeenCalledWith(1);
  });
});

describe('useToggleDoneMonthlyBudget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('toggles isDone and invalidates monthly-budgets query on success', async () => {
    const queryClient = createQueryClient();
    const toggledBudget = { ...mockBudgets[0], isDone: true };

    (monthlyBudgetService.toggleDone as jest.Mock).mockResolvedValue(toggledBudget);

    // Set up a query to observe invalidation
    (monthlyBudgetService.getAll as jest.Mock).mockResolvedValue(mockBudgets);

    const wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: queryResult } = renderHook(() => useMonthlyBudgets(), {
      wrapper,
    });
    await waitFor(() => {
      expect(queryResult.current.isSuccess).toBe(true);
    });
    expect(monthlyBudgetService.getAll).toHaveBeenCalledTimes(1);

    const { result: mutationResult } = renderHook(
      () => useToggleDoneMonthlyBudget(),
      { wrapper },
    );

    mutationResult.current.mutate({ id: 1, isDone: true });

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    expect(mutationResult.current.data).toEqual(toggledBudget);
    expect(monthlyBudgetService.toggleDone).toHaveBeenCalledWith(1, true);

    // After invalidation, the budgets query should refetch
    await waitFor(() => {
      expect(monthlyBudgetService.getAll).toHaveBeenCalledTimes(2);
    });
  });

  it('returns error when toggle fails', async () => {
    const error = new Error('Failed to toggle budget');
    (monthlyBudgetService.toggleDone as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useToggleDoneMonthlyBudget(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 1, isDone: true });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(monthlyBudgetService.toggleDone).toHaveBeenCalledWith(1, true);
  });
});

describe('useReorderMonthlyBudget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reorders budgets and invalidates monthly-budgets query on success', async () => {
    const queryClient = createQueryClient();
    const orderedIds = [3, 2, 1];

    (monthlyBudgetService.reorder as jest.Mock).mockResolvedValue({ success: true });

    // Set up a query to observe invalidation
    (monthlyBudgetService.getAll as jest.Mock).mockResolvedValue(mockBudgets);

    const wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: queryResult } = renderHook(() => useMonthlyBudgets(), {
      wrapper,
    });
    await waitFor(() => {
      expect(queryResult.current.isSuccess).toBe(true);
    });
    expect(monthlyBudgetService.getAll).toHaveBeenCalledTimes(1);

    const { result: mutationResult } = renderHook(
      () => useReorderMonthlyBudget(),
      { wrapper },
    );

    mutationResult.current.mutate(orderedIds);

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    expect(mutationResult.current.data).toEqual({ success: true });
    expect(monthlyBudgetService.reorder).toHaveBeenCalledWith(orderedIds);

    // After invalidation, the budgets query should refetch
    await waitFor(() => {
      expect(monthlyBudgetService.getAll).toHaveBeenCalledTimes(2);
    });
  });

  it('returns error when reorder fails', async () => {
    const error = new Error('Failed to reorder budgets');
    (monthlyBudgetService.reorder as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useReorderMonthlyBudget(), {
      wrapper: createWrapper(),
    });

    result.current.mutate([3, 2, 1]);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(monthlyBudgetService.reorder).toHaveBeenCalledWith([3, 2, 1]);
  });
});
