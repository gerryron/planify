/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import React from 'react';
import { useWallets, useWallet } from './useWallets';
import { walletsService } from '../services/walletsService';

jest.mock('@/features/wallets/services/walletsService', () => ({
  walletsService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    reorder: jest.fn(),
    transfer: jest.fn(),
  },
}));

const mockWallets = [
  {
    id: 1,
    name: 'Cash',
    balance: 100000,
    excludeFromTotal: false,
    walletKind: 'basic' as const,
    goalAmount: null,
    goalStartMonth: null,
    goalDueMonth: null,
    creditLimit: null,
    statementDay: null,
    dueDay: null,
  },
  {
    id: 2,
    name: 'BCA',
    balance: 2000000,
    excludeFromTotal: false,
    walletKind: 'basic' as const,
    goalAmount: null,
    goalStartMonth: null,
    goalDueMonth: null,
    creditLimit: null,
    statementDay: null,
    dueDay: null,
  },
];

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

describe('useWallets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in loading state then returns data on success', async () => {
    (walletsService.getAll as jest.Mock).mockResolvedValue(mockWallets);

    const { result } = renderHook(() => useWallets(), { wrapper: createWrapper() });

    // Initial state is loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSuccess).toBe(false);

    // Wait for query to resolve
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockWallets);
    expect(result.current.isLoading).toBe(false);
    expect(walletsService.getAll).toHaveBeenCalledTimes(1);
  });

  it('returns error state when service rejects', async () => {
    const error = new Error('Failed to fetch wallets');
    (walletsService.getAll as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useWallets(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.data).toBeUndefined();
  });

  it('refetches when wallets query is invalidated', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 300_000 },
        mutations: { retry: false },
      },
    });

    (walletsService.getAll as jest.Mock).mockResolvedValue(mockWallets);

    const { result } = renderHook(() => useWallets(), {
      wrapper: ({ children }: { children: ReactNode }) =>
        React.createElement(QueryClientProvider, { client: queryClient }, children),
    });

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(mockWallets);
    expect(walletsService.getAll).toHaveBeenCalledTimes(1);

    // Change mock to return different data
    const singleWallet = [mockWallets[0]];
    (walletsService.getAll as jest.Mock).mockResolvedValue(singleWallet);

    // Await invalidation then wait for data to update
    await queryClient.invalidateQueries({ queryKey: ['wallets'] });

    await waitFor(() => {
      expect(result.current.data).toEqual(singleWallet);
    });
    expect(walletsService.getAll).toHaveBeenCalledTimes(2);
  });
});

describe('useWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the wallet when found by id', async () => {
    (walletsService.getAll as jest.Mock).mockResolvedValue(mockWallets);

    const { result } = renderHook(() => useWallet(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockWallets[0]);
    expect(walletsService.getAll).toHaveBeenCalledTimes(1);
  });

  it('returns error when wallet id does not exist', async () => {
    (walletsService.getAll as jest.Mock).mockResolvedValue(mockWallets);

    const { result } = renderHook(() => useWallet(999), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Wallet 999 not found');
    expect(walletsService.getAll).toHaveBeenCalledTimes(1);
  });
});
