# Architecture

## Gambaran Umum

Planify menggunakan Next.js App Router dengan pembagian tanggung jawab yang jelas:

- `src/app`: entry page dan API route
- `src/core`: utilitas lintas aplikasi (auth, db, response helper)
- `src/features`: modul fitur domain (wallets, cash-log, budget, dll)
- `src/shared`: komponen lintas fitur (layout, theme, PWA)
- `src/lib`: utilitas global (OpenAPI spec)
- `prisma`: skema data dan migration

## Struktur Modul

### Routing dan API

- UI route memakai App Router page di `src/app/**/page.tsx`.
- Endpoint backend memakai route handler di `src/app/api/**/route.ts`.
- Middleware global di `middleware.ts` menangani kontrol akses halaman dan API.

### Data Access

- Prisma client singleton berada di `src/core/db/prisma.ts`.
- Semua route memakai Prisma untuk operasi data.
- Transaction (`prisma.$transaction`) digunakan pada mutasi kritis, terutama yang mengubah saldo wallet dan transaksi log.

### Auth Layer

- Session berbasis JWT cookie (`planify_auth_token`).
- Utility sesi di `src/core/auth/session.ts`.
- Guard endpoint di `src/core/auth/requireAuth.ts`.
- Validasi akses superadmin dipakai pada route superadmin.

### Feature Layer

Setiap feature memiliki struktur standar:

- `components`: UI komponen
- `hooks`: custom React hooks (data fetching, state management)
- `services`: API client functions
- `types`: tipe data domain
- `utils` (opsional): helper logic spesifik fitur

### HTTP & Error Handling

- `src/core/http/apiClient.ts` — shared frontend API client singleton (get, post, patch, delete)
- `src/core/http/apiErrors.ts` — error class hierarchy (AppError, ValidationError, NotFoundError, AuthError, ForbiddenError) + `handleApiError()` mapper
- `src/core/http/apiResponse.ts` — response helpers (ok, badRequest, notFound, unauthorized, serverError)

### Data Caching

- `src/lib/queryClient.ts` — React Query client config + cache key constants
- `QueryClientProvider` di root layout via `src/shared/providers/QueryProvider.tsx`
- Custom hooks (`useWallets`, `useCategories`, `useCashLogs`, `useMonthlyBudgets`) menyediakan query + mutation

## Alur Request (Ringkas)

1. Request masuk ke middleware.
2. Middleware memutuskan boleh lanjut, ditolak, atau redirect.
3. Route handler memanggil `requireAuth` (untuk endpoint privat).
4. Route menjalankan query/mutasi Prisma.
5. Error handling via `handleApiError()` — semua error terstandarisasi sebagai `AppError` subclass.
6. Response distandarkan oleh helper di `src/core/http/apiResponse.ts`.

## Pola Konsistensi Data

- Operasi transaksi cash log dan transfer wallet diproses atomik dalam transaction.
- Perubahan saldo wallet dihitung dari category type (income/outcome) dan wallet kind.
- Perubahan nama wallet melakukan sinkronisasi `walletName` pada cash log terkait.

## PWA dan Offline

- Manifest di `src/app/manifest.ts`.
- Service worker di `public/sw.js`.
- Registrasi service worker dan replay queue di `src/shared/pwa/PWARegister.tsx`.
- Offline write queue client di `src/shared/pwa/writeQueueClient.ts`.
