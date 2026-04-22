import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { StoredCliSession } from '@/cli/types';

const CLI_DIR_NAME = 'planify';
const LEGACY_CLI_DIR_NAME = '.planify';
const SESSION_FILE_NAME = 'session.json';

function isCliSession(value: unknown): value is StoredCliSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const session = value as Partial<StoredCliSession>;
  const user = session.user;

  return (
    session.version === 1 &&
    typeof session.token === 'string' &&
    session.token.length > 0 &&
    typeof session.savedAt === 'string' &&
    typeof user === 'object' &&
    user !== null &&
    typeof user.id === 'number' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    (user.role === 'user' || user.role === 'superadmin') &&
    (user.status === 'pending' || user.status === 'active')
  );
}

function parseLegacyCliSession(value: unknown): StoredCliSession | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const session = value as {
    token?: unknown;
    loggedInAt?: unknown;
    user?: {
      sub?: unknown;
      name?: unknown;
      email?: unknown;
      role?: unknown;
      status?: unknown;
    };
  };

  if (
    typeof session.token !== 'string' ||
    session.token.length === 0 ||
    typeof session.loggedInAt !== 'string' ||
    typeof session.user !== 'object' ||
    session.user === null ||
    typeof session.user.sub !== 'number' ||
    typeof session.user.name !== 'string' ||
    typeof session.user.email !== 'string' ||
    (session.user.role !== 'user' && session.user.role !== 'superadmin') ||
    (session.user.status !== 'pending' && session.user.status !== 'active')
  ) {
    return null;
  }

  return {
    version: 1,
    token: session.token,
    savedAt: session.loggedInAt,
    user: {
      id: session.user.sub,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      status: session.user.status,
    },
  };
}

function getCliHomeRoot() {
  const override = process.env.PLANIFY_CLI_HOME?.trim();
  if (override) {
    return override;
  }

  const appData = process.env.APPDATA?.trim();
  if (appData) {
    return path.join(appData, CLI_DIR_NAME);
  }

  return path.join(os.homedir(), `.${CLI_DIR_NAME}`);
}

function getLegacyCliHomeRoot() {
  return path.join(os.homedir(), LEGACY_CLI_DIR_NAME);
}

export function getCliSessionFilePath() {
  return path.join(getCliHomeRoot(), SESSION_FILE_NAME);
}

function getLegacyCliSessionFilePath() {
  return path.join(getLegacyCliHomeRoot(), SESSION_FILE_NAME);
}

function getCliSessionCandidatePaths() {
  const currentPath = getCliSessionFilePath();
  const legacyPath = getLegacyCliSessionFilePath();

  return currentPath === legacyPath ? [currentPath] : [currentPath, legacyPath];
}

function getCliSessionWritePaths() {
  return getCliSessionCandidatePaths();
}

async function readStoredSessionFile(filePath: string) {
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  if (isCliSession(parsed)) {
    return {
      session: parsed,
      needsMigration: false,
    };
  }

  const legacySession = parseLegacyCliSession(parsed);
  if (legacySession) {
    return {
      session: legacySession,
      needsMigration: true,
    };
  }

  return null;
}

async function shouldClearStoredSession(
  filePath: string,
  expectedToken: string | undefined,
) {
  if (!expectedToken) {
    return true;
  }

  try {
    const stored = await readStoredSessionFile(filePath);
    return stored?.session.token === expectedToken;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false;
    }

    return false;
  }
}

export async function loadCliSession(): Promise<StoredCliSession | null> {
  for (const filePath of getCliSessionCandidatePaths()) {
    try {
      const stored = await readStoredSessionFile(filePath);
      if (!stored) {
        continue;
      }

      if (stored.needsMigration || filePath !== getCliSessionFilePath()) {
        await saveCliSession(stored.session);
      }

      return stored.session;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        continue;
      }

      continue;
    }
  }

  return null;
}

export async function saveCliSession(session: StoredCliSession) {
  const fileContent = `${JSON.stringify(session, null, 2)}\n`;

  for (const filePath of getCliSessionWritePaths()) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, fileContent, 'utf8');
  }
}

export function saveCliSessionSync(session: StoredCliSession) {
  const fileContent = `${JSON.stringify(session, null, 2)}\n`;

  for (const filePath of getCliSessionWritePaths()) {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, fileContent, 'utf8');
  }
}

export async function clearCliSession(expectedToken?: string) {
  for (const filePath of getCliSessionCandidatePaths()) {
    try {
      if (!(await shouldClearStoredSession(filePath, expectedToken))) {
        continue;
      }

      await unlink(filePath);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        continue;
      }

      throw error;
    }
  }
}
