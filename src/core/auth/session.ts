import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { UserRole, UserStatus } from '@/generated/prisma/enums';

export const AUTH_COOKIE_NAME = 'planify_auth_token';

export type AuthTokenPayload = {
  sub: number;
  email: string;
  role: UserRole;
  status: UserStatus;
  name: string;
};

const AUTH_TOKEN_TTL = '7d';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error('JWT_SECRET must be set with at least 16 characters');
  }
  return secret;
}

export function signAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: AUTH_TOKEN_TTL,
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded !== 'object' || decoded === null) {
      return null;
    }

    const payload = decoded as Partial<AuthTokenPayload>;
    if (
      !payload.sub ||
      !payload.email ||
      !payload.name ||
      (payload.role !== 'user' && payload.role !== 'superadmin') ||
      (payload.status !== 'pending' && payload.status !== 'active')
    ) {
      return null;
    }

    return payload as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function getAuthTokenFromRequest(req: NextRequest) {
  return req.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
}

function isSecureCookieRequest(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') return true;
  const protocol = req.headers.get('x-forwarded-proto');
  return protocol === 'https';
}

export function setAuthCookie(
  req: NextRequest,
  res: NextResponse,
  token: string,
) {
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureCookieRequest(req),
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}
