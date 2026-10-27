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

function isLocalhostHost(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.startsWith('localhost:') ||
    hostname.startsWith('127.0.0.1:') ||
    hostname.startsWith('[::1]:')
  );
}

function isSecureCookieRequest(req: NextRequest) {
  const host = req.headers.get('host') ?? req.nextUrl?.hostname ?? '';
  const nextUrlProtocol = req.nextUrl?.protocol;
  const forwardedProtoHeader = req.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    .trim()
    .toLowerCase();

  if (nextUrlProtocol === 'https:') {
    return true;
  }

  if (isLocalhostHost(host)) {
    return false;
  }

  if (forwardedProtoHeader) {
    return forwardedProtoHeader === 'https';
  }

  return process.env.NODE_ENV === 'production';
}

export function setAuthCookie(
  req: NextRequest,
  res: NextResponse,
  token: string,
) {
  const maxAge = 60 * 60 * 24 * 7;
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecureCookieRequest(req),
    sameSite: 'lax',
    path: '/',
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
  });
}

export function clearAuthCookie(res: NextResponse, req?: NextRequest) {
  res.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: req ? isSecureCookieRequest(req) : process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}
