import { NextResponse } from 'next/server';
import { badRequest, notFound, unauthorized, forbidden, serverError } from './apiResponse';

// ---------------------------------------------------------------------------
// Error codes – machine‑readable identifiers for every known error condition.
// Add new codes as the API surface grows.
// ---------------------------------------------------------------------------
export type AppErrorCode =
  | 'WALLET_NOT_FOUND'
  | 'WALLET_VALIDATION'
  | 'WALLET_LAST_WALLET'
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_VALIDATION'
  | 'CATEGORY_DEFAULT_PROTECTED'
  | 'BUDGET_NOT_FOUND'
  | 'BUDGET_VALIDATION'
  | 'CASH_LOG_NOT_FOUND'
  | 'CASH_LOG_VALIDATION'
  | 'TRANSFER_VALIDATION'
  | 'TRANSFER_SAME_WALLET'
  | 'TRANSFER_INSUFFICIENT_BALANCE'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_EMAIL_EXISTS'
  | 'AUTH_NOT_APPROVED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR';

// ---------------------------------------------------------------------------
// Base error class – all API errors extend this.
// Replaces the old `if (error.message === '...')` string‑matching pattern.
// ---------------------------------------------------------------------------
export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly status: number;

  constructor(code: AppErrorCode, message: string, status = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Convenience subclasses
// ---------------------------------------------------------------------------
export class NotFoundError extends AppError {
  constructor(code: AppErrorCode, resource: string) {
    super(code, `${resource} tidak ditemukan`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(code: AppErrorCode, message: string) {
    super(code, message, 400);
  }
}

export class AuthError extends AppError {
  constructor(code: AppErrorCode = 'UNAUTHORIZED', message = 'Unauthorized') {
    super(code, message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

// ---------------------------------------------------------------------------
// Centralised error‑to‑response mapper.
// Use in every API route's catch block:
//   try { … } catch (error) { return handleApiError(error); }
// ---------------------------------------------------------------------------
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    switch (error.status) {
      case 404:
        return notFound(error.message);
      case 401:
        return unauthorized(error.message);
      case 403:
        return forbidden(error.message);
      default:
        return badRequest(error.message);
    }
  }

  // Prisma / unexpected errors – log the detail, return a generic message.
  console.error('[API] Unhandled error:', error);
  return serverError('Terjadi kesalahan pada server');
}
