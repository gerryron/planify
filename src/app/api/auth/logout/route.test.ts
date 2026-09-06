import { POST } from './route';
import { AUTH_COOKIE_NAME } from '@/core/auth/session';

describe('POST /api/auth/logout', () => {
  it('should clear the auth cookie', async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    const cookie = res.cookies.get(AUTH_COOKIE_NAME);
    expect(cookie?.value).toBe('');
    expect(cookie?.expires).toBeInstanceOf(Date);
    expect((cookie?.expires as Date).getTime()).toBeLessThanOrEqual(Date.now());
  });
});
