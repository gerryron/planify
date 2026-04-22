import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  clearCliSession,
  getCliSessionFilePath,
  loadCliSession,
  saveCliSession,
} from './sessionStore';

describe('sessionStore', () => {
  let tempDir: string;
  let homedirSpy: ReturnType<typeof jest.spyOn>;
  let legacySessionFilePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'planify-cli-'));
    process.env.PLANIFY_CLI_HOME = path.join(tempDir, 'roaming');
    homedirSpy = jest.spyOn(os, 'homedir').mockReturnValue(tempDir);
    legacySessionFilePath = path.join(tempDir, '.planify', 'session.json');
  });

  afterEach(async () => {
    delete process.env.PLANIFY_CLI_HOME;
    homedirSpy.mockRestore();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('saves and loads the local session file', async () => {
    const session = {
      version: 1 as const,
      token: 'signed-token',
      savedAt: '2026-04-22T10:00:00.000Z',
      user: {
        id: 11,
        name: 'Cli User',
        email: 'cli@example.com',
        role: 'user' as const,
        status: 'active' as const,
      },
    };

    await saveCliSession(session);

    await expect(access(getCliSessionFilePath())).resolves.toBeUndefined();
    await expect(access(legacySessionFilePath)).resolves.toBeUndefined();
    await expect(loadCliSession()).resolves.toEqual(session);
  });

  it('loads a legacy session file and migrates it to the current location', async () => {
    await import('node:fs/promises').then(({ mkdir }) =>
      mkdir(path.dirname(legacySessionFilePath), { recursive: true }),
    );
    await writeFile(
      legacySessionFilePath,
      JSON.stringify(
        {
          token: 'legacy-token',
          loggedInAt: '2026-04-22T10:00:00.000Z',
          user: {
            sub: 14,
            name: 'Legacy User',
            email: 'legacy@example.com',
            role: 'user',
            status: 'active',
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    await expect(loadCliSession()).resolves.toEqual({
      version: 1,
      token: 'legacy-token',
      savedAt: '2026-04-22T10:00:00.000Z',
      user: {
        id: 14,
        name: 'Legacy User',
        email: 'legacy@example.com',
        role: 'user',
        status: 'active',
      },
    });

    await expect(access(getCliSessionFilePath())).resolves.toBeUndefined();
    await expect(access(legacySessionFilePath)).resolves.toBeUndefined();
  });

  it('clears the stored session file', async () => {
    await saveCliSession({
      version: 1,
      token: 'signed-token',
      savedAt: '2026-04-22T10:00:00.000Z',
      user: {
        id: 12,
        name: 'Cli User',
        email: 'cli@example.com',
        role: 'user',
        status: 'active',
      },
    });

    await clearCliSession();

    await expect(loadCliSession()).resolves.toBeNull();
    await expect(access(legacySessionFilePath)).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('does not clear a newer saved session when the expected token differs', async () => {
    await saveCliSession({
      version: 1,
      token: 'newer-token',
      savedAt: '2026-04-22T10:00:00.000Z',
      user: {
        id: 15,
        name: 'Cli User',
        email: 'cli@example.com',
        role: 'user',
        status: 'active',
      },
    });

    await clearCliSession('older-token');

    await expect(loadCliSession()).resolves.toEqual({
      version: 1,
      token: 'newer-token',
      savedAt: '2026-04-22T10:00:00.000Z',
      user: {
        id: 15,
        name: 'Cli User',
        email: 'cli@example.com',
        role: 'user',
        status: 'active',
      },
    });

    await expect(access(legacySessionFilePath)).resolves.toBeUndefined();
  });

  it('falls back to the legacy copy when the current session file is malformed', async () => {
    await saveCliSession({
      version: 1,
      token: 'fallback-token',
      savedAt: '2026-04-22T10:00:00.000Z',
      user: {
        id: 16,
        name: 'Cli User',
        email: 'cli@example.com',
        role: 'user',
        status: 'active',
      },
    });

    await writeFile(getCliSessionFilePath(), '{bad-json', 'utf8');

    await expect(loadCliSession()).resolves.toEqual({
      version: 1,
      token: 'fallback-token',
      savedAt: '2026-04-22T10:00:00.000Z',
      user: {
        id: 16,
        name: 'Cli User',
        email: 'cli@example.com',
        role: 'user',
        status: 'active',
      },
    });
  });

  it('treats malformed session content as logged out', async () => {
    const filePath = getCliSessionFilePath();
    await saveCliSession({
      version: 1,
      token: 'signed-token',
      savedAt: '2026-04-22T10:00:00.000Z',
      user: {
        id: 13,
        name: 'Cli User',
        email: 'cli@example.com',
        role: 'user',
        status: 'active',
      },
    });

    await rm(filePath, { force: true });
    await rm(legacySessionFilePath, { force: true });
    await import('node:fs/promises').then(({ writeFile }) =>
      writeFile(filePath, '{bad-json', 'utf8'),
    );

    await expect(loadCliSession()).resolves.toBeNull();
    await expect(readFile(filePath, 'utf8')).resolves.toBe('{bad-json');
  });
});
