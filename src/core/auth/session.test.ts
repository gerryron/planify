import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import {
  AUTH_COOKIE_NAME,
  signAuthToken,
  verifyAuthToken,
  getAuthTokenFromRequest,
  setAuthCookie,
  clearAuthCookie,
  type AuthTokenPayload,
} from './session';

const SECRET = 'test-secret-with-at-least-16-chars';

const VALID_PAYLOAD: AuthTokenPayload = {
  sub: 1,
  email: 'user@example.com',
  role: 'user',
  status: 'active',
  name: 'Test User',
};

describe('session auth token', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it('should sign and verify a valid token', () => {
    const token = signAuthToken(VALID_PAYLOAD);
    expect(verifyAuthToken(token)).toEqual(
      expect.objectContaining(VALID_PAYLOAD),
    );
  });

  it('should return null for a tampered token', () => {
    const token = signAuthToken(VALID_PAYLOAD);
    const tampered = `${token.slice(0, -2)}xx`;
    expect(verifyAuthToken(tampered)).toBeNull();
  });

  it('should return null for a token signed with a different secret', () => {
    const token = signAuthToken(VALID_PAYLOAD);
    process.env.JWT_SECRET = 'another-secret-with-at-least-16-chars';
    expect(verifyAuthToken(token)).toBeNull();
  });

  it('should return null when a payload field is missing', () => {
    const incomplete = jwt.sign(
      { sub: 1, role: 'user', status: 'active', name: 'Test User' },
      SECRET,
      { algorithm: 'HS256', expiresIn: '7d' },
    );
    expect(verifyAuthToken(incomplete)).toBeNull();
  });

  it('should return null for invalid role or status values', () => {
    const badRole = jwt.sign({ ...VALID_PAYLOAD, role: 'admin' }, SECRET, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });
    const badStatus = jwt.sign(
      { ...VALID_PAYLOAD, status: 'suspended' },
      SECRET,
      { algorithm: 'HS256', expiresIn: '7d' },
    );
    expect(verifyAuthToken(badRole)).toBeNull();
    expect(verifyAuthToken(badStatus)).toBeNull();
  });

  it('should return null for garbage input', () => {
    expect(verifyAuthToken('not-a-token')).toBeNull();
    expect(verifyAuthToken('')).toBeNull();
  });

  it('should throw when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;
    expect(() => signAuthToken(VALID_PAYLOAD)).toThrow(
      'JWT_SECRET must be set with at least 16 characters',
    );
  });

  it('should throw when JWT_SECRET is too short', () => {
    process.env.JWT_SECRET = 'short';
    expect(() => signAuthToken(VALID_PAYLOAD)).toThrow(
      'JWT_SECRET must be set with at least 16 characters',
    );
  });
});

describe('session cookie helpers', () => {
  it('should read the auth token from the request cookie header', () => {
    const req = new NextRequest('http://localhost/api', {
      headers: { cookie: `${AUTH_COOKIE_NAME}=abc123` },
    });
    expect(getAuthTokenFromRequest(req)).toBe('abc123');
  });

  it('should return null when the cookie is absent', () => {
    const req = new NextRequest('http://localhost/api');
    expect(getAuthTokenFromRequest(req)).toBeNull();
  });

  it('should set the auth cookie with security options', () => {
    const req = new NextRequest('http://localhost/api');
    const res = NextResponse.json({});
    setAuthCookie(req, res, 'token-value');

    const cookie = res.cookies.get(AUTH_COOKIE_NAME);
    expect(cookie).not.toBeUndefined();
    expect(cookie?.value).toBe('token-value');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.path).toBe('/');
    expect(cookie?.maxAge).toBe(60 * 60 * 24 * 7);
  });

  it('should mark the cookie secure when request uses https', () => {
    const req = new NextRequest('https://localhost/api');
    const res = NextResponse.json({});
    setAuthCookie(req, res, 'token-value');
    expect(res.cookies.get(AUTH_COOKIE_NAME)?.secure).toBe(true);
  });

  it('should not mark the cookie secure on plain http localhost even when a proxy says https', () => {
    const req = new NextRequest('http://localhost/api', {
      headers: {
        'x-forwarded-proto': 'https',
      },
    });
    const res = NextResponse.json({});
    setAuthCookie(req, res, 'token-value');
    expect(res.cookies.get(AUTH_COOKIE_NAME)?.secure).toBe(false);
  });

  it('should mark the cookie secure for non-localhost domains behind https proxy', () => {
    const req = new NextRequest('http://app.planify.local/api', {
      headers: {
        'x-forwarded-proto': 'https',
      },
    });
    const res = NextResponse.json({});
    setAuthCookie(req, res, 'token-value');
    expect(res.cookies.get(AUTH_COOKIE_NAME)?.secure).toBe(true);
  });

  it('should not mark the cookie secure on plain http', () => {
    const req = new NextRequest('http://localhost/api');
    const res = NextResponse.json({});
    setAuthCookie(req, res, 'token-value');
    expect(res.cookies.get(AUTH_COOKIE_NAME)?.secure).toBe(false);
  });

  it('should clear the auth cookie with a past expiry', () => {
    const res = NextResponse.json({});
    clearAuthCookie(res);

    const cookie = res.cookies.get(AUTH_COOKIE_NAME);
    expect(cookie?.value).toBe('');
    expect(cookie?.expires).toBeInstanceOf(Date);
    expect((cookie?.expires as Date).getTime()).toBeLessThanOrEqual(Date.now());
  });
});
