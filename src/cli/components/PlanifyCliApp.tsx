import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Spinner } from '@inkjs/ui';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import {
  getCommandCatalog,
  getCommandSuggestions,
  parseSlashCommand,
} from '@/cli/lib/commands';
import { formatRupiah, getWalletKindLabel } from '@/cli/lib/formatters';
import {
  buildWalletCommandSuggestions,
  resolveWalletCommandView,
  type WalletCommandSuggestion,
  type WalletCommandView,
} from '@/cli/lib/walletCommand';
import {
  clearCliSession,
  loadCliSession,
  saveCliSession,
  saveCliSessionSync,
} from '@/cli/lib/sessionStore';
import {
  loginCliUser,
  validateCliSession,
} from '@/cli/services/authCliService';
import {
  listWalletsForUser,
  type WalletListSnapshot,
} from '@/cli/services/walletsCliService';
import type { StoredCliSession } from '@/cli/types';

type PlanifyCliAppProps = {
  smokeTest?: boolean;
};

type HistoryItem =
  | {
      id: string;
      kind: 'command';
      text: string;
    }
  | {
      id: string;
      kind: 'status';
      text: string;
      variant: 'success' | 'error' | 'warning' | 'info';
    };

type HistoryInput =
  | {
      kind: 'command';
      text: string;
    }
  | {
      kind: 'status';
      text: string;
      variant: 'success' | 'error' | 'warning' | 'info';
    };

type ActivePanel =
  | { kind: 'help' }
  | { kind: 'wallets'; view: WalletCommandView }
  | null;

type InputMode = 'command' | 'login-email' | 'login-password';

type OutputColor = 'green' | 'white';

type OutputSegment = {
  text: string;
  color?: OutputColor;
  bold?: boolean;
  dimColor?: boolean;
};

type OutputRow = {
  id: string;
  segments: OutputSegment[];
  showSystemMarker?: boolean;
};

function createRow(
  id: string,
  text: string,
  options?: {
    color?: OutputColor;
    bold?: boolean;
    dimColor?: boolean;
    showSystemMarker?: boolean;
  },
): OutputRow {
  return {
    id,
    showSystemMarker: options?.showSystemMarker,
    segments: [
      {
        text,
        color: options?.color ?? 'white',
        bold: options?.bold,
        dimColor: options?.dimColor,
      },
    ],
  };
}

function createBlankRow(id: string): OutputRow {
  return {
    id,
    segments: [{ text: ' ' }],
  };
}

function createIndentedRow(
  id: string,
  text: string,
  options?: { dimColor?: boolean },
): OutputRow {
  return createRow(id, `  ${text}`, {
    dimColor: options?.dimColor,
  });
}

function fitPanelContent(text: string, width: number) {
  if (width <= 0) {
    return '';
  }

  if (text.length <= width) {
    return text.padEnd(width, ' ');
  }

  if (width === 1) {
    return '…';
  }

  return `${text.slice(0, width - 1)}…`;
}

function fitCenteredPanelContent(text: string, width: number) {
  if (width <= 0) {
    return '';
  }

  if (text.length > width) {
    return fitPanelContent(text, width);
  }

  const totalPadding = width - text.length;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;

  return `${' '.repeat(leftPadding)}${text}${' '.repeat(rightPadding)}`;
}

function createPanelTopBorderRow(id: string, shellWidth: number): OutputRow {
  const innerWidth = Math.max(shellWidth - 2, 10);

  return createRow(id, `╭${'─'.repeat(innerWidth)}╮`, {
    color: 'green',
  });
}

function createPanelBottomBorderRow(id: string, shellWidth: number): OutputRow {
  const innerWidth = Math.max(shellWidth - 2, 10);

  return createRow(id, `╰${'─'.repeat(innerWidth)}╯`, {
    color: 'green',
  });
}

function createPanelContentRow(
  id: string,
  shellWidth: number,
  text: string,
  options?: {
    bold?: boolean;
    dimColor?: boolean;
  },
): OutputRow {
  const innerWidth = Math.max(shellWidth - 2, 10);
  const content = fitPanelContent(` ${text}`, innerWidth);

  return {
    id,
    segments: [
      { text: '│', color: 'green' },
      {
        text: content,
        color: 'white',
        bold: options?.bold,
        dimColor: options?.dimColor,
      },
      { text: '│', color: 'green' },
    ],
  };
}

function createPanelAccentRow(
  id: string,
  shellWidth: number,
  text: string,
): OutputRow {
  const innerWidth = Math.max(shellWidth - 2, 10);
  const content = fitPanelContent(` ${text.toUpperCase()}`, innerWidth);

  return {
    id,
    segments: [
      { text: '│', color: 'green' },
      {
        text: content,
        color: 'green',
        bold: true,
      },
      { text: '│', color: 'green' },
    ],
  };
}

function createCenteredPanelValueRow(
  id: string,
  shellWidth: number,
  text: string,
): OutputRow {
  const innerWidth = Math.max(shellWidth - 2, 10);
  const content = fitCenteredPanelContent(text, innerWidth);

  return {
    id,
    segments: [
      { text: '│', color: 'green' },
      {
        text: content,
        color: 'white',
        bold: true,
      },
      { text: '│', color: 'green' },
    ],
  };
}

function createPanelKeyValueRow(
  id: string,
  shellWidth: number,
  label: string,
  value: string,
  options?: {
    bold?: boolean;
    dimColor?: boolean;
  },
): OutputRow {
  return createPanelContentRow(
    id,
    shellWidth,
    `${label.padEnd(12, ' ')} ${value}`,
    options,
  );
}

function createSectionRow(id: string, title: string): OutputRow {
  return createRow(id, title, {
    color: 'green',
    bold: true,
  });
}

function createSpacerRow(id: string, width: number): OutputRow {
  return {
    id,
    segments: [{ text: ' '.repeat(Math.max(width, 1)) }],
  };
}

function buildWalletSectionHeaderRows(
  groupId: string,
  title: string,
  caption: string,
  panelWidth: number,
): OutputRow[] {
  return [
    createPanelTopBorderRow(`${groupId}-section-top`, panelWidth),
    createPanelAccentRow(`${groupId}-section-title`, panelWidth, title),
    createPanelContentRow(`${groupId}-section-caption`, panelWidth, caption, {
      dimColor: true,
    }),
    createPanelBottomBorderRow(`${groupId}-section-bottom`, panelWidth),
    createSpacerRow(`${groupId}-section-gap`, panelWidth),
  ];
}

function combineColumnRows(
  idPrefix: string,
  leftRows: OutputRow[],
  rightRows: OutputRow[],
  leftWidth: number,
  rightWidth: number,
): OutputRow[] {
  const rowCount = Math.max(leftRows.length, rightRows.length);

  return Array.from({ length: rowCount }, (_, index) => ({
    id: `${idPrefix}-${index}`,
    segments: [
      ...(leftRows[index]?.segments ??
        createSpacerRow('left-spacer', leftWidth).segments),
      { text: '   ' },
      ...(rightRows[index]?.segments ??
        createSpacerRow('right-spacer', rightWidth).segments),
    ],
  }));
}

function buildWalletColumnRows(
  groupId: string,
  title: string,
  caption: string,
  wallets: WalletListSnapshot['wallets'],
  startIndex: number,
  panelWidth: number,
): OutputRow[] {
  const rows: OutputRow[] = [
    ...buildWalletSectionHeaderRows(groupId, title, caption, panelWidth),
  ];

  if (wallets.length === 0) {
    rows.push(
      createPanelTopBorderRow(`${groupId}-empty-top`, panelWidth),
      createPanelContentRow(
        `${groupId}-empty-state`,
        panelWidth,
        'No wallets in this column.',
        { dimColor: true },
      ),
      createPanelBottomBorderRow(`${groupId}-empty-bottom`, panelWidth),
    );

    return rows;
  }

  rows.push(...buildWalletCardRows(groupId, wallets, startIndex, panelWidth));

  return rows;
}

function buildWalletCardRows(
  groupId: string,
  wallets: WalletListSnapshot['wallets'],
  startIndex: number,
  shellWidth: number,
): OutputRow[] {
  const rows: OutputRow[] = [];

  wallets.forEach((wallet, index) => {
    const walletNumber = String(startIndex + index + 1).padStart(2, '0');

    rows.push(
      createPanelTopBorderRow(`${groupId}-${wallet.id}-top`, shellWidth),
      createPanelContentRow(
        `${groupId}-${wallet.id}-name`,
        shellWidth,
        `[${walletNumber}] ${wallet.name}`,
        {
          bold: true,
        },
      ),
      createPanelKeyValueRow(
        `${groupId}-${wallet.id}-kind`,
        shellWidth,
        'Type',
        getWalletKindLabel(wallet.walletKind),
        { dimColor: true },
      ),
      createPanelKeyValueRow(
        `${groupId}-${wallet.id}-status`,
        shellWidth,
        'Status',
        wallet.excludeFromTotal ? 'Excluded from total' : 'Tracked in total',
        { dimColor: true },
      ),
      createPanelKeyValueRow(
        `${groupId}-${wallet.id}-balance`,
        shellWidth,
        wallet.walletKind === 'credit_card' ? 'Outstanding' : 'Balance',
        formatRupiah(wallet.balance),
        { bold: true },
      ),
    );

    if (wallet.goalAmount) {
      rows.push(
        createPanelKeyValueRow(
          `${groupId}-${wallet.id}-goal`,
          shellWidth,
          'Goal target',
          `${formatRupiah(wallet.goalAmount)}${wallet.goalDueMonth ? ` by ${wallet.goalDueMonth}` : ''}`,
          { dimColor: true },
        ),
      );
    }

    if (wallet.creditLimit) {
      rows.push(
        createPanelKeyValueRow(
          `${groupId}-${wallet.id}-credit-limit`,
          shellWidth,
          'Credit limit',
          formatRupiah(wallet.creditLimit),
          { dimColor: true },
        ),
      );
    }

    rows.push(
      createPanelBottomBorderRow(`${groupId}-${wallet.id}-bottom`, shellWidth),
      createSpacerRow(`${groupId}-${wallet.id}-gap`, shellWidth),
    );
  });

  return rows;
}

function createHeaderLine(
  id: string,
  shellWidth: number,
  text: string,
): OutputRow {
  const contentWidth = Math.max(shellWidth - 2, 10);
  const content = ` ${text}`.padEnd(contentWidth, ' ').slice(0, contentWidth);

  return {
    id,
    segments: [
      { text: '│', color: 'green' },
      { text: content, color: 'white' },
      { text: '│', color: 'green' },
    ],
  };
}

function buildHeaderRows(
  shellWidth: number,
  session: StoredCliSession | null,
): OutputRow[] {
  const innerWidth = Math.max(shellWidth - 2, 10);

  return [
    createRow('header-top-border', `╭${'─'.repeat(innerWidth)}╮`, {
      color: 'green',
    }),
    createHeaderLine('header-title', shellWidth, '◢◣ Planify CLI'),
    createHeaderLine(
      'header-subtitle',
      shellWidth,
      'Finance command center · slash shell',
    ),
    createHeaderLine(
      'header-session',
      shellWidth,
      session ? `Session: ${session.user.email}` : 'Session: guest mode',
    ),
    createRow('header-bottom-border', `╰${'─'.repeat(innerWidth)}╯`, {
      color: 'green',
    }),
  ];
}

function buildHelpRows(): OutputRow[] {
  return [];
}

function buildAuthRows(
  inputMode: InputMode,
  pendingEmail: string,
): OutputRow[] {
  const isPasswordStep = inputMode === 'login-password';

  return [
    createRow('auth-title', 'Authentication', {
      bold: true,
    }),
    createIndentedRow(
      'auth-description',
      isPasswordStep
        ? `Enter the password for ${pendingEmail} in the prompt below.`
        : 'Enter your email in the prompt below to sign in.',
    ),
    createIndentedRow(
      'auth-hint',
      isPasswordStep
        ? 'Password stays masked while you type.'
        : 'Press Esc any time to cancel the login flow.',
      { dimColor: true },
    ),
  ];
}

function buildWalletRows(
  view: WalletCommandView,
  shellWidth: number,
): OutputRow[] {
  const minTwoColumnWidth = 92;
  const snapshot = view.snapshot;

  if (snapshot.wallets.length === 0) {
    return [
      createSectionRow('wallet-empty-title', 'Wallet Overview'),
      createPanelTopBorderRow('wallet-empty-top', shellWidth),
      createPanelContentRow(
        'wallet-empty-status',
        shellWidth,
        'No wallets found',
        {
          bold: true,
        },
      ),
      createPanelContentRow(
        'wallet-empty-description',
        shellWidth,
        'Create wallets from the web app first, then run /wallets again.',
        { dimColor: true },
      ),
      createPanelBottomBorderRow('wallet-empty-bottom', shellWidth),
      createBlankRow('wallet-empty-gap'),
    ];
  }

  const trackedWallets = snapshot.wallets.filter(
    (wallet) => !wallet.excludeFromTotal,
  );
  const excludedWallets = snapshot.wallets.filter(
    (wallet) => wallet.excludeFromTotal,
  );

  const rows: OutputRow[] = [
    createSectionRow('wallet-overview-title', 'Wallet Overview'),
    createPanelTopBorderRow('wallet-summary-top', shellWidth),
    createPanelAccentRow('wallet-total-label', shellWidth, 'Tracked total'),
    createCenteredPanelValueRow(
      'wallet-total-value',
      shellWidth,
      formatRupiah(snapshot.trackedTotalBalance),
    ),
    createPanelContentRow(
      'wallet-summary',
      shellWidth,
      `${snapshot.wallets.length} wallets total · ${snapshot.trackedWalletCount} tracked · ${snapshot.excludedWalletCount} excluded`,
      { dimColor: true },
    ),
    createPanelContentRow(
      'wallet-summary-label',
      shellWidth,
      view.summaryLabel,
      { dimColor: true },
    ),
    createPanelBottomBorderRow('wallet-summary-bottom', shellWidth),
    createBlankRow('wallet-summary-gap'),
  ];

  if (view.mode === 'all' && shellWidth >= minTwoColumnWidth) {
    const columnGapWidth = 3;
    const leftWidth = Math.floor((shellWidth - columnGapWidth) / 2);
    const rightWidth = shellWidth - columnGapWidth - leftWidth;
    const trackedColumnRows = buildWalletColumnRows(
      'tracked-wallets',
      `Tracked Wallets (${trackedWallets.length})`,
      'Counted inside the tracked total balance.',
      trackedWallets,
      0,
      leftWidth,
    );
    const excludedColumnRows = buildWalletColumnRows(
      'excluded-wallets',
      `Excluded Wallets (${excludedWallets.length})`,
      'Shown for reference only. Not counted in tracked total.',
      excludedWallets,
      trackedWallets.length,
      rightWidth,
    );

    rows.push(
      ...combineColumnRows(
        'wallet-columns',
        trackedColumnRows,
        excludedColumnRows,
        leftWidth,
        rightWidth,
      ),
    );

    return rows;
  }

  if (trackedWallets.length > 0) {
    rows.push(
      ...buildWalletSectionHeaderRows(
        'tracked-wallets',
        `Tracked Wallets (${trackedWallets.length})`,
        'Counted inside the tracked total balance.',
        shellWidth,
      ),
      ...buildWalletCardRows('tracked-wallets', trackedWallets, 0, shellWidth),
    );
  }

  if (trackedWallets.length > 0 && excludedWallets.length > 0) {
    rows.push(createBlankRow('wallet-groups-gap'));
  }

  if (excludedWallets.length > 0) {
    rows.push(
      ...buildWalletSectionHeaderRows(
        'excluded-wallets',
        `Excluded Wallets (${excludedWallets.length})`,
        'Shown for reference only. Not counted in tracked total.',
        shellWidth,
      ),
      ...buildWalletCardRows(
        'excluded-wallets',
        excludedWallets,
        trackedWallets.length,
        shellWidth,
      ),
    );
  }

  return rows;
}

function isPrintableInput(input: string) {
  return input.length > 0 && /^[\x20-\x7E]+$/.test(input);
}

function PromptValue({
  value,
  placeholder,
}: {
  value: string;
  placeholder: string;
}) {
  if (value.length > 0) {
    return (
      <>
        <Text color='white'>{value}</Text>
        <Text color='green'>▌</Text>
      </>
    );
  }

  return (
    <>
      <Text color='green'>▌</Text>
      <Text color='white' dimColor>
        {placeholder}
      </Text>
    </>
  );
}

export default function PlanifyCliApp({
  smokeTest = false,
}: PlanifyCliAppProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activePanel, setActivePanel] = useState<ActivePanel>({ kind: 'help' });
  const [inputMode, setInputMode] = useState<InputMode>('command');
  const [session, setSession] = useState<StoredCliSession | null>(null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [commandDraft, setCommandDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [passwordDraft, setPasswordDraft] = useState('');
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(!smokeTest);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [suggestionScrollOffset, setSuggestionScrollOffset] = useState(0);
  const [confirmedSuggestionValue, setConfirmedSuggestionValue] = useState<
    string | null
  >(null);
  const [outputScrollOffset, setOutputScrollOffset] = useState(0);
  const [walletSuggestionCache, setWalletSuggestionCache] = useState<{
    userId: number;
    snapshot: WalletListSnapshot;
  } | null>(null);
  const [terminalSize, setTerminalSize] = useState(() => ({
    columns: stdout.columns ?? process.stdout.columns ?? 120,
    rows: stdout.rows ?? process.stdout.rows ?? 32,
  }));
  const historyIdRef = useRef(0);
  const suppressInputUntilRef = useRef(0);
  const terminalWidth = terminalSize.columns;
  const terminalHeight = Math.max(terminalSize.rows - 1, 24);
  const shellWidth = Math.max(terminalWidth - 1, 40);
  const promptDivider = '─'.repeat(shellWidth);
  const commandCatalog = useMemo(() => getCommandCatalog(), []);
  const baseCommandSuggestions = useMemo<WalletCommandSuggestion[]>(() => {
    const suggestionSet = new Set(getCommandSuggestions(commandDraft));

    return commandCatalog
      .filter((item) => suggestionSet.has(item.command))
      .map((item) => ({
        value: item.command,
        label: item.command,
        description: item.description,
      }));
  }, [commandCatalog, commandDraft]);
  const walletCommandSuggestions = useMemo(
    () =>
      buildWalletCommandSuggestions(
        commandDraft,
        walletSuggestionCache?.snapshot.wallets ?? [],
      ),
    [commandDraft, walletSuggestionCache],
  );
  const visibleCommandSuggestions = useMemo(() => {
    const draft = commandDraft.trim().toLowerCase();
    if (!draft.startsWith('/')) {
      return [];
    }

    if (draft === '/wallets' || draft.startsWith('/wallets ')) {
      return walletCommandSuggestions.length > 0
        ? walletCommandSuggestions
        : baseCommandSuggestions;
    }

    return baseCommandSuggestions;
  }, [baseCommandSuggestions, commandDraft, walletCommandSuggestions]);
  const hasSuggestionMenu =
    inputMode === 'command' && visibleCommandSuggestions.length > 0;
  const suggestionViewportSize = Math.max(
    Math.min(visibleCommandSuggestions.length, 6),
    1,
  );
  const visibleSuggestionItems = useMemo(
    () =>
      visibleCommandSuggestions.slice(
        suggestionScrollOffset,
        suggestionScrollOffset + suggestionViewportSize,
      ),
    [suggestionScrollOffset, suggestionViewportSize, visibleCommandSuggestions],
  );
  const hasSuggestionsAbove = suggestionScrollOffset > 0;
  const hasSuggestionsBelow =
    suggestionScrollOffset + visibleSuggestionItems.length <
    visibleCommandSuggestions.length;

  const appendHistory = useCallback((item: HistoryInput) => {
    historyIdRef.current += 1;
    const nextItem: HistoryItem = {
      id: String(historyIdRef.current),
      ...item,
    };

    setHistory((current) => [...current.slice(-18), nextItem]);
  }, []);

  const resetToCommandMode = useCallback(
    (message?: string) => {
      setInputMode('command');
      setActivePanel({ kind: 'help' });
      setCommandDraft('');
      setEmailDraft('');
      setPasswordDraft('');
      setPendingEmail('');
      setSelectedSuggestionIndex(0);
      setSuggestionScrollOffset(0);
      setConfirmedSuggestionValue(null);

      if (message) {
        appendHistory({
          kind: 'status',
          variant: 'warning',
          text: message,
        });
      }
    },
    [appendHistory],
  );

  const hydrateValidatedSession = useCallback(
    async (candidate: StoredCliSession | null) => {
      const result = await validateCliSession(candidate);
      if (!result.ok) {
        if (result.shouldClear) {
          await clearCliSession(candidate?.token);
        }

        setSession(null);
        appendHistory({
          kind: 'status',
          variant: result.shouldClear ? 'warning' : 'info',
          text: result.message,
        });
        return null;
      }

      await saveCliSession(result.session);
      setSession(result.session);
      return result.session;
    },
    [appendHistory],
  );

  useEffect(() => {
    if (smokeTest || !stdout.isTTY) {
      return;
    }

    stdout.write('\u001B[2J\u001B[3J\u001B[H');
  }, [smokeTest, stdout]);

  useEffect(() => {
    const updateTerminalSize = () => {
      setTerminalSize({
        columns: stdout.columns ?? process.stdout.columns ?? 120,
        rows: stdout.rows ?? process.stdout.rows ?? 32,
      });
    };

    updateTerminalSize();
    stdout.on('resize', updateTerminalSize);

    return () => {
      stdout.off('resize', updateTerminalSize);
    };
  }, [stdout]);

  useEffect(() => {
    if (smokeTest || !session) {
      return;
    }

    const persistSession = () => {
      saveCliSessionSync(session);
    };

    process.on('exit', persistSession);

    return () => {
      process.off('exit', persistSession);
    };
  }, [session, smokeTest]);

  useEffect(() => {
    if (smokeTest) {
      const timer = setTimeout(() => {
        exit();
      }, 40);

      return () => {
        clearTimeout(timer);
      };
    }

    let isActive = true;

    const restoreSession = async () => {
      try {
        const storedSession = await loadCliSession();
        if (!isActive) {
          return;
        }

        if (!storedSession) {
          appendHistory({
            kind: 'status',
            variant: 'info',
            text: 'Ready. Type / to browse commands.',
          });
          return;
        }

        const hydratedSession = await hydrateValidatedSession(storedSession);
        if (!isActive || !hydratedSession) {
          return;
        }

        appendHistory({
          kind: 'status',
          variant: 'success',
          text: `Session restored for ${hydratedSession.user.email}.`,
        });
      } finally {
        if (isActive) {
          setIsBooting(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, [appendHistory, exit, hydrateValidatedSession, smokeTest]);

  useEffect(() => {
    if (visibleCommandSuggestions.length === 0) {
      setSelectedSuggestionIndex(0);
      setSuggestionScrollOffset(0);
      setConfirmedSuggestionValue(null);
      return;
    }

    setSelectedSuggestionIndex((current) =>
      Math.min(current, visibleCommandSuggestions.length - 1),
    );
  }, [visibleCommandSuggestions]);

  useEffect(() => {
    if (!hasSuggestionMenu) {
      setSuggestionScrollOffset(0);
      setConfirmedSuggestionValue(null);
      return;
    }

    setSuggestionScrollOffset((current) => {
      const maxOffset = Math.max(
        visibleCommandSuggestions.length - suggestionViewportSize,
        0,
      );
      let next = Math.min(current, maxOffset);

      if (selectedSuggestionIndex < next) {
        next = selectedSuggestionIndex;
      }

      if (selectedSuggestionIndex >= next + suggestionViewportSize) {
        next = selectedSuggestionIndex - suggestionViewportSize + 1;
      }

      return next;
    });
  }, [
    hasSuggestionMenu,
    selectedSuggestionIndex,
    suggestionViewportSize,
    visibleCommandSuggestions.length,
  ]);

  useEffect(() => {
    const selectedValue =
      visibleCommandSuggestions[selectedSuggestionIndex]?.value;
    if (!selectedValue || confirmedSuggestionValue === selectedValue) {
      return;
    }

    setConfirmedSuggestionValue(null);
  }, [
    confirmedSuggestionValue,
    selectedSuggestionIndex,
    visibleCommandSuggestions,
  ]);

  useEffect(() => {
    setOutputScrollOffset(0);
  }, [activePanel, history, inputMode]);

  useEffect(() => {
    if (!session) {
      setWalletSuggestionCache(null);
      return;
    }

    if (walletSuggestionCache?.userId !== session.user.id) {
      setWalletSuggestionCache(null);
    }
  }, [session, walletSuggestionCache]);

  useEffect(() => {
    const draft = commandDraft.trim().toLowerCase();
    if (
      inputMode !== 'command' ||
      !(draft === '/wallets' || draft.startsWith('/wallets '))
    ) {
      return;
    }

    if (!session) {
      return;
    }

    if (walletSuggestionCache?.userId === session.user.id) {
      return;
    }

    let isActive = true;

    void listWalletsForUser(session.user.id)
      .then((snapshot) => {
        if (!isActive) {
          return;
        }

        setWalletSuggestionCache({
          userId: session.user.id,
          snapshot,
        });
      })
      .catch(() => {
        // Suggestion loading should stay silent and never interrupt the shell.
      });

    return () => {
      isActive = false;
    };
  }, [commandDraft, inputMode, session, walletSuggestionCache]);

  const ensureActiveSession = useCallback(async () => {
    const currentSession = session ?? (await loadCliSession());
    const hydratedSession = await hydrateValidatedSession(currentSession);
    if (!hydratedSession) {
      setActivePanel({ kind: 'help' });
      return null;
    }

    return hydratedSession;
  }, [hydrateValidatedSession, session]);

  const handleWalletsCommand = useCallback(
    async (args: string[]) => {
      setBusyLabel('Loading wallets');

      try {
        const activeSession = await ensureActiveSession();
        if (!activeSession) {
          return;
        }

        const snapshot =
          walletSuggestionCache?.userId === activeSession.user.id
            ? walletSuggestionCache.snapshot
            : await listWalletsForUser(activeSession.user.id);

        setWalletSuggestionCache({
          userId: activeSession.user.id,
          snapshot,
        });

        const resolvedView = resolveWalletCommandView(snapshot, args);
        if (!resolvedView.ok) {
          appendHistory({
            kind: 'status',
            variant: 'warning',
            text: resolvedView.message,
          });
          setActivePanel({ kind: 'help' });
          return;
        }

        setActivePanel({ kind: 'wallets', view: resolvedView.view });
        appendHistory({
          kind: 'status',
          variant: 'success',
          text: resolvedView.view.statusMessage,
        });
      } catch (error) {
        appendHistory({
          kind: 'status',
          variant: 'error',
          text:
            error instanceof Error ? error.message : 'Failed to load wallets.',
        });
        setActivePanel({ kind: 'help' });
      } finally {
        setBusyLabel(null);
      }
    },
    [appendHistory, ensureActiveSession, walletSuggestionCache],
  );

  const handleCommandSubmit = useCallback(
    async (value: string) => {
      const selectedSuggestion = hasSuggestionMenu
        ? visibleCommandSuggestions[selectedSuggestionIndex]
        : null;
      const resolvedValue =
        selectedSuggestion && value.trim().startsWith('/')
          ? selectedSuggestion.value
          : value.trim();

      setCommandDraft('');
      setSelectedSuggestionIndex(0);
      setSuggestionScrollOffset(0);
      setConfirmedSuggestionValue(null);

      const parsed = parseSlashCommand(resolvedValue);
      if (parsed.type === 'empty') {
        return;
      }

      appendHistory({ kind: 'command', text: resolvedValue.trim() });

      if (parsed.type === 'invalid') {
        appendHistory({
          kind: 'status',
          variant: 'warning',
          text: parsed.message,
        });
        setActivePanel({ kind: 'help' });
        return;
      }

      if (parsed.type === 'unknown') {
        appendHistory({
          kind: 'status',
          variant: 'warning',
          text: `Unknown command ${parsed.command}. Try /help.`,
        });
        setActivePanel({ kind: 'help' });
        return;
      }

      if (parsed.command === '/help') {
        setActivePanel({ kind: 'help' });
        appendHistory({
          kind: 'status',
          variant: 'info',
          text: 'Type / to browse available commands and use arrows to pick one.',
        });
        return;
      }

      if (parsed.command === '/login') {
        if (session) {
          appendHistory({
            kind: 'status',
            variant: 'info',
            text: `Already signed in as ${session.user.email}. Use /logout first if you need another account.`,
          });
          return;
        }

        setInputMode('login-email');
        setActivePanel({ kind: 'help' });
        setEmailDraft('');
        appendHistory({
          kind: 'status',
          variant: 'info',
          text: 'Login started. Enter your email below, or press Esc to cancel.',
        });
        return;
      }

      if (parsed.command === '/logout') {
        if (!session) {
          appendHistory({
            kind: 'status',
            variant: 'warning',
            text: 'You are already logged out.',
          });
          setActivePanel({ kind: 'help' });
          return;
        }

        await clearCliSession();
        setSession(null);
        setActivePanel({ kind: 'help' });
        appendHistory({
          kind: 'status',
          variant: 'success',
          text: 'Local session cleared. You have been logged out.',
        });
        return;
      }

      if (parsed.command === '/wallets') {
        await handleWalletsCommand(parsed.args);
      }
    },
    [
      appendHistory,
      handleWalletsCommand,
      hasSuggestionMenu,
      selectedSuggestionIndex,
      session,
      visibleCommandSuggestions,
    ],
  );

  const handleEmailSubmit = useCallback(
    (value: string) => {
      const email = value.trim().toLowerCase();
      if (!email) {
        appendHistory({
          kind: 'status',
          variant: 'warning',
          text: 'Email is required before entering a password.',
        });
        return;
      }

      setPendingEmail(email);
      setEmailDraft('');
      setPasswordDraft('');
      setInputMode('login-password');
      appendHistory({
        kind: 'status',
        variant: 'info',
        text: `Email captured for ${email}. Enter your password below.`,
      });
    },
    [appendHistory],
  );

  const handlePasswordSubmit = useCallback(
    async (password: string) => {
      setBusyLabel('Authenticating');

      try {
        const nextSession = await loginCliUser({
          email: pendingEmail,
          password,
        });

        await saveCliSession(nextSession);
        setSession(nextSession);
        setInputMode('command');
        setActivePanel({ kind: 'help' });
        setCommandDraft('');
        setEmailDraft('');
        setPasswordDraft('');
        setPendingEmail('');
        setSelectedSuggestionIndex(0);
        setSuggestionScrollOffset(0);
        setConfirmedSuggestionValue(null);
        appendHistory({
          kind: 'status',
          variant: 'success',
          text: `Signed in as ${nextSession.user.name} (${nextSession.user.email}).`,
        });
      } catch (error) {
        setPasswordDraft('');
        appendHistory({
          kind: 'status',
          variant: 'error',
          text: error instanceof Error ? error.message : 'Failed to login.',
        });
      } finally {
        setBusyLabel(null);
      }
    },
    [appendHistory, pendingEmail],
  );

  const headerRows = useMemo(
    () => buildHeaderRows(shellWidth, session),
    [session, shellWidth],
  );

  const bodyRows = useMemo(() => {
    const rows: OutputRow[] = [];

    if (history.length === 0) {
      rows.push(
        createRow(
          'initial-status',
          session
            ? `Ready for ${session.user.email}.`
            : 'Ready. Type / to browse commands.',
          {
            showSystemMarker: true,
          },
        ),
      );
    } else {
      history.forEach((item) => {
        if (item.kind === 'command') {
          rows.push(
            createRow(`history-command-${item.id}`, `> ${item.text}`, {
              bold: true,
            }),
            createBlankRow(`history-command-${item.id}-gap`),
          );
          return;
        }

        rows.push(
          createRow(`history-status-${item.id}`, item.text, {
            showSystemMarker: true,
          }),
        );
      });
    }

    if (inputMode === 'login-email' || inputMode === 'login-password') {
      rows.push(...buildAuthRows(inputMode, pendingEmail));
    } else if (activePanel?.kind === 'wallets') {
      rows.push(...buildWalletRows(activePanel.view, shellWidth));
    } else {
      rows.push(...buildHelpRows());
    }

    return rows;
  }, [activePanel, history, inputMode, pendingEmail, session, shellWidth]);

  const outputRows = useMemo(
    () => [...headerRows, ...bodyRows],
    [bodyRows, headerRows],
  );

  const suggestionRows =
    inputMode === 'command'
      ? commandDraft.trim().startsWith('/')
        ? visibleCommandSuggestions.length > 0
          ? visibleSuggestionItems.length +
            (hasSuggestionsAbove ? 1 : 0) +
            (hasSuggestionsBelow ? 1 : 0)
          : 1
        : 1
      : 1;
  const busyRows = isBooting || busyLabel ? 1 : 0;
  const promptRows = suggestionRows + 3;
  const outputViewportHeight = Math.max(
    terminalHeight - busyRows - promptRows,
    6,
  );
  const maxOutputScrollOffset = Math.max(
    outputRows.length - outputViewportHeight,
    0,
  );
  const clampedOutputScrollOffset = Math.min(
    outputScrollOffset,
    maxOutputScrollOffset,
  );
  const outputStartIndex = Math.max(
    outputRows.length - outputViewportHeight - clampedOutputScrollOffset,
    0,
  );
  const visibleOutputRows = useMemo(() => {
    if (outputRows.length > outputViewportHeight) {
      return outputRows.slice(
        outputStartIndex,
        outputStartIndex + outputViewportHeight,
      );
    }

    const availableBodyHeight = Math.max(
      outputViewportHeight - headerRows.length,
      0,
    );
    const bodySpacerCount = Math.max(availableBodyHeight - bodyRows.length, 0);

    return [
      ...headerRows,
      ...Array.from({ length: bodySpacerCount }, (_, index) =>
        createBlankRow(`output-body-spacer-${index}`),
      ),
      ...bodyRows,
    ];
  }, [
    bodyRows,
    headerRows,
    outputRows,
    outputStartIndex,
    outputViewportHeight,
  ]);

  useEffect(() => {
    setOutputScrollOffset((current) =>
      Math.min(current, maxOutputScrollOffset),
    );
  }, [maxOutputScrollOffset]);

  useEffect(() => {
    if (smokeTest || !stdout.isTTY || !process.stdin.isTTY) {
      return;
    }

    stdout.write('\u001B[?1000h\u001B[?1006h');

    const handleMouseData = (chunk: string | Buffer) => {
      const raw = chunk.toString();
      const matches = raw.matchAll(/\u001B\[<(\d+);(\d+);(\d+)([mM])/g);
      let hasMouseEvent = false;

      for (const match of matches) {
        hasMouseEvent = true;
        const code = Number(match[1]);
        if (code === 64) {
          setOutputScrollOffset((current) =>
            Math.min(current + 3, maxOutputScrollOffset),
          );
          continue;
        }

        if (code === 65) {
          setOutputScrollOffset((current) => Math.max(current - 3, 0));
        }
      }

      if (hasMouseEvent) {
        suppressInputUntilRef.current = Date.now() + 120;
      }
    };

    process.stdin.on('data', handleMouseData);

    return () => {
      process.stdin.off('data', handleMouseData);
      stdout.write('\u001B[?1000l\u001B[?1006l');
    };
  }, [maxOutputScrollOffset, smokeTest, stdout]);

  const submitCurrentInput = useCallback(() => {
    if (inputMode === 'command') {
      const draft = commandDraft.trim();
      const selectedSuggestion = hasSuggestionMenu
        ? visibleCommandSuggestions[selectedSuggestionIndex]
        : null;
      const isWalletSuggestionDraft =
        draft === '/wallets' || draft.startsWith('/wallets ');

      if (selectedSuggestion?.value.startsWith('/wallets')) {
        if (selectedSuggestion.insertValue) {
          if (commandDraft !== selectedSuggestion.insertValue) {
            setCommandDraft(selectedSuggestion.insertValue);
          }

          setConfirmedSuggestionValue(null);
          return;
        }

        if (
          !draft.startsWith('/wallets') &&
          commandDraft !== selectedSuggestion.value
        ) {
          setCommandDraft(selectedSuggestion.value);
          setConfirmedSuggestionValue(selectedSuggestion.value);
          return;
        }
      }

      if (selectedSuggestion && isWalletSuggestionDraft) {
        const needsConfirmation =
          draft === '/wallets' || draft !== selectedSuggestion.value;

        if (
          needsConfirmation &&
          confirmedSuggestionValue !== selectedSuggestion.value
        ) {
          setCommandDraft(selectedSuggestion.value);
          setConfirmedSuggestionValue(selectedSuggestion.value);
          return;
        }
      }

      void handleCommandSubmit(commandDraft);
      return;
    }

    if (inputMode === 'login-email') {
      handleEmailSubmit(emailDraft);
      return;
    }

    void handlePasswordSubmit(passwordDraft);
  }, [
    commandDraft,
    emailDraft,
    confirmedSuggestionValue,
    handleCommandSubmit,
    handleEmailSubmit,
    hasSuggestionMenu,
    handlePasswordSubmit,
    inputMode,
    passwordDraft,
    selectedSuggestionIndex,
    visibleCommandSuggestions,
  ]);

  useInput(
    (input, key) => {
      if (Date.now() < suppressInputUntilRef.current) {
        return;
      }

      if (key.escape && inputMode !== 'command') {
        resetToCommandMode('Login cancelled.');
        return;
      }

      if (key.return) {
        submitCurrentInput();
        return;
      }

      if (key.upArrow) {
        if (inputMode === 'command' && hasSuggestionMenu) {
          setConfirmedSuggestionValue(null);
          setSelectedSuggestionIndex((current) =>
            current <= 0 ? visibleCommandSuggestions.length - 1 : current - 1,
          );
          return;
        }

        setOutputScrollOffset((current) =>
          Math.min(current + 1, maxOutputScrollOffset),
        );
        return;
      }

      if (key.downArrow) {
        if (inputMode === 'command' && hasSuggestionMenu) {
          setConfirmedSuggestionValue(null);
          setSelectedSuggestionIndex((current) =>
            current >= visibleCommandSuggestions.length - 1 ? 0 : current + 1,
          );
          return;
        }

        setOutputScrollOffset((current) => Math.max(current - 1, 0));
        return;
      }

      if (key.backspace || key.delete) {
        if (inputMode === 'command') {
          setConfirmedSuggestionValue(null);
          setCommandDraft((current) => current.slice(0, -1));
          return;
        }

        if (inputMode === 'login-email') {
          setEmailDraft((current) => current.slice(0, -1));
          return;
        }

        setPasswordDraft((current) => current.slice(0, -1));
        return;
      }

      if (!isPrintableInput(input) || key.ctrl || key.meta) {
        return;
      }

      if (inputMode === 'command') {
        setConfirmedSuggestionValue(null);
        setCommandDraft((current) => `${current}${input}`);
        return;
      }

      if (inputMode === 'login-email') {
        setEmailDraft((current) => `${current}${input}`);
        return;
      }

      setPasswordDraft((current) => `${current}${input}`);
    },
    { isActive: true },
  );

  const commandPromptPlaceholder = 'Type /help';
  const emailPromptPlaceholder = 'email@example.com';
  const maskedPasswordDraft =
    passwordDraft.length > 0 ? '•'.repeat(passwordDraft.length) : '';
  const passwordPromptPlaceholder = 'Enter your password';

  return (
    <Box flexDirection='column' height={terminalHeight} width={shellWidth}>
      {isBooting ? <Spinner label='Restoring saved session' /> : null}
      {!isBooting && busyLabel ? <Spinner label={busyLabel} /> : null}

      <Box flexDirection='column' height={outputViewportHeight}>
        {visibleOutputRows.map((row) => (
          <Box key={row.id} gap={row.showSystemMarker ? 1 : 0}>
            {row.showSystemMarker ? <Text color='green'>●</Text> : null}
            {row.segments.map((segment, index) => (
              <Text
                key={`${row.id}-${index}`}
                color={segment.color}
                bold={segment.bold}
                dimColor={segment.dimColor}
              >
                {segment.text}
              </Text>
            ))}
          </Box>
        ))}
      </Box>

      <Box flexDirection='column'>
        {inputMode === 'command' ? (
          <>
            {commandDraft.trim().startsWith('/') ? (
              visibleCommandSuggestions.length > 0 ? (
                <Box flexDirection='column'>
                  {hasSuggestionsAbove ? (
                    <Text color='white' dimColor>
                      ↑ more suggestions
                    </Text>
                  ) : null}

                  {visibleSuggestionItems.map((item, index) => {
                    const actualIndex = suggestionScrollOffset + index;
                    const isSelected = actualIndex === selectedSuggestionIndex;
                    const isConfirmed =
                      confirmedSuggestionValue === item.value && isSelected;

                    return (
                      <Box key={item.value} gap={1}>
                        <Text color='green'>
                          {isConfirmed ? '»' : isSelected ? '›' : '·'}
                        </Text>
                        <Text color={isSelected ? 'green' : 'white'}>
                          {item.label}
                        </Text>
                        <Text color='white' dimColor>
                          {item.description}
                        </Text>
                      </Box>
                    );
                  })}

                  {hasSuggestionsBelow ? (
                    <Text color='white' dimColor>
                      ↓ more suggestions
                    </Text>
                  ) : null}
                </Box>
              ) : (
                <Text color='white' dimColor>
                  No matching slash command. Try /help.
                </Text>
              )
            ) : (
              <Text color='white' dimColor>
                Type / to show available commands.
              </Text>
            )}

            <Text color='white' dimColor>
              {promptDivider}
            </Text>
            <Box>
              <Text color='white'>{'> '}</Text>
              <PromptValue
                value={commandDraft}
                placeholder={commandPromptPlaceholder}
              />
            </Box>
            <Text color='white' dimColor>
              {promptDivider}
            </Text>
          </>
        ) : null}

        {inputMode === 'login-email' ? (
          <>
            <Text color='white' dimColor>
              {promptDivider}
            </Text>
            <Box>
              <Text color='white'>{'> '}</Text>
              <PromptValue
                value={emailDraft}
                placeholder={emailPromptPlaceholder}
              />
            </Box>
            <Text color='white' dimColor>
              {promptDivider}
            </Text>
          </>
        ) : null}

        {inputMode === 'login-password' ? (
          <>
            <Text color='white' dimColor>
              {promptDivider}
            </Text>
            <Box>
              <Text color='white'>{'> '}</Text>
              <PromptValue
                value={maskedPasswordDraft}
                placeholder={passwordPromptPlaceholder}
              />
            </Box>
            <Text color='white' dimColor>
              {promptDivider}
            </Text>
          </>
        ) : null}
      </Box>
    </Box>
  );
}
