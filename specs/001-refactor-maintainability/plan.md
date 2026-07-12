# Implementation Plan: Refaktor Maintainability Planify

**Branch**: `001-refactor-maintainability` | **Date**: 2026-07-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-refactor-maintainability/spec.md`

## Summary

Refaktor struktural Planify untuk meningkatkan maintainability tanpa mengubah API contract atau UI. Mencakup: unifikasi API client frontend, standarisasi error handling backend, ekstraksi validasi wallet, pemecahan DashboardView (2700→<300 baris), WalletsList (903→<200 baris), Sidebar (744→<200 baris), penambahan React Query untuk data caching, dan peningkatan test coverage.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20+

**Primary Dependencies**: Next.js 16.1.6 (App Router), React 19.2.3, Prisma 7.4.0, Tailwind CSS 4.1.18, MUI 7.3.8 (icons), Recharts 3.8.0, @dnd-kit/core 6.3.1, SweetAlert2 11.26.18

**New Dependencies**: `@tanstack/react-query` v5 (data caching), `zod` (optional, untuk validasi terstruktur)

**Storage**: PostgreSQL (production), SQLite (dev) via Prisma — no schema changes

**Testing**: Jest 30 + ts-jest 29, pattern: mock Prisma client, test API route handlers. Belum ada React Testing Library (opsional untuk US7).

**Target Platform**: Web (PWA), Next.js server

**Project Type**: Full-stack monolith (Next.js App Router)

**Performance Goals**: Navigasi antar halaman <200ms (cached), dashboard render <500ms

**Constraints**: Tidak boleh ada perubahan API contract, tidak boleh ada perubahan Prisma schema, tidak boleh ada perubahan visual

**Scale/Scope**: ~30 file yang disentuh, 7 user stories, estimasi 8-12 jam kerja

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Based Modularity | ✅ Pass | Komponen yang diekstrak tetap di `src/features/<name>/` |
| II. Type Safety First | ✅ Pass | Shared API client fully typed; no new `any` without justification |
| III. API Route Consistency | ✅ Pass | Error handling di-standarisasi, tidak menambah inkonsistensi |
| IV. Component Discipline | ✅ Pass | Target <300 baris per file, semua di bawah batas |
| V. Test Coverage | ✅ Pass | Test baru ditambahkan, test existing tidak rusak |
| VI. Documentation-Driven | ✅ Pass | Ini sendiri adalah spec-first approach |

## Project Structure

### Documentation (this feature)

```text
specs/001-refactor-maintainability/
├── spec.md              # Feature specification (this file's input)
├── plan.md              # This file
├── research.md          # Library choices & trade-offs
├── data-model.md        # API client types, error hierarchy
└── tasks.md             # Phase 4 output (/speckit-tasks)
```

### Source Code Changes

```text
src/
├── core/
│   └── http/
│       ├── apiResponse.ts         # [EXISTING] Response helpers
│       ├── apiClient.ts           # [NEW] Shared frontend API client
│       └── apiErrors.ts           # [NEW] Error class hierarchy
├── features/
│   ├── wallets/
│   │   ├── services/
│   │   │   └── walletsService.ts  # [MODIFY] Use shared apiClient
│   │   ├── utils/
│   │   │   ├── goalProgress.ts    # [EXISTING]
│   │   │   └── validation.ts      # [NEW] Wallet validation helpers
│   │   └── components/
│   │       ├── WalletsList.tsx     # [SPLIT] → SortableWalletItem, MenuActions
│   │       ├── SortableWalletItem.tsx  # [NEW] Extracted from WalletsList
│   │       └── MenuActions.tsx     # [NEW] Extracted from WalletsList
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── DashboardView.tsx  # [REFACTOR] Compose only, <300 lines
│   │   │   ├── SummaryCard.tsx    # [NEW] Extracted from DashboardView
│   │   │   ├── ChartCard.tsx      # [NEW] Extracted from DashboardView
│   │   │   ├── TopExpenseTooltip.tsx  # [NEW] Extracted from DashboardView
│   │   │   └── DailyTrendTooltip.tsx  # [NEW] Extracted from DashboardView
│   │   ├── hooks/
│   │   │   └── useDashboardData.ts # [NEW] Data fetching + aggregation
│   │   └── utils/
│   │       └── dashboardCharts.ts  # [NEW] Recharts configs
│   ├── cash-log/
│   │   └── services/
│   │       └── cashLogService.ts   # [MODIFY] Use shared apiClient
│   ├── monthly-budget/
│   │   └── services/
│   │       └── monthlyBudgetService.ts  # [MODIFY] Use shared apiClient
│   ├── categories/
│   │   └── services/
│   │       └── categoriesService.ts  # [MODIFY] Use shared apiClient
│   ├── auth/
│   │   └── services/
│   │       └── authService.ts      # [MODIFY] Use shared apiClient
│   └── settings/
│       └── services/
│           └── settingsService.ts  # [MODIFY] Use shared apiClient
├── app/
│   ├── layout.tsx                  # [MODIFY] Add QueryClientProvider
│   └── api/
│       ├── wallets/
│       │   ├── route.ts            # [MODIFY] Use AppError + shared validation
│       │   └── transfer/
│       │       └── route.ts        # [MODIFY] Use AppError
│       ├── cash-log/
│       │   └── route.ts            # [MODIFY] Use AppError
│       ├── monthly-budget/
│       │   └── route.ts            # [MODIFY] Use AppError
│       ├── categories/
│       │   └── route.ts            # [MODIFY] Use AppError
│       └── auth/
│           └── route.ts            # [MODIFY] Use AppError
├── shared/
│   └── layout/
│       └── Sidebar.tsx             # [SPLIT] → variant components
└── lib/
    └── queryClient.ts              # [NEW] React Query client config
```

**Structure Decision**: Single project (Next.js monolith). Tidak ada perubahan struktur direktori utama — `src/core`, `src/features`, `src/shared`, `src/app` tetap seperti adanya.

## Complexity Tracking

> Tidak ada constitution violation yang perlu dijustifikasi. Semua perubahan mengikuti prinsip yang sudah ditetapkan.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| React Query dependency | Caching antar halaman tanpa global state management | localStorage manual (existing approach) tidak reliable dan tidak otomatis revalidate |
