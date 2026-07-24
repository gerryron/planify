import {
  AppError,
  NotFoundError,
  ValidationError,
  AuthError,
  ForbiddenError,
  handleApiError,
} from './apiErrors';

// Suppress expected console.error noise from handleApiError for unknown errors.
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// AppError base class
// ---------------------------------------------------------------------------
describe('AppError', () => {
  it('should create error with code, message, and status', () => {
    const error = new AppError('WALLET_NOT_FOUND', 'Wallet not found', 404);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('WALLET_NOT_FOUND');
    expect(error.message).toBe('Wallet not found');
    expect(error.status).toBe(404);
  });

  it('should default to status 400', () => {
    const error = new AppError('WALLET_VALIDATION', 'Invalid wallet');
    expect(error.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// NotFoundError
// ---------------------------------------------------------------------------
describe('NotFoundError', () => {
  it('should have status 404 and Indonesian message format', () => {
    const error = new NotFoundError('WALLET_NOT_FOUND', 'Wallet');

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('WALLET_NOT_FOUND');
    expect(error.message).toBe('Wallet tidak ditemukan');
    expect(error.status).toBe(404);
  });

  it('should work with any resource name', () => {
    const error = new NotFoundError('CATEGORY_NOT_FOUND', 'Category');
    expect(error.message).toBe('Category tidak ditemukan');
    expect(error.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// ValidationError
// ---------------------------------------------------------------------------
describe('ValidationError', () => {
  it('should have status 400', () => {
    const error = new ValidationError(
      'WALLET_VALIDATION',
      'Name is required',
    );

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('WALLET_VALIDATION');
    expect(error.message).toBe('Name is required');
    expect(error.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// AuthError
// ---------------------------------------------------------------------------
describe('AuthError', () => {
  it('should have status 401 with default values', () => {
    const error = new AuthError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.message).toBe('Unauthorized');
    expect(error.status).toBe(401);
  });

  it('should accept custom code and message', () => {
    const error = new AuthError(
      'AUTH_EMAIL_EXISTS',
      'Email already registered',
    );

    expect(error.code).toBe('AUTH_EMAIL_EXISTS');
    expect(error.message).toBe('Email already registered');
    expect(error.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// ForbiddenError
// ---------------------------------------------------------------------------
describe('ForbiddenError', () => {
  it('should have status 403 with default values', () => {
    const error = new ForbiddenError();

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Forbidden');
    expect(error.status).toBe(403);
  });

  it('should accept custom message', () => {
    const error = new ForbiddenError('Access denied');
    expect(error.message).toBe('Access denied');
    expect(error.status).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
});

// ---------------------------------------------------------------------------
// handleApiError() – response dispatch
// ---------------------------------------------------------------------------
describe('handleApiError()', () => {
  it('should return 404 for NotFoundError', async () => {
    const error = new NotFoundError('WALLET_NOT_FOUND', 'Wallet');
    const res = handleApiError(error);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'Wallet tidak ditemukan' });
  });

  it('should return 401 for AuthError', async () => {
    const error = new AuthError();
    const res = handleApiError(error);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('should return 403 for ForbiddenError', async () => {
    const error = new ForbiddenError('No access');
    const res = handleApiError(error);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: 'No access' });
  });

  it('should return 400 for ValidationError', async () => {
    const error = new ValidationError(
      'WALLET_VALIDATION',
      'Invalid data',
    );
    const res = handleApiError(error);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'Invalid data' });
  });

  it('should return 400 base AppError (default branch)', async () => {
    const error = new AppError('INTERNAL_ERROR', 'Something went wrong', 400);
    const res = handleApiError(error);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'Something went wrong' });
  });

  it('should return 400 for unknown AppError status code', async () => {
    const error = new AppError('TRANSFER_VALIDATION', 'Conflict', 409);
    const res = handleApiError(error);

    // Status 409 falls through to the default branch → badRequest → 400
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'Conflict' });
  });

  it('should return 500 for unknown Error instance', async () => {
    const error = new Error('Something unexpected');
    const res = handleApiError(error);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Terjadi kesalahan pada server' });
  });

  it('should return 500 for non-Error thrown value (string)', async () => {
    const res = handleApiError('string error');

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Terjadi kesalahan pada server' });
  });

  it('should return 500 for null thrown value', async () => {
    const res = handleApiError(null);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Terjadi kesalahan pada server' });
  });

  it('should return 500 for undefined thrown value', async () => {
    const res = handleApiError(undefined);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Terjadi kesalahan pada server' });
  });
});
