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

## Dokumentasi

Planify menggunakan **Spec-Driven Development** dengan [GitHub Spec-Kit](https://github.com/github/spec-kit).

### 📋 Roadmap & Development → `specs/`

Spesifikasi fitur, rencana implementasi, dan task tracking. Lihat [specs/](specs/) untuk daftar fitur yang sedang atau akan dikerjakan.

Saat ini aktif:
- [001-refactor-maintainability](specs/001-refactor-maintainability/) — Refaktor struktural untuk meningkatkan maintainability

### 📚 Technical Reference → `docs/`

Dokumentasi teknis statis (arsitektur, API, database, setup):

| Category | Documents |
|----------|-----------|
| Core | [Product Requirements](docs/product-requirements.md) · [Architecture](docs/architecture.md) · [Setup & Environment](docs/setup-and-environment.md) |
| Backend | [API Reference](docs/api-reference.md) · [Database Schema](docs/database-schema.md) · [Auth & Access](docs/auth-and-access-control.md) |
| Features | [Monthly Budget](docs/features-monthly-budget.md) · [Cash Log](docs/features-cash-log.md) · [Wallets & Transfer](docs/features-wallets-and-transfer.md) · [Categories](docs/features-categories.md) |
| Platform | [PWA & Offline](docs/pwa-and-offline.md) · [Testing](docs/testing.md) · [Operations](docs/operations.md) |

### 🤖 AI-Assisted Development

Projek ini menggunakan Claude Code dengan Spec-Kit. Workflow standar:

```
/speckit.specify → /speckit.plan → /speckit.tasks → /speckit.implement
```

Prinsip pengembangan ada di [.specify/memory/constitution.md](.specify/memory/constitution.md).

## Fitur Utama

- Monthly Budget: plan income/outcome/carryover + reorder.
- Cash Log: catat transaksi harian dan sinkronisasi saldo wallet.
- Wallets: basic, goal, dan credit card.
- Wallet Transfer: transfer antar wallet dengan opsi fee.
- Categories: struktur parent-child sederhana untuk income/outcome.
- PWA + Offline Queue: request write tetap tersimpan saat offline.
- Superadmin Approval: kontrol aktivasi user baru.

## Perintah Penting

| Command | Purpose |
|---------|---------|
| `npm run dev` | Jalankan Next + Swagger helper |
| `npm run db:setup:local` | Migrate + generate untuk lokal |
| `npm run db:setup:deploy` | Migrate + generate untuk deploy |
| `npm run build` | Build production |
| `npm run start` | Jalankan build production |
| `npm test` | Jalankan semua test |
| `npm test -- --coverage` | Test + coverage report |

## Stack

- Next.js App Router (v16)
- Prisma ORM (v7)
- PostgreSQL
- React 19 + TypeScript 5 (strict)
- Tailwind CSS 4 + MUI icons
- Jest (ts-jest)
- Recharts + @dnd-kit
- GitHub Spec-Kit (spec-driven development)
