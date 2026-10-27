import { NextRequest } from 'next/server';
import { proxy } from './proxy';

describe('proxy loopback normalization', () => {
  it('redirects 127.0.0.1 to localhost to keep the session cookie consistent', async () => {
    const req = new NextRequest('http://localhost:3000/login', {
      headers: { host: '127.0.0.1:3000' },
    });
    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/login');
  });

  it('keeps localhost requests as-is', async () => {
    const req = new NextRequest('http://localhost:3000/login');
    const res = await proxy(req);

    expect(res.status).toBe(200);
  });
});
