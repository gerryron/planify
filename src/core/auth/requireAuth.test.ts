import { NextRequest } from 'next/server';
import { requireAuth } from './requireAuth';
import { AUTH_COOKIE_NAME, signAuthToken } from './session';

const SECRET = 'test-secret-with-at-least-16-chars';

function requestWithToken(token?: string) {
  return new NextRequest('http://localhost/api/test', {
    headers: token ? { cookie: `${AUTH_COOKIE_NAME}=${token}` } : undefined,
  });
}

describe('requireAuth (test environment stub)', () => {
  it('should return the stub test user without a token', () => {
    const result = requireAuth(new NextRequest('http://localhost/api/test'));
    expect(result.error).toBeUndefined();
    expect(result.user).toEqual({
      sub: 1,
      email: 'test.user@planify.local',
      role: 'user',
      status: 'active',
      name: 'Test User',
    });
  });

  it('should return a superadmin stub when requireSuperadmin is set', () => {
    const result = requireAuth(new NextRequest('http://localhost/api/test'), {
      requireSuperadmin: true,
    });
    expect(result.error).toBeUndefined();
    expect(result.user?.role).toBe('superadmin');
  });
});

describe('requireAuth (real branch)', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    // requireAuth checks NODE_ENV at call time; leave the Jest default 'test'
    // to exercise the real token/cookie verification path.
    (process.env as unknown as { NODE_ENV?: string }).NODE_ENV = 'development';
    process.env.JWT_SECRET = SECRET;
  });

  afterEach(() => {
    (process.env as unknown as { NODE_ENV?: string }).NODE_ENV = originalEnv;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it('should return 401 when no auth cookie is present', () => {
    const result = requireAuth(requestWithToken());
    expect(result.error?.status).toBe(401);
    const body = result.error?.json ? result.error : null;
    expect(body).toBeTruthy();
  });

  it('should return 401 when the token is invalid', () => {
    const result = requireAuth(requestWithToken('not-a-valid-token'));
    expect(result.error?.status).toBe(401);
  });

  it('should return 403 when the user status is pending', () => {
    const token = signAuthToken({
      sub: 2,
      email: 'pending@example.com',
      role: 'user',
      status: 'pending',
      name: 'Pending User',
    });
    const result = requireAuth(requestWithToken(token));
    expect(result.error?.status).toBe(403);
  });

  it('should allow pending users when requireActive is false', () => {
    const token = signAuthToken({
      sub: 2,
      email: 'pending@example.com',
      role: 'user',
      status: 'pending',
      name: 'Pending User',
    });
    const result = requireAuth(requestWithToken(token), {
      requireActive: false,
    });
    expect(result.error).toBeUndefined();
    expect(result.user?.sub).toBe(2);
  });

  it('should return 403 when requireSuperadmin and role is user', () => {
    const token = signAuthToken({
      sub: 1,
      email: 'user@example.com',
      role: 'user',
      status: 'active',
      name: 'User',
    });
    const result = requireAuth(requestWithToken(token), {
      requireSuperadmin: true,
    });
    expect(result.error?.status).toBe(403);
  });

  it('should allow a superadmin through', () => {
    const token = signAuthToken({
      sub: 1,
      email: 'admin@example.com',
      role: 'superadmin',
      status: 'active',
      name: 'Admin',
    });
    const result = requireAuth(requestWithToken(token), {
      requireSuperadmin: true,
    });
    expect(result.error).toBeUndefined();
    expect(result.user?.role).toBe('superadmin');
  });
});
