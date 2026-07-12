# Data Model: Refaktor Maintainability Planify

**Branch**: `001-refactor-maintainability` | **Date**: 2026-07-12

## Overview

Refaktor ini TIDAK mengubah Prisma schema. Data model ini mendokumentasikan type/entity baru yang diperkenalkan untuk mendukung refaktor: API client types, error hierarchy, dan React Query cache keys.

## New Entities

### 1. ApiClient

Shared HTTP client untuk semua frontend service calls.

```typescript
// src/core/http/apiClient.ts

interface ApiClientConfig {
  baseUrl: string;           // default: ''
  headers: Record<string, string>;  // default: { 'Content-Type': 'application/json' }
}

class ApiClient {
  // Methods
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  patch<T>(path: string, body: unknown): Promise<T>
  delete<T>(path: string): Promise<T>
}

// Generated error type
class ApiError extends Error {
  status: number;            // HTTP status code (e.g., 400, 404, 500)
  body: string;              // Error message from API response
}

// Singleton instance
const apiClient: ApiClient
```

### 2. Error Hierarchy

Standard error classes untuk menggantikan string matching di API route handlers.

```typescript
// src/core/http/apiErrors.ts

type AppErrorCode =
  | 'WALLET_NOT_FOUND'
  | 'WALLET_VALIDATION'
  | 'CATEGORY_NOT_FOUND'
  | 'CATEGORY_VALIDATION'
  | 'BUDGET_NOT_FOUND'
  | 'BUDGET_VALIDATION'
  | 'CASH_LOG_NOT_FOUND'
  | 'CASH_LOG_VALIDATION'
  | 'TRANSFER_VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'

class AppError extends Error {
  code: AppErrorCode;
  message: string;
  status: number;           // HTTP status code (default: 400)
}

class NotFoundError extends AppError {
  // status: 404
  constructor(resource: string)
}

class ValidationError extends AppError {
  // status: 400
  constructor(message: string)
}

class AuthError extends AppError {
  // status: 401
  constructor(message?: string)
}

class ForbiddenError extends AppError {
  // status: 403
  constructor(message?: string)
}

// Error → NextResponse mapper
function handleApiError(error: unknown): NextResponse
  // if AppError → return ok({ error: message }, status)
  // if Prisma error → log, return serverError()
  // else → log, return serverError()
```

### 3. Wallet Validation

Pure validation functions untuk wallet input.

```typescript
// src/features/wallets/utils/validation.ts

interface WalletInput {
  walletName?: string;
  kind?: 'basic' | 'goal' | 'credit_card';
  goalAmount?: number | null;
  creditCardStatementDay?: number | null;
  creditCardDueDay?: number | null;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateWalletFields(input: WalletInput, isUpdate?: boolean): ValidationResult
  // Validasi common fields (walletName required)
  // Jika kind === 'goal': goalAmount wajib
  // Jika kind === 'credit_card': statementDay & dueDay wajib
  // Untuk update: hanya validasi field yang dikirim
```

### 4. React Query Cache Keys & Types

```typescript
// src/lib/queryClient.ts

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 menit default
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

// Cache key conventions (string constants)
const QUERY_KEYS = {
  WALLETS: 'wallets',
  WALLET: (id: number) => ['wallets', id],
  CATEGORIES: 'categories',
  CASH_LOGS: (walletId?: number) => ['cash-logs', walletId],
  MONTHLY_BUDGETS: (month: string) => ['monthly-budgets', month],
  DASHBOARD: (month: string) => ['dashboard', month],
  USER: 'user',
} as const;
```

### 5. Dashboard Data Shape

Shape data yang di-return oleh `useDashboardData()`.

```typescript
// src/features/dashboard/hooks/useDashboardData.ts

interface DashboardData {
  summary: {
    totalIncome: number;
    totalOutcome: number;
    netBalance: number;
    walletCount: number;
  };
  monthlyTrend: Array<{
    month: string;
    income: number;
    outcome: number;
  }>;
  topExpenses: Array<{
    categoryName: string;
    amount: number;
    percentage: number;
  }>;
  creditCardUtilization: Array<{
    walletName: string;
    usage: number;
    limit: number;
    percentage: number;
  }>;
  recentTransactions: Array<{
    id: number;
    description: string;
    amount: number;
    category: string;
    date: string;
  }>;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}
```

## Unchanged Entities (Prisma Schema)

Tidak ada perubahan. Schema existing tetap:

- **User**: id, name, email, password, role (USER|SUPERADMIN), status (ACTIVE|INACTIVE|PENDING)
- **Wallet**: id, walletName, kind (BASIC|GOAL|CREDIT_CARD), balance, goalAmount?, creditCardStatementDay?, creditCardDueDay?, order, userId
- **Category**: id, categoryName, type (INCOME|OUTCOME), parentId?, isDefault, userId?
- **CashLog**: id, description, amount, type (INCOME|OUTCOME), date, categoryId, walletId, walletName?, relatedTransferGroupId?
- **MonthlyBudget**: id, month, type (INCOME|OUTCOME|CARRYOVER), amount, categoryName?, order, userId
