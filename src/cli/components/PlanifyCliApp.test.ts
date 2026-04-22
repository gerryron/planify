import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  act,
  create,
  type ReactTestRenderer,
  type ReactTestRendererNode,
} from 'react-test-renderer';
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
import { listWalletsForUser } from '@/cli/services/walletsCliService';
import PlanifyCliApp from './PlanifyCliApp';

type InputKey = {
  return?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
  backspace?: boolean;
  delete?: boolean;
  escape?: boolean;
  ctrl?: boolean;
  meta?: boolean;
};

type InkTestState = {
  inputHandler: ((input: string, key: InputKey) => void) | null;
  exitMock: ReturnType<typeof jest.fn>;
  stdoutMock: {
    columns: number;
    rows: number;
    isTTY: boolean;
    write: ReturnType<typeof jest.fn<(chunk: string) => boolean>>;
    on: ReturnType<typeof jest.fn>;
    off: ReturnType<typeof jest.fn>;
  };
};

declare global {
  var __planifyInkTestState: InkTestState | undefined;
}

function getInkTestState() {
  if (!globalThis.__planifyInkTestState) {
    throw new Error('Ink test state was not initialized.');
  }

  return globalThis.__planifyInkTestState;
}

jest.mock('ink', () => ({
  Box: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('box', null, children),
  Text: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('text', null, children),
  useApp: () => ({ exit: getInkTestState().exitMock }),
  useInput: (handler: (input: string, key: InputKey) => void) => {
    getInkTestState().inputHandler = handler;
  },
  useStdout: () => ({ stdout: getInkTestState().stdoutMock }),
}));

jest.mock('@inkjs/ui', () => ({
  Spinner: ({ label }: { label: string }) =>
    React.createElement('spinner', null, label),
}));

jest.mock('@/cli/lib/sessionStore', () => ({
  clearCliSession: jest.fn(),
  loadCliSession: jest.fn(),
  saveCliSession: jest.fn(),
  saveCliSessionSync: jest.fn(),
}));

jest.mock('@/cli/services/authCliService', () => ({
  loginCliUser: jest.fn(),
  validateCliSession: jest.fn(),
}));

jest.mock('@/cli/services/walletsCliService', () => ({
  listWalletsForUser: jest.fn(),
}));

const clearCliSessionMock = jest.mocked(clearCliSession);
const loadCliSessionMock = jest.mocked(loadCliSession);
const saveCliSessionMock = jest.mocked(saveCliSession);
const saveCliSessionSyncMock = jest.mocked(saveCliSessionSync);
const loginCliUserMock = jest.mocked(loginCliUser);
const validateCliSessionMock = jest.mocked(validateCliSession);
const listWalletsForUserMock = jest.mocked(listWalletsForUser);

type RenderedNode = ReactTestRendererNode | ReactTestRendererNode[] | null;

function collectText(node: RenderedNode): string {
  if (typeof node === 'string') {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map((child) => collectText(child)).join('');
  }

  if (!node) {
    return '';
  }

  return collectText(node.children ?? []);
}

async function renderApp() {
  let renderer: ReactTestRenderer;

  await act(async () => {
    renderer = create(React.createElement(PlanifyCliApp, { smokeTest: false }));
    await Promise.resolve();
  });

  return renderer!;
}

async function sendInput(input: string, key: InputKey = {}) {
  await act(async () => {
    getInkTestState().inputHandler?.(input, key);
    await Promise.resolve();
  });
}

beforeEach(() => {
  globalThis.__planifyInkTestState = {
    inputHandler: null,
    exitMock: jest.fn(),
    stdoutMock: {
      columns: 120,
      rows: 32,
      isTTY: false,
      write: jest.fn<(chunk: string) => boolean>(),
      on: jest.fn(),
      off: jest.fn(),
    },
  };

  loadCliSessionMock.mockReset();
  saveCliSessionMock.mockReset();
  saveCliSessionSyncMock.mockReset();
  clearCliSessionMock.mockReset();
  loginCliUserMock.mockReset();
  validateCliSessionMock.mockReset();
  listWalletsForUserMock.mockReset();

  loadCliSessionMock.mockResolvedValue(null);
  validateCliSessionMock.mockResolvedValue({
    ok: false,
    shouldClear: false,
    message: 'Please login first.',
  });
  listWalletsForUserMock.mockResolvedValue({
    wallets: [],
    trackedTotalBalance: 0,
    trackedWalletCount: 0,
    excludedWalletCount: 0,
  });
});

describe('PlanifyCliApp', () => {
  it('fills /wallets into the prompt before running it from the slash menu', async () => {
    const renderer = await renderApp();

    await sendInput('/');
    await sendInput('', { downArrow: true });
    await sendInput('', { downArrow: true });
    await sendInput('', { downArrow: true });
    await sendInput('', { return: true });

    const output = collectText(renderer.toJSON());

    expect(output).toContain('/wallets▌');
    expect(output).toContain('/wallets [number]');
    expect(output).toContain('/wallets [wallet name]');
    expect(output).toContain('/wallets [tracked/excluded]');
    expect(loadCliSessionMock).toHaveBeenCalledTimes(1);
  });

  it('shows a cursor marker at the active typing position in the command prompt', async () => {
    const renderer = await renderApp();

    expect(collectText(renderer.toJSON())).toContain('▌Type /help');

    await sendInput('/');

    expect(collectText(renderer.toJSON())).toContain('/▌');
  });
});
