# Testing

Sumber utama:

- `jest.config.js`
- `src/**/*.test.ts`

## Konfigurasi

Jest memakai:

- `preset: ts-jest`
- `testEnvironment: node`
- root test: `src`
- alias `@/*` diarahkan ke `src/*`
- TypeScript test diproses dengan ESM mode
- Hook/component test memakai jsdom via docblock `@jest-environment jsdom`

## Test yang Sudah Ada

41 suite / 470 test (semua passing):

- `src/app/api/auth/login/route.test.ts`
- `src/app/api/auth/logout/route.test.ts`
- `src/app/api/auth/me/route.test.ts`
- `src/app/api/auth/register/route.test.ts`
- `src/app/api/cash-log/route.test.ts`
- `src/app/api/categories/route.test.ts`
- `src/app/api/monthly-budget/copy/route.test.ts`
- `src/app/api/monthly-budget/route.test.ts`
- `src/app/api/settings/purge/route.test.ts`
- `src/app/api/superadmin/users/approve/route.test.ts`
- `src/app/api/superadmin/users/deactivate/route.test.ts`
- `src/app/api/superadmin/users/route.test.ts`
- `src/app/api/wallets/route.test.ts`
- `src/app/api/wallets/transfer/route.test.ts`
- `src/core/auth/ensureSuperadmin.test.ts`
- `src/core/auth/password.test.ts`
- `src/core/auth/requireAuth.test.ts`
- `src/core/auth/session.test.ts`
- `src/core/http/apiClient.test.ts`
- `src/core/http/apiErrors.test.ts`
- `src/core/http/apiResponse.test.ts`
- `src/features/cash-log/hooks/useCashLogs.test.ts`
- `src/features/categories/hooks/useCategories.test.ts`
- `src/features/dashboard/hooks/useDashboardCreditCards.test.tsx`
- `src/features/dashboard/hooks/useDashboardData.test.tsx`
- `src/features/dashboard/utils/dashboardCharts.test.ts`
- `src/features/monthly-budget/hooks/useMonthlyBudgets.test.ts`
- `src/features/wallets/hooks/useWalletDragDrop.test.tsx`
- `src/features/wallets/hooks/useWallets.test.ts`
- `src/features/wallets/utils/goalProgress.test.ts`
- `src/features/wallets/utils/goalStatusTone.test.ts`
- `src/features/wallets/utils/sortWallets.test.ts`
- `src/features/wallets/utils/validation.test.ts`
- `src/features/wallets/utils/walletDelta.test.ts`
- `src/lib/utils.test.ts`
- `src/shared/pwa/writeQueueClient.test.ts`
- `src/shared/utils/asyncHelper.test.ts`
- `src/shared/utils/currency.test.ts`
- `src/shared/utils/routeHelpers.test.ts`
- `src/shared/utils/useModalKeyboard.test.tsx`
- `src/shared/utils/validation.test.ts`

## Menjalankan Test

```bash
# Semua test
npm test

# Coverage
npm test -- --coverage

# Satu file test
npx jest src/app/api/wallets/route.test.ts
```

## Cakupan Fungsional Utama

- API route: auth (login, register, me, logout) + cookie session
- API route: CRUD monthly budget, reorder, dan copy antar bulan
- API route: CRUD cash log + filter query
- API route: CRUD category + aturan hierarki & default category
- API route: CRUD wallet + aturan wallet kind
- API route: transfer wallet dan validasi bisnis inti
- API route: superadmin (daftar user, approve, deactivate)
- API route: settings (purge data per scope)
- Auth core: hashing password, token JWT (sign/verify/cookie), `requireAuth`, bootstrap superadmin
- HTTP core: `apiClient`, `apiErrors`, `apiResponse`
- React Query hooks: `useCashLogs`, `useCategories`, `useMonthlyBudgets`, `useWallets`
- Dashboard hooks: `useDashboardData`, `useDashboardCreditCards`
- Wallet hooks: `useWalletDragDrop` (drag-and-drop section)
- Utilitas wallet: progress goal, status tone, sorting, validasi, dan delta saldo
- Utilitas dashboard: `dashboardCharts`
- Utilitas bersama: `currency`, `routeHelpers`, `validation`, `asyncHelper`, `useModalKeyboard`, `cn`
- PWA: `writeQueueClient` (antrian tulis + riwayat gagal via IndexedDB)
