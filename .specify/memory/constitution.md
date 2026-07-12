# Planify Constitution

## Core Principles

### I. Feature-Based Modularity (NON-NEGOTIABLE)

Setiap fitur domain harus diisolasi dalam `src/features/<name>/` dengan struktur standar:
- `components/` — UI components milik fitur
- `services/` — API client functions (fetch wrappers)
- `types/` — TypeScript type definitions
- `utils/` — Pure helper functions (opsional)

Cross-cutting infrastructure (`src/core/`) hanya untuk auth, database, dan HTTP helpers — bukan tempat logika bisnis.
Shared components (`src/shared/`) hanya untuk UI yang benar-benar dipakai >1 fitur.

**Kenapa**: Mencegah coupling, memudahkan refaktor, dan membuat fitur bisa di-test secara independen.

### II. Type Safety First

TypeScript strict mode wajib. Setiap penggunaan `any` harus disertai justifikasi eksplisit (comment `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- <alasan>`). Gunakan Prisma-generated types (`Prisma.WalletGetPayload<...>`) untuk query results, bukan mendefinisikan ulang shape secara manual.

**Kenapa**: Type safety adalah pertahanan pertama melawan bug. Planify sudah memakai strict mode — jangan mundur.

### III. API Route Consistency

Semua API route mengikuti pattern standar:
```
guard → validate input → operate (Prisma) → respond (apiResponse helpers)
```

- Gunakan `requireAuth()` di baris pertama setiap handler
- Gunakan `@/core/http/apiResponse` helpers (`ok()`, `badRequest()`, `notFound()`, dll) — jangan return `NextResponse.json()` langsung
- Error handling terstandarisasi via custom error class, bukan string matching (`if (error.message === '...')`)

**Kenapa**: Consistency mengurangi cognitive load saat membaca code dan mencegah bug dari handling yang tidak seragam.

### IV. Component Discipline

- Satu file komponen maksimal ~300 baris. Jika lebih, pecah ke sub-komponen atau custom hooks.
- Komponen page (`page.tsx`) hanya compose — data fetching dan business logic di custom hooks.
- Props typing wajib — tidak boleh ada komponen tanpa interface props yang eksplisit.

**Kenapa**: DashboardView 2700 baris membuktikan bahwa komponen besar tidak maintainable. Yang kecil mudah di-test, di-review, dan di-refaktor.

### V. Test Coverage (NON-NEGOTIABLE untuk API Routes)

- Setiap API route baru wajib punya integration test (mock Prisma, test handler level)
- Pure utility functions wajib punya unit test
- Frontend component tests (React Testing Library) adalah aspirasi, bukan requirement saat ini

**Kenapa**: API route adalah critical path. Bug di sini bisa corrupt data keuangan user. Test harus menjadi safety net.

### VI. Documentation-Driven Development

Setiap fitur baru atau perubahan besar:
1. Spec dulu (`/speckit.specify`) — jelaskan *what* dan *why*
2. Plan (`/speckit.plan`) — jelaskan *how*
3. Tasks (`/speckit.tasks`) — breakdown menjadi task kecil
4. Implement (`/speckit.implement`) — eksekusi

Dokumentasi teknis (`docs/`) adalah referensi. Spec-kit (`specs/`) adalah development roadmap.

**Kenapa**: Planify adalah projek jangka panjang. Tanpa spec, knowledge hilang dan technical debt menumpuk.

## Technical Standards

**Stack**: Next.js 16 (App Router) + TypeScript strict + Prisma + PostgreSQL + Tailwind CSS + MUI icons

**Code quality**: ESLint flat config (`eslint-config-next`). Semua warning harus di-resolve sebelum merge.

**Browser API**: Komponen yang pakai `useState`, `useEffect`, `localStorage`, `fetch`, atau event listener wajib pakai `'use client'` directive.

**Auth**: JWT via `planify_auth_token` cookie (HS256, 7 hari, httpOnly). Middleware Next.js untuk routing protection. `requireAuth()` guard di setiap API route.

**Database**: Semua operasi database melalui Prisma. Tidak boleh raw SQL. Transaksi untuk operasi yang mengubah >1 record (wallet balance + cash log).

## Development Workflow

1. **Branch** dari `main` dengan nama deskriptif (`001-refactor-maintainability`)
2. **Spec** dulu untuk fitur besar atau refaktor
3. **Implement** bertahap — commit per task kecil
4. **Test** — pastikan test existing tetap pass, tambah test baru
5. **Self-review** — cek ulang diff sebelum merge
6. **Docs update** — jika API berubah, update `docs/api-reference.md` dan `src/lib/openapi.ts`

## Governance

Konstitusi ini adalah dokumen tertinggi untuk keputusan teknis Planify. Semua code review harus memverifikasi kepatuhan. Amandemen diperbolehkan melalui PR dengan justifikasi tertulis.

**Version**: 1.0.0 | **Ratified**: 2026-07-12 | **Last Amended**: 2026-07-12
