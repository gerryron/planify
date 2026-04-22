import { formatRupiah, getWalletKindLabel } from '@/cli/lib/formatters';
import type {
  WalletListItem,
  WalletListSnapshot,
} from '@/cli/services/walletsCliService';

export type WalletCommandSuggestion = {
  value: string;
  label: string;
  description: string;
  insertValue?: string;
};

export type WalletCommandView = {
  mode: 'all' | 'tracked' | 'excluded' | 'index' | 'query';
  snapshot: WalletListSnapshot;
  summaryLabel: string;
  statusMessage: string;
};

export type WalletCommandViewResult =
  | {
      ok: true;
      view: WalletCommandView;
    }
  | {
      ok: false;
      message: string;
    };

function summarizeWallets(wallets: WalletListItem[]): WalletListSnapshot {
  return {
    wallets,
    trackedTotalBalance: wallets
      .filter((wallet) => !wallet.excludeFromTotal)
      .reduce((sum, wallet) => sum + wallet.balance, 0),
    trackedWalletCount: wallets.filter((wallet) => !wallet.excludeFromTotal)
      .length,
    excludedWalletCount: wallets.filter((wallet) => wallet.excludeFromTotal)
      .length,
  };
}

function matchesWalletName(wallet: WalletListItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const walletName = wallet.name.toLowerCase();
  return normalizedQuery
    .split(/\s+/)
    .every((token) => walletName.includes(token));
}

function createWalletDescriptor(wallet: WalletListItem, index: number) {
  const balanceLabel =
    wallet.walletKind === 'credit_card' ? 'Outstanding' : 'Balance';

  return `#${index + 1} · ${wallet.excludeFromTotal ? 'Excluded' : 'Tracked'} · ${getWalletKindLabel(wallet.walletKind)} · ${balanceLabel} ${formatRupiah(wallet.balance)}`;
}

export function buildWalletCommandSuggestions(
  input: string,
  wallets: WalletListItem[],
): WalletCommandSuggestion[] {
  const trimmed = input.trim();
  if (!(trimmed === '/wallets' || trimmed.startsWith('/wallets '))) {
    return [];
  }

  const rawQuery = trimmed.slice('/wallets'.length).trim();
  const normalizedQuery = rawQuery.toLowerCase();
  const suggestions: WalletCommandSuggestion[] = [];
  const seenValues = new Set<string>();

  const pushSuggestion = (suggestion: WalletCommandSuggestion) => {
    if (seenValues.has(suggestion.value)) {
      return;
    }

    seenValues.add(suggestion.value);
    suggestions.push(suggestion);
  };

  if (!rawQuery) {
    pushSuggestion({
      value: '/wallets',
      label: '/wallets',
      description: 'Show all wallets.',
    });

    pushSuggestion({
      value: '/wallets [number]',
      label: '/wallets [number]',
      description: 'Filter by the displayed wallet number.',
      insertValue: '/wallets ',
    });

    pushSuggestion({
      value: '/wallets [wallet name]',
      label: '/wallets [wallet name]',
      description: 'Search wallets by name.',
      insertValue: '/wallets ',
    });

    pushSuggestion({
      value: '/wallets [tracked/excluded]',
      label: '/wallets [tracked/excluded]',
      description: 'Continue with tracked or excluded.',
      insertValue: '/wallets ',
    });

    return suggestions;
  }

  if ('tracked'.startsWith(normalizedQuery)) {
    pushSuggestion({
      value: '/wallets tracked',
      label: '/wallets tracked',
      description: 'Show only wallets counted in the tracked total.',
    });
  }

  if ('excluded'.startsWith(normalizedQuery)) {
    pushSuggestion({
      value: '/wallets excluded',
      label: '/wallets excluded',
      description: 'Show only wallets excluded from the tracked total.',
    });
  }

  if (/^\d+$/.test(normalizedQuery)) {
    wallets.forEach((wallet, index) => {
      const walletIndex = String(index + 1);
      if (!walletIndex.startsWith(normalizedQuery)) {
        return;
      }

      pushSuggestion({
        value: `/wallets ${walletIndex}`,
        label: `/wallets ${walletIndex}`,
        description: `${wallet.name} · ${wallet.walletKind === 'credit_card' ? 'Outstanding' : 'Balance'} ${formatRupiah(wallet.balance)}`,
      });
    });
  }

  wallets
    .map((wallet, index) => ({ wallet, index }))
    .filter(({ wallet }) => matchesWalletName(wallet, rawQuery))
    .slice(0, 6)
    .forEach(({ wallet, index }) => {
      pushSuggestion({
        value: `/wallets ${wallet.name}`,
        label: wallet.name,
        description: createWalletDescriptor(wallet, index),
      });
    });

  return suggestions.slice(0, 8);
}

export function resolveWalletCommandView(
  snapshot: WalletListSnapshot,
  args: string[],
): WalletCommandViewResult {
  const rawQuery = args.join(' ').trim();
  const normalizedQuery = rawQuery.toLowerCase();

  if (!rawQuery) {
    return {
      ok: true,
      view: {
        mode: 'all',
        snapshot,
        summaryLabel: 'Showing all wallets.',
        statusMessage:
          snapshot.wallets.length > 0
            ? `Loaded ${snapshot.wallets.length} wallet(s).`
            : 'No wallets found for this account.',
      },
    };
  }

  if (normalizedQuery === 'tracked') {
    const wallets = snapshot.wallets.filter(
      (wallet) => !wallet.excludeFromTotal,
    );
    if (wallets.length === 0) {
      return {
        ok: false,
        message: 'No tracked wallets found for this account.',
      };
    }

    return {
      ok: true,
      view: {
        mode: 'tracked',
        snapshot: summarizeWallets(wallets),
        summaryLabel: 'Showing tracked wallets only.',
        statusMessage: `Showing ${wallets.length} tracked wallet(s).`,
      },
    };
  }

  if (normalizedQuery === 'excluded') {
    const wallets = snapshot.wallets.filter(
      (wallet) => wallet.excludeFromTotal,
    );
    if (wallets.length === 0) {
      return {
        ok: false,
        message: 'No excluded wallets found for this account.',
      };
    }

    return {
      ok: true,
      view: {
        mode: 'excluded',
        snapshot: summarizeWallets(wallets),
        summaryLabel: 'Showing excluded wallets only.',
        statusMessage: `Showing ${wallets.length} excluded wallet(s).`,
      },
    };
  }

  if (/^\d+$/.test(rawQuery)) {
    const walletIndex = Number.parseInt(rawQuery, 10);
    const selectedWallet = snapshot.wallets[walletIndex - 1];
    if (!selectedWallet) {
      return {
        ok: false,
        message: `Wallet number ${walletIndex} was not found. Try /wallets to see the available numbering.`,
      };
    }

    return {
      ok: true,
      view: {
        mode: 'index',
        snapshot: summarizeWallets([selectedWallet]),
        summaryLabel: `Showing wallet #${walletIndex}.`,
        statusMessage: `Showing wallet #${walletIndex}: ${selectedWallet.name}.`,
      },
    };
  }

  const matchedWallets = snapshot.wallets.filter((wallet) =>
    matchesWalletName(wallet, rawQuery),
  );

  if (matchedWallets.length === 0) {
    return {
      ok: false,
      message: `No wallets matched "${rawQuery}". Try /wallets, /wallets tracked, /wallets excluded, or /wallets <number>.`,
    };
  }

  return {
    ok: true,
    view: {
      mode: matchedWallets.length === 1 ? 'index' : 'query',
      snapshot: summarizeWallets(matchedWallets),
      summaryLabel: `Search: ${rawQuery}`,
      statusMessage:
        matchedWallets.length === 1
          ? `Showing wallet: ${matchedWallets[0].name}.`
          : `Showing ${matchedWallets.length} wallet(s) matching "${rawQuery}".`,
    },
  };
}
