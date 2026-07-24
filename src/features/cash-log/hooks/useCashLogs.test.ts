/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import React from 'react';
import {
  useCashLogs,
  useCreateCashLog,
  useUpdateCashLog,
  useDeleteCashLog,
} from './useCashLogs';
import { cashLogService } from '../services/cashLogService';

jest.mock('@/features/cash-log/services/cashLogService', () => ({
  cashLogService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

const mockCashLogs = [
  {
    id: 1,
    date: '2026-07-15',
    description: 'Lunch',
    amount: 35000,
    walletName: 'Cash',
    categoryId: 2,
    excludeFromReport: false,
    category: { id: 2, name: 'Food', type: 'outcome' as const, parentId: null },
  },
  {
    id: 2,
    date: '2026-07-16',
    description: 'Freelance Payment',
    amount: 500000,
    walletName: 'BCA',
    categoryId: 1,
    excludeFromReport: true,
    category: { id: 1, name: 'Salary', type: 'income' as const, parentId: null },
  },
];

const mockCashLogInput = {
  date: '2026-07-20',
  description: 'Groceries',
  amount: 150000,
  walletName: 'Cash',
  categoryId: 2,
  excludeFromReport: false,
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

describe('useCashLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in loading state then returns cash logs on success', async () => {
    (cashLogService.getAll as jest.Mock).mockResolvedValue(mockCashLogs);

    const { result } = renderHook(() => useCashLogs(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCashLogs);
    expect(result.current.isLoading).toBe(false);
    expect(cashLogService.getAll).toHaveBeenCalledWith(undefined);
    expect(cashLogService.getAll).toHaveBeenCalledTimes(1);
  });

  it('accepts a month parameter and passes it to the service', async () => {
    (cashLogService.getAll as jest.Mock).mockResolvedValue(mockCashLogs);

    const { result } = renderHook(() => useCashLogs('2026-07'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(cashLogService.getAll).toHaveBeenCalledWith('2026-07');
    expect(cashLogService.getAll).toHaveBeenCalledTimes(1);
  });

  it('returns error state when service rejects', async () => {
    const error = new Error('Failed to fetch cash logs');
    (cashLogService.getAll as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useCashLogs(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });
});

describe('useCreateCashLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a cash log and invalidates related queries on success', async () => {
    const queryClient = createQueryClient();
    const createdCashLog = { id: 3, ...mockCashLogInput, category: null };

    (cashLogService.create as jest.Mock).mockResolvedValue(createdCashLog);

    // Set up a query to observe invalidation of cash-logs
    (cashLogService.getAll as jest.Mock).mockResolvedValue(mockCashLogs);

    // Render both hooks sharing the same QueryClient
    const wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: queryResult } = renderHook(() => useCashLogs(), { wrapper });
    await waitFor(() => {
      expect(queryResult.current.isSuccess).toBe(true);
    });
    expect(cashLogService.getAll).toHaveBeenCalledTimes(1);

    const { result: mutationResult } = renderHook(() => useCreateCashLog(), {
      wrapper,
    });

    mutationResult.current.mutate(mockCashLogInput);

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    expect(mutationResult.current.data).toEqual(createdCashLog);
    expect(cashLogService.create).toHaveBeenCalledWith(mockCashLogInput);

    // After invalidation, the cash-logs query should refetch
    await waitFor(() => {
      expect(cashLogService.getAll).toHaveBeenCalledTimes(2);
    });
  });

  it('returns error when creation fails', async () => {
    const error = new Error('Failed to create cash log');
    (cashLogService.create as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateCashLog(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(mockCashLogInput);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(cashLogService.create).toHaveBeenCalledWith(mockCashLogInput);
  });
});

describe('useUpdateCashLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates a cash log and invalidates queries on success', async () => {
    const queryClient = createQueryClient();
    const updateInput = { id: 1, data: { description: 'Updated Lunch', amount: 40000 } };
    const updatedCashLog = { ...mockCashLogs[0], ...updateInput.data };

    (cashLogService.update as jest.Mock).mockResolvedValue(updatedCashLog);

    // Set up a query to observe invalidation
    (cashLogService.getAll as jest.Mock).mockResolvedValue(mockCashLogs);

    const wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: queryResult } = renderHook(() => useCashLogs(), { wrapper });
    await waitFor(() => {
      expect(queryResult.current.isSuccess).toBe(true);
    });
    expect(cashLogService.getAll).toHaveBeenCalledTimes(1);

    const { result: mutationResult } = renderHook(() => useUpdateCashLog(), {
      wrapper,
    });

    mutationResult.current.mutate(updateInput);

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    expect(mutationResult.current.data).toEqual(updatedCashLog);
    expect(cashLogService.update).toHaveBeenCalledWith(updateInput.id, updateInput.data);

    // After invalidation, the cash-logs query should refetch
    await waitFor(() => {
      expect(cashLogService.getAll).toHaveBeenCalledTimes(2);
    });
  });

  it('returns error when update fails', async () => {
    const error = new Error('Failed to update cash log');
    (cashLogService.update as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useUpdateCashLog(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 1, data: { description: 'Fail' } });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(cashLogService.update).toHaveBeenCalledWith(1, { description: 'Fail' });
  });
});

describe('useDeleteCashLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes a cash log and invalidates queries on success', async () => {
    const queryClient = createQueryClient();

    (cashLogService.remove as jest.Mock).mockResolvedValue({ success: true });

    // Set up a query to observe invalidation
    (cashLogService.getAll as jest.Mock).mockResolvedValue(mockCashLogs);

    const wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: queryResult } = renderHook(() => useCashLogs(), { wrapper });
    await waitFor(() => {
      expect(queryResult.current.isSuccess).toBe(true);
    });
    expect(cashLogService.getAll).toHaveBeenCalledTimes(1);

    const { result: mutationResult } = renderHook(() => useDeleteCashLog(), {
      wrapper,
    });

    mutationResult.current.mutate(1);

    await waitFor(() => {
      expect(mutationResult.current.isSuccess).toBe(true);
    });

    expect(mutationResult.current.data).toEqual({ success: true });
    expect(cashLogService.remove).toHaveBeenCalledWith(1);

    // After invalidation, cash-logs should refetch
    await waitFor(() => {
      expect(cashLogService.getAll).toHaveBeenCalledTimes(2);
    });
  });

  it('returns error when deletion fails', async () => {
    const error = new Error('Failed to delete cash log');
    (cashLogService.remove as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteCashLog(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(1);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(cashLogService.remove).toHaveBeenCalledWith(1);
  });
});
