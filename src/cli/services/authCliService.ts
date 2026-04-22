import jwt from 'jsonwebtoken';
import { verifyPassword } from '@/core/auth/password';
import { prisma } from '@/core/db/prisma';
import type { CliSessionUser, StoredCliSession } from '@/cli/types';

const CLI_SESSION_KIND = 'cli-session';

type LoginPayload = {
  email: string;
  password: string;
};

type CliSessionTokenPayload = {
  kind: typeof CLI_SESSION_KIND;
  sub: number;
  email: string;
  name: string;
  role: CliSessionUser['role'];
  status: CliSessionUser['status'];
};

export type CliSessionValidationResult =
  | {
      ok: true;
      session: StoredCliSession;
    }
  | {
      ok: false;
      message: string;
      shouldClear: boolean;
    };

function getDatabaseErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return null;
  }

  if (
    error.message.includes('Authentication failed against the database server')
  ) {
    return 'Database authentication failed. Check DATABASE_URL and try again.';
  }

  if (error.message.includes("Can't reach database server")) {
    return 'Database server is unreachable. Check DATABASE_URL and try again.';
  }

  if (error.message.includes('Timed out fetching a new connection')) {
    return 'Database connection timed out. Try again in a moment.';
  }

  return null;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error('JWT_SECRET must be set with at least 16 characters');
  }
  return secret;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapUser(user: {
  id: number;
  name: string;
  email: string;
  role: CliSessionUser['role'];
  status: CliSessionUser['status'];
}): CliSessionUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function createStoredSession(user: CliSessionUser): StoredCliSession {
  const token = jwt.sign(
    {
      kind: CLI_SESSION_KIND,
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    },
    getJwtSecret(),
    {
      algorithm: 'HS256',
    },
  );

  return {
    version: 1,
    token,
    user,
    savedAt: new Date().toISOString(),
  };
}

function verifyCliSessionToken(token: string): CliSessionTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded !== 'object' || decoded === null) {
      return null;
    }

    const payload = decoded as Partial<CliSessionTokenPayload>;
    if (
      payload.kind !== CLI_SESSION_KIND ||
      !payload.sub ||
      !payload.email ||
      !payload.name ||
      (payload.role !== 'user' && payload.role !== 'superadmin') ||
      (payload.status !== 'pending' && payload.status !== 'active')
    ) {
      return null;
    }

    return payload as CliSessionTokenPayload;
  } catch {
    return null;
  }
}

export async function loginCliUser(payload: LoginPayload) {
  const email = payload.email.trim().toLowerCase();
  const password = payload.password;

  if (!email || !password) {
    throw new Error('email and password are required');
  }

  if (!isValidEmail(email)) {
    throw new Error('email format is invalid');
  }

  let user;

  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    });
  } catch (error) {
    throw new Error(
      getDatabaseErrorMessage(error) ??
        'Failed to connect to the database. Please try again.',
    );
  }

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  if (user.status !== 'active') {
    throw new Error(
      'Your account is pending superadmin approval. Please try again later.',
    );
  }

  return createStoredSession(mapUser(user));
}

export async function validateCliSession(
  session: StoredCliSession | null,
): Promise<CliSessionValidationResult> {
  if (!session) {
    return {
      ok: false,
      message: 'Please login first',
      shouldClear: false,
    };
  }

  const payload = verifyCliSessionToken(session.token);
  if (!payload) {
    return {
      ok: false,
      message: 'Session is invalid. Please login again.',
      shouldClear: true,
    };
  }

  let user;

  try {
    user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
  } catch (error) {
    return {
      ok: false,
      message:
        getDatabaseErrorMessage(error) ??
        'Failed to validate the saved session against the database.',
      shouldClear: false,
    };
  }

  if (!user || user.email !== payload.email) {
    return {
      ok: false,
      message: 'User not found. Please login again.',
      shouldClear: true,
    };
  }

  if (user.status !== 'active') {
    return {
      ok: false,
      message: 'Your account is no longer active. Please contact superadmin.',
      shouldClear: true,
    };
  }

  return {
    ok: true,
    session: createStoredSession(mapUser(user)),
  };
}
