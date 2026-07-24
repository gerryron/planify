import { apiClient, ApiError } from './apiClient';

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// get()
// ---------------------------------------------------------------------------
describe('apiClient.get()', () => {
  it('should make a GET request and return parsed JSON', async () => {
    const data = { id: 1, name: 'Test' };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(data),
    });

    const result = await apiClient.get<{ id: number; name: string }>(
      '/api/wallets',
    );

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/wallets',
      expect.objectContaining({
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(result).toEqual(data);
  });

  it('should return undefined for 204 No Content', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204,
      json: jest.fn(),
    });

    const result = await apiClient.get('/api/empty');
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// post()
// ---------------------------------------------------------------------------
describe('apiClient.post()', () => {
  it('should make a POST request with JSON body', async () => {
    const data = { id: 1 };
    const body = { name: 'New Wallet', balance: 1000 };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      json: jest.fn().mockResolvedValue(data),
    });

    const result = await apiClient.post<{ id: number }>('/api/wallets', body);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/wallets',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    expect(result).toEqual(data);
  });

  it('should POST without body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    });

    await apiClient.post('/api/wallets');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/wallets',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Verify body is absent when not provided
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.body).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// patch()
// ---------------------------------------------------------------------------
describe('apiClient.patch()', () => {
  it('should make a PATCH request with JSON body', async () => {
    const data = { id: 1, name: 'Updated' };
    const body = { name: 'Updated Wallet' };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(data),
    });

    const result = await apiClient.patch<{ id: number; name: string }>(
      '/api/wallets',
      body,
    );

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/wallets',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
    expect(result).toEqual(data);
  });

  it('should PATCH without body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    });

    await apiClient.patch('/api/wallets');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.method).toBe('PATCH');
    expect(init.body).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// delete()
// ---------------------------------------------------------------------------
describe('apiClient.delete()', () => {
  it('should make a DELETE request without body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    const result = await apiClient.delete<{ success: boolean }>(
      '/api/wallets/1',
    );

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/wallets/1',
      expect.objectContaining({
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(result).toEqual({ success: true });
  });

  it('should make a DELETE request with body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ success: true }),
    });

    await apiClient.delete('/api/wallets', { id: 1 });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/wallets',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ id: 1 }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
describe('apiClient error handling', () => {
  it('should throw ApiError on non-2xx response with server error message', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: 'Invalid request' }),
    });

    const promise = apiClient.get('/api/wallets');

    await expect(promise).rejects.toThrow(ApiError);
    await expect(promise).rejects.toMatchObject({
      status: 400,
      message: 'Invalid request',
    });
  });

  it('should use default error message when response body is not JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      json: jest.fn().mockRejectedValue(new Error('parse error')),
    });

    const promise = apiClient.get('/api/wallets');

    await expect(promise).rejects.toMatchObject({
      status: 502,
      message: 'Request failed with status 502',
    });
  });

  it('should use default error message when response JSON has no error field', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ message: 'Something broke' }),
    });

    const promise = apiClient.get('/api/wallets');

    await expect(promise).rejects.toMatchObject({
      status: 500,
      message: 'Request failed with status 500',
    });
  });

  it('should propagate network errors when fetch rejects', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error('Network failure'),
    );

    await expect(apiClient.get('/api/wallets')).rejects.toThrow(
      'Network failure',
    );
  });

  it('should include status code in ApiError', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue({ error: 'Not found' }),
    });

    try {
      await apiClient.get('/api/wallets/999');
      fail('Expected ApiError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(404);
      expect((error as ApiError).message).toBe('Not found');
    }
  });
});
