import React from 'react';
import { Badge } from '@inkjs/ui';
import { Box, Text } from 'ink';
import { formatRupiah, getWalletKindLabel } from '@/cli/lib/formatters';
import type { WalletListSnapshot } from '@/cli/services/walletsCliService';

type WalletsPanelProps = {
  snapshot: WalletListSnapshot;
};

function getKindColor(walletKind: 'basic' | 'goal' | 'credit_card') {
  if (walletKind === 'goal') {
    return 'yellow';
  }

  if (walletKind === 'credit_card') {
    return 'red';
  }

  return 'green';
}

export default function WalletsPanel({ snapshot }: WalletsPanelProps) {
  if (snapshot.wallets.length === 0) {
    return (
      <Box flexDirection='column'>
        <Text bold color='yellow'>
          No wallets found
        </Text>
        <Text dimColor>
          Create wallets from the web app first, then run /wallets again.
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection='column'>
      <Text bold color={snapshot.trackedTotalBalance >= 0 ? 'green' : 'red'}>
        Tracked total balance: {formatRupiah(snapshot.trackedTotalBalance)}
      </Text>
      <Text dimColor>
        {snapshot.wallets.length} wallet(s) · {snapshot.trackedWalletCount}{' '}
        tracked · {snapshot.excludedWalletCount} excluded
      </Text>

      {snapshot.wallets.map((wallet, index) => (
        <Box
          key={wallet.id}
          flexDirection='column'
          marginTop={index === 0 ? 1 : 0}
          marginBottom={1}
        >
          <Text bold>{wallet.name}</Text>
          <Box gap={1}>
            <Badge color={getKindColor(wallet.walletKind)}>
              {getWalletKindLabel(wallet.walletKind)}
            </Badge>
            <Badge color={wallet.excludeFromTotal ? 'yellow' : 'green'}>
              {wallet.excludeFromTotal ? 'Excluded' : 'Tracked'}
            </Badge>
          </Box>

          <Text color={wallet.balance < 0 ? 'red' : 'green'}>
            {wallet.walletKind === 'credit_card'
              ? 'Outstanding: '
              : 'Balance: '}
            {formatRupiah(wallet.balance)}
          </Text>

          {wallet.goalAmount ? (
            <Text dimColor>
              Goal target: {formatRupiah(wallet.goalAmount)}
              {wallet.goalDueMonth ? ` by ${wallet.goalDueMonth}` : ''}
            </Text>
          ) : null}

          {wallet.creditLimit ? (
            <Text dimColor>
              Credit limit: {formatRupiah(wallet.creditLimit)}
            </Text>
          ) : null}
        </Box>
      ))}
    </Box>
  );
}
