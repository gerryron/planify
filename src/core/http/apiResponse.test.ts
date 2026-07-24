import { ok, badRequest, notFound, unauthorized, forbidden, serverError } from './apiResponse';

describe('apiResponse helpers', () => {
  // ---------------------------------------------------------------------------
  // ok()
  // ---------------------------------------------------------------------------
  describe('ok()', () => {
    it('should return status 200 with data', async () => {
      const data = { id: 1, name: 'Test Wallet' };
      const res = ok(data);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body).toEqual(data);
    });

    it('should support custom status code', async () => {
      const res = ok({ message: 'Created' }, 201);

      expect(res.status).toBe(201);

      const body = await res.json();
      expect(body).toEqual({ message: 'Created' });
    });

    it('should work with primitive values', async () => {
      const res = ok('hello');
      const body = await res.json();
      expect(body).toBe('hello');
    });

    it('should work with arrays', async () => {
      const data = [1, 2, 3];
      const res = ok(data);
      const body = await res.json();
      expect(body).toEqual([1, 2, 3]);
    });
  });

  // ---------------------------------------------------------------------------
  // badRequest()
  // ---------------------------------------------------------------------------
  describe('badRequest()', () => {
    it('should return status 400 with error message', async () => {
      const res = badRequest('Invalid input');

      expect(res.status).toBe(400);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body).toEqual({ error: 'Invalid input' });
    });

    it('should use default error message', async () => {
      const res = badRequest();
      const body = await res.json();
      expect(body).toEqual({ error: 'Invalid request' });
    });
  });

  // ---------------------------------------------------------------------------
  // notFound()
  // ---------------------------------------------------------------------------
  describe('notFound()', () => {
    it('should return status 404 with error message', async () => {
      const res = notFound('Wallet not found');

      expect(res.status).toBe(404);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body).toEqual({ error: 'Wallet not found' });
    });

    it('should use default error message', async () => {
      const res = notFound();
      const body = await res.json();
      expect(body).toEqual({ error: 'Not found' });
    });
  });

  // ---------------------------------------------------------------------------
  // unauthorized()
  // ---------------------------------------------------------------------------
  describe('unauthorized()', () => {
    it('should return status 401 with error message', async () => {
      const res = unauthorized('Invalid token');

      expect(res.status).toBe(401);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body).toEqual({ error: 'Invalid token' });
    });

    it('should use default error message', async () => {
      const res = unauthorized();
      const body = await res.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });
  });

  // ---------------------------------------------------------------------------
  // forbidden()
  // ---------------------------------------------------------------------------
  describe('forbidden()', () => {
    it('should return status 403 with error message', async () => {
      const res = forbidden('Access denied');

      expect(res.status).toBe(403);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body).toEqual({ error: 'Access denied' });
    });

    it('should use default error message', async () => {
      const res = forbidden();
      const body = await res.json();
      expect(body).toEqual({ error: 'Forbidden' });
    });
  });

  // ---------------------------------------------------------------------------
  // serverError()
  // ---------------------------------------------------------------------------
  describe('serverError()', () => {
    it('should return status 500 with error message', async () => {
      const res = serverError('Database connection failed');

      expect(res.status).toBe(500);
      expect(res.headers.get('content-type')).toContain('application/json');

      const body = await res.json();
      expect(body).toEqual({ error: 'Database connection failed' });
    });

    it('should use default error message', async () => {
      const res = serverError();
      const body = await res.json();
      expect(body).toEqual({ error: 'Internal server error' });
    });
  });
});
