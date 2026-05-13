# Planify

Planify adalah aplikasi personal finance berbasis Next.js + Prisma + PostgreSQL untuk budgeting bulanan, pencatatan transaksi, dan manajemen wallet.

## Quick Start

1. Install dependency:

```bash
npm install
```

2. Buat file env dari template (`.env.example`) lalu isi nilainya.

3. Pastikan database PostgreSQL `planify` sudah tersedia.

4. Jalankan setup database:

```bash
npm run db:setup:local
```

5. Jalankan aplikasi:

```bash
npm run dev
```

App lokal:

- Next.js: http://localhost:3000
- Swagger UI helper: http://localhost:3010

## Dokumentasi Lengkap

Detail teknis tersedia di folder [docs](docs):

- [docs/product-requirements.md](docs/product-requirements.md)
- [docs/setup-and-environment.md](docs/setup-and-environment.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/database-schema.md](docs/database-schema.md)
- [docs/auth-and-access-control.md](docs/auth-and-access-control.md)
- [docs/api-reference.md](docs/api-reference.md)
- [docs/features-monthly-budget.md](docs/features-monthly-budget.md)
- [docs/features-cash-log.md](docs/features-cash-log.md)
- [docs/features-wallets-and-transfer.md](docs/features-wallets-and-transfer.md)
- [docs/features-categories.md](docs/features-categories.md)
- [docs/pwa-and-offline.md](docs/pwa-and-offline.md)
- [docs/testing.md](docs/testing.md)
- [docs/operations.md](docs/operations.md)

## Fitur Utama

- Monthly Budget: plan income/outcome/carryover + reorder.
- Cash Log: catat transaksi harian dan sinkronisasi saldo wallet.
- Wallets: basic, goal, dan credit card.
- Wallet Transfer: transfer antar wallet dengan opsi fee.
- Categories: struktur parent-child sederhana untuk income/outcome.
- PWA + Offline Queue: request write tetap tersimpan saat offline.
- Superadmin Approval: kontrol aktivasi user baru.

## Perintah Penting

- `npm run dev`: jalankan Next + Swagger helper.
- `npm run db:setup:local`: migrate + generate untuk lokal.
- `npm run db:setup:deploy`: migrate + generate untuk deploy.
- `npm run build`: build production.
- `npm run start`: jalankan build production.
- `npm test`: jalankan semua test.
- `npm test -- --coverage`: jalankan test + coverage.

## Stack

- Next.js App Router
- Prisma ORM
- PostgreSQL
- React + TypeScript
- Jest (ts-jest)
