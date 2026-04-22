import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const findUniqueMock = jest.fn();
const verifyPasswordMock = jest.fn();

jest.mock('@/core/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
    },
  },
}));

jest.mock('@/core/auth/password', () => ({
  verifyPassword: verifyPasswordMock,
}));

import { loginCliUser, validateCliSession } from './authCliService';

describe('authCliService', () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    verifyPasswordMock.mockReset();
    process.env.JWT_SECRET = 'planify-cli-secret-12345';
  });

  it('creates a persisted session for an active user', async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: 7,
      name: 'Gerry User',
      email: 'gerry@example.com',
      role: 'user',
      status: 'active',
      passwordHash: 'hashed',
    });
    verifyPasswordMock.mockResolvedValueOnce(true);

    const session = await loginCliUser({
      email: ' Gerry@Example.com ',
      password: 'secret-pass',
    });

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: 'gerry@example.com' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    });
    expect(session).toMatchObject({
      version: 1,
      user: {
        id: 7,
        name: 'Gerry User',
        email: 'gerry@example.com',
        role: 'user',
        status: 'active',
      },
    });
    expect(session.token).toEqual(expect.any(String));
  });

  it('rejects a pending user even with a valid password', async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: 8,
      name: 'Pending User',
      email: 'pending@example.com',
      role: 'user',
      status: 'pending',
      passwordHash: 'hashed',
    });
    verifyPasswordMock.mockResolvedValueOnce(true);

    await expect(
      loginCliUser({
        email: 'pending@example.com',
        password: 'secret-pass',
      }),
    ).rejects.toThrow(
      'Your account is pending superadmin approval. Please try again later.',
    );
  });

  it('maps database authentication failures to a friendly login error', async () => {
    findUniqueMock.mockRejectedValueOnce(
      new Error(
        'Authentication failed against the database server, the provided database credentials for `postgres` are not valid',
      ),
    );

    await expect(
      loginCliUser({
        email: 'gerry@example.com',
        password: 'secret-pass',
      }),
    ).rejects.toThrow(
      'Database authentication failed. Check DATABASE_URL and try again.',
    );
  });

  it('revalidates a persisted session and refreshes the stored user payload', async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: 9,
      name: 'Session User',
      email: 'session@example.com',
      role: 'user',
      status: 'active',
      passwordHash: 'hashed',
    });
    verifyPasswordMock.mockResolvedValueOnce(true);

    const session = await loginCliUser({
      email: 'session@example.com',
      password: 'secret-pass',
    });

    findUniqueMock.mockResolvedValueOnce({
      id: 9,
      name: 'Session User Updated',
      email: 'session@example.com',
      role: 'superadmin',
      status: 'active',
    });

    const result = await validateCliSession(session);

    expect(result).toMatchObject({
      ok: true,
      session: {
        user: {
          id: 9,
          name: 'Session User Updated',
          email: 'session@example.com',
          role: 'superadmin',
          status: 'active',
        },
      },
    });
  });

  it('keeps the saved session when database authentication fails during revalidation', async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: 9,
      name: 'Session User',
      email: 'session@example.com',
      role: 'user',
      status: 'active',
      passwordHash: 'hashed',
    });
    verifyPasswordMock.mockResolvedValueOnce(true);

    const session = await loginCliUser({
      email: 'session@example.com',
      password: 'secret-pass',
    });

    findUniqueMock.mockRejectedValueOnce(
      new Error(
        'Authentication failed against the database server, the provided database credentials for `postgres` are not valid',
      ),
    );

    await expect(validateCliSession(session)).resolves.toEqual({
      ok: false,
      message:
        'Database authentication failed. Check DATABASE_URL and try again.',
      shouldClear: false,
    });
  });

  it('rejects an invalid session token and asks the caller to clear it', async () => {
    const result = await validateCliSession({
      version: 1,
      token: 'broken-token',
      savedAt: new Date().toISOString(),
      user: {
        id: 1,
        name: 'Broken',
        email: 'broken@example.com',
        role: 'user',
        status: 'active',
      },
    });

    expect(result).toEqual({
      ok: false,
      message: 'Session is invalid. Please login again.',
      shouldClear: true,
    });
  });
});
