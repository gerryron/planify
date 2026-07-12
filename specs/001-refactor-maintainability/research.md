# Research: Refaktor Maintainability Planify

**Branch**: `001-refactor-maintainability` | **Date**: 2026-07-12

## 1. Data Fetching Library: React Query vs SWR vs Context

### Decision: React Query (`@tanstack/react-query` v5)

### Rationale

| Criteria | React Query | SWR | Context + useReducer |
|----------|-------------|-----|---------------------|
| Cache invalidation otomatis | ✅ Built-in (`invalidateQueries`) | ✅ `mutate()` | ❌ Manual |
| Stale-while-revalidate | ✅ `staleTime` + `refetchOnWindowFocus` | ✅ Default behavior | ❌ Manual |
| DevTools | ✅ React Query DevTools | ❌ Tidak ada | ❌ Tidak ada |
| Bundle size | ~12KB gzipped | ~5KB gzipped | 0 (built-in) |
| Maturity | 1M+ weekly downloads | 1M+ weekly downloads | N/A |
| Pagination/Infinite Query | ✅ `useInfiniteQuery` | ✅ `useSWRInfinite` | ❌ |
| Mutation API | ✅ `useMutation` | ✅ `useSWRMutation` | ❌ |

**Kenapa React Query dipilih:**
- DevTools memudahkan debugging cache behavior selama development
- `useMutation` + `invalidateQueries` pattern sudah mature untuk operasi write
- `staleTime` bisa diset per-query (kategori: lama, wallets: pendek)
- Planify sudah pakai React 19 — React Query v5 fully compatible

**Yang ditolak:**
- SWR: tidak ada DevTools, fitur lebih minimal. Cukup baik untuk use case sederhana tapi React Query lebih future-proof.
- Context manual: terlalu banyak boilerplate, tidak ada cache invalidation otomatis. Lokal untuk sekarang — tidak scalable.

### Implementation Notes
- `staleTime` default: 5 menit untuk data yang jarang berubah (kategori), 30 detik untuk data yang sering berubah (wallets, cash logs)
- `refetchOnWindowFocus: true` untuk memastikan data tetap fresh
- `QueryClientProvider` di root layout, `queryClient` singleton di `src/lib/queryClient.ts`

## 2. API Error Handling: Custom Class vs Error Code Enum vs String Union

### Decision: Custom Error Class Hierarchy

### Rationale

| Criteria | Class Hierarchy | Error Code Enum | String Union |
|----------|----------------|-----------------|--------------|
| TypeScript exhaustiveness | ✅ `instanceof` narrowing | ✅ Switch exhaustiveness | ⚠️ String comparison |
| HTTP status mapping | ✅ `status` property | ⚠️ Mapping terpisah | ❌ Manual per-site |
| Stack trace preservation | ✅ Native | ❌ Lost | ❌ Lost |
| Extensibility | ✅ Subclass | ⚠️ Tambah enum member | ⚠️ Tambah union member |
| Learning curve | Rendah (standard JS) | Rendah | Rendah |

**Kenapa class hierarchy dipilih:**
```typescript
// src/core/http/apiErrors.ts
export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public status: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} tidak ditemukan`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
  }
}
```

**Yang ditolak:**
- Error code enum: perlu mapping HTTP status terpisah, tidak bisa bawa context tambahan
- String union: tidak ada type narrowing yang efektif, sulit untuk pattern matching

### Implementation Notes
- Route handler cukup throw `AppError` — satu error boundary middleware (atau wrapper) yang menangkap dan mengonversi ke `NextResponse`
- Backward compatible: error string matching existing tetap berfungsi selama transisi (tapi dihapus setelah semua route dimigrasi)

## 3. Shared API Client: fetch Wrapper vs Axios vs Ky

### Decision: Custom fetch wrapper (zero dependency)

### Rationale

| Criteria | Custom fetch | Axios | Ky |
|----------|-------------|-------|-----|
| Bundle size | 0 (built-in) | ~14KB gzipped | ~4KB gzipped |
| Interceptors | Manual | ✅ Built-in | ✅ Hooks |
| Request/response typing | Manual generic | ✅ Generic | ✅ Generic |
| Error transformation | Manual | ⚠️ AxiosError | ✅ HTTPError |
| Next.js compatibility | ✅ Native | ✅ | ✅ |

**Kenapa custom fetch dipilih:**
- Next.js sudah punya `fetch` dengan caching built-in — tidak perlu library tambahan
- Kebutuhan Planify sederhana: GET, POST, PATCH, DELETE dengan JSON body
- Zero dependency = tidak ada risiko breaking change dari library eksternal
- Jika kebutuhan berkembang (retry, circuit breaker, dll), bisa migrasi ke Ky tanpa API change karena wrapper kita sendiri

**Yang ditolak:**
- Axios: terlalu berat untuk kebutuhan Planify. 14KB untuk fitur yang tidak digunakan.
- Ky: alternatif bagus, tapi untuk 4 method HTTP sederhana, custom wrapper cukup.

### Implementation Design
```typescript
// src/core/http/apiClient.ts
interface ApiClientConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
}

class ApiClient {
  private config: ApiClientConfig;
  
  constructor(config: ApiClientConfig = {}) {
    this.config = { baseUrl: '', headers: {}, ...config };
  }
  
  async get<T>(path: string): Promise<T> { ... }
  async post<T>(path: string, body: unknown): Promise<T> { ... }
  async patch<T>(path: string, body: unknown): Promise<T> { ... }
  async delete<T>(path: string): Promise<T> { ... }
  
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...this.config.headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new ApiError(res.status, json.error || 'Terjadi kesalahan');
    }
    return res.json();
  }
}

export const apiClient = new ApiClient();
```

## 4. Validasi Wallet: Shared Functions vs Zod Schema

### Decision: Plain TypeScript functions (untuk sekarang)

### Rationale

- Validasi Planify saat ini sederhana: required fields, date format, field compatibility (goal wallet harus punya goalAmount, credit card harus punya statementDay)
- Zod akan menjadi dependency baru (~12KB) untuk validasi yang bisa ditangani dengan plain TS functions
- Jika di masa depan validasi semakin kompleks, migrasi ke Zod bisa dilakukan dengan membungkus functions yang ada

### Implementation Design
```typescript
// src/features/wallets/utils/validation.ts
interface WalletInput {
  walletName: string;
  kind: WalletKind;
  goalAmount?: number | null;
  creditCardStatementDay?: number | null;
  creditCardDueDay?: number | null;
  // ...
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateWalletFields(input: WalletInput, isUpdate?: boolean): ValidationResult {
  const errors: string[] = [];
  
  if (!input.walletName?.trim()) errors.push('Nama wallet harus diisi');
  
  if (input.kind === 'goal' && !input.goalAmount) {
    errors.push('Goal amount harus diisi untuk wallet tujuan');
  }
  
  if (input.kind === 'credit_card') {
    if (!input.creditCardStatementDay) errors.push('Statement day harus diisi');
    if (!input.creditCardDueDay) errors.push('Due day harus diisi');
  }
  
  return { valid: errors.length === 0, errors };
}
```

## 5. React Query vs No Caching Library (Status Quo)

### Decision: React Query

### Rationale

Saat ini Planify melakukan fetch di setiap halaman secara independen. Navigasi dashboard → wallets → dashboard menghasilkan 3 kali fetch wallets. React Query mengubah ini:

- Fetch pertama: data masuk cache
- Navigasi kedua: data dari cache (instant, <10ms)
- User create wallet baru: `useMutation` → `invalidateQueries(['wallets'])` → auto refetch

Tanpa library, kita harus mengelola cache manual via Context API — yang sudah kita tolak di poin #1.

### Implementation Notes
- `QueryClientProvider` wrap di `src/app/layout.tsx`
- Custom hooks: `useWallets()`, `useCategories()`, `useDashboardData()`, `useCashLogs()`, `useMonthlyBudgets()`
- Semua hook menggunakan `useQuery` / `useMutation` dari React Query
- Service files tetap ada (untuk API call mentah) tapi dipanggil via hooks, bukan langsung dari komponen
