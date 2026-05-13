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

## Test yang Sudah Ada

- `src/app/api/monthly-budget/route.test.ts`
- `src/app/api/cash-log/route.test.ts`
- `src/app/api/wallets/route.test.ts`
- `src/app/api/wallets/transfer/route.test.ts`
- `src/features/wallets/utils/goalProgress.test.ts`

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

- CRUD monthly budget dan reorder
- CRUD cash log + filter query
- CRUD wallet + rule wallet kind
- Transfer wallet dan validasi bisnis inti
- Utilitas perhitungan progress goal wallet
