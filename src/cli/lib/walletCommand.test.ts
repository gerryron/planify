import { describe, expect, it } from '@jest/globals';
import type { WalletListSnapshot } from '@/cli/services/walletsCliService';
import {
  buildWalletCommandSuggestions,
  resolveWalletCommandView,
} from './walletCommand';

const snapshot: WalletListSnapshot = {
  wallets: [
    {
      id: 1,
      name: 'Jenius',
      balance: 250_000,
      excludeFromTotal: false,
      walletKind: 'basic',
      goalAmount: null,
      goalDueMonth: null,
      creditLimit: null,
    },
    {
      id: 2,
      name: 'Jenius - Credit Card',
      balance: 900_000,
      excludeFromTotal: true,
      walletKind: 'credit_card',
      goalAmount: null,
      goalDueMonth: null,
      creditLimit: 5_000_000,
    },
    {
      id: 3,
      name: 'Jenius - Investment',
      balance: 1_500_000,
      excludeFromTotal: true,
      walletKind: 'basic',
      goalAmount: null,
      goalDueMonth: null,
      creditLimit: null,
    },
    {
      id: 4,
      name: 'Cash Wallet',
      balance: 750_000,
      excludeFromTotal: false,
      walletKind: 'basic',
      goalAmount: null,
      goalDueMonth: null,
      creditLimit: null,
    },
  ],
  trackedTotalBalance: 1_000_000,
  trackedWalletCount: 2,
  excludedWalletCount: 2,
};

describe('walletCommand', () => {
  it('shows generic wallet syntax suggestions before a filter is typed', () => {
    expect(buildWalletCommandSuggestions('/wallets', snapshot.wallets)).toEqual(
      [
        {
          value: '/wallets',
          label: '/wallets',
          description: 'Show all wallets.',
        },
        {
          value: '/wallets [number]',
          label: '/wallets [number]',
          description: 'Filter by the displayed wallet number.',
          insertValue: '/wallets ',
        },
        {
          value: '/wallets [wallet name]',
          label: '/wallets [wallet name]',
          description: 'Search wallets by name.',
          insertValue: '/wallets ',
        },
        {
          value: '/wallets [tracked/excluded]',
          label: '/wallets [tracked/excluded]',
          description: 'Continue with tracked or excluded.',
          insertValue: '/wallets ',
        },
      ],
    );
  });

  it('builds wallet suggestions for tracked, excluded, and matching names', () => {
    expect(
      buildWalletCommandSuggestions('/wallets jen', snapshot.wallets),
    ).toEqual(
      expect.arrayContaining([
        {
          value: '/wallets Jenius',
          label: 'Jenius',
          description: '#1 · Tracked · Basic · Balance Rp 250.000',
        },
        {
          value: '/wallets Jenius - Credit Card',
          label: 'Jenius - Credit Card',
          description: '#2 · Excluded · Credit Card · Outstanding Rp 900.000',
        },
        {
          value: '/wallets Jenius - Investment',
          label: 'Jenius - Investment',
          description: '#3 · Excluded · Basic · Balance Rp 1.500.000',
        },
      ]),
    );
  });

  it('builds wallet number suggestions when the query is numeric', () => {
    expect(
      buildWalletCommandSuggestions('/wallets 2', snapshot.wallets),
    ).toEqual(
      expect.arrayContaining([
        {
          value: '/wallets 2',
          label: '/wallets 2',
          description: 'Jenius - Credit Card · Outstanding Rp 900.000',
        },
      ]),
    );
  });

  it('filters to tracked wallets', () => {
    const result = resolveWalletCommandView(snapshot, ['tracked']);

    expect(result).toEqual({
      ok: true,
      view: {
        mode: 'tracked',
        snapshot: {
          wallets: [snapshot.wallets[0], snapshot.wallets[3]],
          trackedTotalBalance: 1_000_000,
          trackedWalletCount: 2,
          excludedWalletCount: 0,
        },
        summaryLabel: 'Showing tracked wallets only.',
        statusMessage: 'Showing 2 tracked wallet(s).',
      },
    });
  });

  it('filters by wallet number', () => {
    const result = resolveWalletCommandView(snapshot, ['2']);

    expect(result).toEqual({
      ok: true,
      view: {
        mode: 'index',
        snapshot: {
          wallets: [snapshot.wallets[1]],
          trackedTotalBalance: 0,
          trackedWalletCount: 0,
          excludedWalletCount: 1,
        },
        summaryLabel: 'Showing wallet #2.',
        statusMessage: 'Showing wallet #2: Jenius - Credit Card.',
      },
    });
  });

  it('filters wallets by name fragments', () => {
    const result = resolveWalletCommandView(snapshot, ['jenius']);

    expect(result).toEqual({
      ok: true,
      view: {
        mode: 'query',
        snapshot: {
          wallets: [
            snapshot.wallets[0],
            snapshot.wallets[1],
            snapshot.wallets[2],
          ],
          trackedTotalBalance: 250_000,
          trackedWalletCount: 1,
          excludedWalletCount: 2,
        },
        summaryLabel: 'Search: jenius',
        statusMessage: 'Showing 3 wallet(s) matching "jenius".',
      },
    });
  });

  it('returns a warning when no wallet matches the query', () => {
    expect(resolveWalletCommandView(snapshot, ['unknown'])).toEqual({
      ok: false,
      message:
        'No wallets matched "unknown". Try /wallets, /wallets tracked, /wallets excluded, or /wallets <number>.',
    });
  });
});
