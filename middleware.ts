import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/core/auth/session';

type DecodedPayload = {
  role?: 'user' | 'superadmin';
  status?: 'pending' | 'active';
  exp?: number;
};

function base64UrlToUint8Array(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }

  return diff === 0;
}

async function verifyJwtPayload(token: string): Promise<DecodedPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim().length < 16) return null;

    const [headerPart, payloadPart, signaturePart] = parts;
    const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signed = await crypto.subtle.sign('HMAC', key, data);
    const expectedSignature = new Uint8Array(signed);
    const tokenSignature = base64UrlToUint8Array(signaturePart);

    if (!timingSafeEqual(expectedSignature, tokenSignature)) {
      return null;
    }

    const payloadJson = new TextDecoder().decode(
      base64UrlToUint8Array(payloadPart),
    );
    const payload = JSON.parse(payloadJson) as DecodedPayload;

    if (typeof payload.exp === 'number') {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowSeconds) {
        return null;
      }
    }

    if (
      (payload.role !== 'user' && payload.role !== 'superadmin') ||
      (payload.status !== 'pending' && payload.status !== 'active')
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function isPublicPage(pathname: string) {
  return pathname === '/';
}

function isPublicApi(pathname: string) {
  return (
    pathname.startsWith('/api/auth/') ||
    pathname === '/api/swagger' ||
    pathname.startsWith('/api/swagger/')
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const payload = token ? await verifyJwtPayload(token) : null;

  if (pathname.startsWith('/api/')) {
    if (isPublicApi(pathname)) {
      return NextResponse.next();
    }

    if (!token || !payload) {
      return NextResponse.json(
        { error: 'Please login first' },
        { status: 401 },
      );
    }

    if (payload.status !== 'active') {
      return NextResponse.json(
        { error: 'Your account is not active' },
        { status: 403 },
      );
    }

    if (
      payload?.role === 'superadmin' &&
      !pathname.startsWith('/api/superadmin/')
    ) {
      return NextResponse.json(
        { error: 'Superadmin account only has approval panel access' },
        { status: 403 },
      );
    }

    if (pathname.startsWith('/api/superadmin/')) {
      if (payload?.role !== 'superadmin' || payload?.status !== 'active') {
        return NextResponse.json(
          { error: 'Superadmin access only' },
          { status: 403 },
        );
      }
    }

    return NextResponse.next();
  }

  if (isPublicPage(pathname)) {
    if (!token) return NextResponse.next();

    if (payload?.status === 'active') {
      const redirectTo =
        payload.role === 'superadmin' ? '/admin-panel' : '/home';
      return NextResponse.redirect(new URL(redirectTo, req.url));
    }

    return NextResponse.next();
  }

  if (!token || !payload || payload.status !== 'active') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/superadmin')) {
    return NextResponse.redirect(new URL('/admin-panel', req.url));
  }

  if (pathname.startsWith('/admin-panel')) {
    if (payload?.role !== 'superadmin' || payload?.status !== 'active') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  if (payload?.role === 'superadmin') {
    return NextResponse.redirect(new URL('/admin-panel', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|brand|sw.js).*)',
  ],
};
