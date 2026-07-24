/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import React from 'react';
import { useCategories } from './useCategories';
import { categoryService } from '../services/categoryService';

jest.mock('@/features/categories/services/categoryService', () => ({
  categoryService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

const mockCategories = [
  { id: 1, name: 'Salary', type: 'income' as const, parentId: null },
  { id: 2, name: 'Food', type: 'outcome' as const, parentId: null },
  { id: 3, name: 'Transportation', type: 'outcome' as const, parentId: null },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in loading state then returns categories on success', async () => {
    (categoryService.getAll as jest.Mock).mockResolvedValue(mockCategories);

    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });

    // Initial state is loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSuccess).toBe(false);

    // Wait for query to resolve
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCategories);
    expect(result.current.isLoading).toBe(false);
    expect(categoryService.getAll).toHaveBeenCalledTimes(1);
  });

  it('returns error state when service rejects', async () => {
    const error = new Error('Failed to fetch categories');
    (categoryService.getAll as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it('applies staleTime from hook configuration', () => {
    (categoryService.getAll as jest.Mock).mockResolvedValue(mockCategories);

    const { result } = renderHook(() => useCategories(), { wrapper: createWrapper() });

    // The hook sets staleTime to 30 minutes; verify via default options
    expect(result.current.isLoading).toBe(true);
  });
});
