/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import type { Wallets } from '@/features/wallets/services/walletsService';
import { walletsService } from '@/features/wallets/services/walletsService';
import { useWalletDragDrop } from './useWalletDragDrop';

jest.mock('@/features/wallets/services/walletsService', () => ({
  walletsService: {
    update: jest.fn().mockResolvedValue(undefined),
    reorder: jest.fn().mockResolvedValue(undefined),
  },
}));

function makeWallet(overrides: Partial<Wallets> = {}): Wallets {
  return {
    id: 1,
    name: 'Cash',
    balance: 1000,
    excludeFromTotal: false,
    walletKind: 'basic',
    goalAmount: null,
    goalStartMonth: null,
    goalDueMonth: null,
    creditLimit: null,
    statementDay: null,
    dueDay: null,
    ...overrides,
  };
}

type DragEventLike = {
  active: { id: string | number };
  over: { id: string | number } | null;
};

describe('useWalletDragDrop', () => {
  const wallets: Wallets[] = [
    makeWallet({ id: 1, name: 'Cash' }),
    makeWallet({ id: 2, name: 'Goal', walletKind: 'goal', excludeFromTotal: true }),
  ];

  let setWallets: jest.Mock;
  let fetchWallets: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    setWallets = jest.fn();
    fetchWallets = jest.fn().mockResolvedValue(undefined);
  });

  function setup() {
    return renderHook(() => useWalletDragDrop(wallets, setWallets, fetchWallets));
  }

  it('should track the hovered section for zone ids', () => {
    const { result } = setup();

    act(() => {
      result.current.handleDragOver({ over: { id: 'include-zone' } } as never);
    });
    expect(result.current.dragOverSection).toBe('include');

    act(() => {
      result.current.handleDragOver({ over: { id: 'exclude-zone' } } as never);
    });
    expect(result.current.dragOverSection).toBe('exclude');

    act(() => {
      result.current.handleDragOver({ over: null } as never);
    });
    expect(result.current.dragOverSection).toBeNull();
  });

  it('should track the hovered section from the hovered wallet', () => {
    const { result } = setup();

    act(() => {
      result.current.handleDragOver({ over: { id: '2' } } as never);
    });
    expect(result.current.dragOverSection).toBe('exclude');

    act(() => {
      result.current.handleDragOver({ over: { id: '1' } } as never);
    });
    expect(result.current.dragOverSection).toBe('include');

    act(() => {
      result.current.handleDragOver({ over: { id: '999' } } as never);
    });
    expect(result.current.dragOverSection).toBeNull();
  });

  it('should persist a move onto the include zone', async () => {
    const { result } = setup();
    const event: DragEventLike = { active: { id: 2 }, over: { id: 'include-zone' } };

    await act(async () => {
      await result.current.handleDragEnd(event as never);
    });

    expect(walletsService.update).toHaveBeenCalledWith(2, {
      excludeFromTotal: false,
    });
    expect(walletsService.reorder).toHaveBeenCalledWith([1, 2]);
    // Goal moves to the end of the included section: [Cash, Goal].
    expect(setWallets).toHaveBeenCalledWith([
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ id: 2, excludeFromTotal: false }),
    ]);
    expect(fetchWallets).toHaveBeenCalledTimes(1);
    expect(result.current.dragOverSection).toBeNull();
  });

  it('should persist a move onto the exclude zone', async () => {
    const { result } = setup();
    const event: DragEventLike = { active: { id: 1 }, over: { id: 'exclude-zone' } };

    await act(async () => {
      await result.current.handleDragEnd(event as never);
    });

    expect(walletsService.update).toHaveBeenCalledWith(1, {
      excludeFromTotal: true,
    });
    expect(walletsService.reorder).toHaveBeenCalledWith([2, 1]);
  });

  it('should reorder without an update when the section does not change', async () => {
    const twoIncluded = [
      makeWallet({ id: 1, name: 'Cash' }),
      makeWallet({ id: 2, name: 'BCA' }),
    ];
    const { result } = renderHook(() =>
      useWalletDragDrop(twoIncluded, setWallets, fetchWallets),
    );
    const event: DragEventLike = { active: { id: 1 }, over: { id: 2 } };

    await act(async () => {
      await result.current.handleDragEnd(event as never);
    });

    expect(walletsService.update).not.toHaveBeenCalled();
    expect(walletsService.reorder).toHaveBeenCalledWith([2, 1]);
  });

  it('should ignore a drop onto itself without a section change', async () => {
    const { result } = setup();
    const event: DragEventLike = { active: { id: 1 }, over: { id: 1 } };

    await act(async () => {
      await result.current.handleDragEnd(event as never);
    });

    expect(walletsService.reorder).not.toHaveBeenCalled();
    expect(walletsService.update).not.toHaveBeenCalled();
    expect(fetchWallets).not.toHaveBeenCalled();
    expect(result.current.dragOverSection).toBeNull();
  });

  it('should ignore a drag of an unknown wallet', async () => {
    const { result } = setup();
    const event: DragEventLike = { active: { id: 999 }, over: { id: 'include-zone' } };

    await act(async () => {
      await result.current.handleDragEnd(event as never);
    });

    expect(walletsService.reorder).not.toHaveBeenCalled();
    expect(walletsService.update).not.toHaveBeenCalled();
    expect(result.current.dragOverSection).toBeNull();
  });

  it('should not move a credit card into the include zone', async () => {
    const withCard = [
      ...wallets,
      makeWallet({ id: 3, name: 'Card', walletKind: 'credit_card', excludeFromTotal: true }),
    ];
    const { result } = renderHook(() =>
      useWalletDragDrop(withCard, setWallets, fetchWallets),
    );
    const event: DragEventLike = { active: { id: 3 }, over: { id: 'include-zone' } };

    await act(async () => {
      await result.current.handleDragEnd(event as never);
    });

    expect(walletsService.update).not.toHaveBeenCalled();
    expect(walletsService.reorder).not.toHaveBeenCalled();
  });

  it('should reset the hovered section on cancel', () => {
    const { result } = setup();

    act(() => {
      result.current.handleDragOver({ over: { id: 'include-zone' } } as never);
    });
    expect(result.current.dragOverSection).toBe('include');

    act(() => {
      result.current.handleDragCancel();
    });
    expect(result.current.dragOverSection).toBeNull();
  });
});
