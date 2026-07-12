# Tasks: Refaktor Maintainability Planify

**Input**: Design documents from `specs/001-refactor-maintainability/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies dan file foundation yang diperlukan semua user story

- [ ] T001 Install `@tanstack/react-query` via `npm install @tanstack/react-query`
- [ ] T002 [P] Create `src/core/http/apiErrors.ts` — error class hierarchy (AppError, NotFoundError, ValidationError, AuthError, ForbiddenError, handleApiError)
- [ ] T003 [P] Create `src/core/http/apiClient.ts` — shared frontend API client singleton
- [ ] T004 [P] Create `src/lib/queryClient.ts` — React Query client config + cache key constants

**Checkpoint**: Foundation files exist, `npm run dev` masih berjalan tanpa error (belum ada yang diintegrasikan).

---

## Phase 2: User Story 1 — Konsistensi API Client (Priority: P1 🔴)

**Goal**: Semua frontend service pakai shared `apiClient`, tidak ada duplikasi `buildApiError`/`readError`

**Independent Test**: Panggil `walletsService.getAll()` dan verifikasi response typed, error handling via `ApiError`

### Implementation for User Story 1

- [ ] T005 [US1] Refactor `src/features/auth/services/authService.ts` — gunakan `apiClient` untuk semua method
- [ ] T006 [P] [US1] Refactor `src/features/wallets/services/walletsService.ts` — gunakan `apiClient`, hapus `buildApiError`/`readError` lokal
- [ ] T007 [P] [US1] Refactor `src/features/cash-log/services/cashLogService.ts` — gunakan `apiClient`
- [ ] T008 [P] [US1] Refactor `src/features/monthly-budget/services/monthlyBudgetService.ts` — gunakan `apiClient`
- [ ] T009 [P] [US1] Refactor `src/features/categories/services/categoriesService.ts` — gunakan `apiClient`
- [ ] T010 [US1] Refactor `src/features/settings/services/settingsService.ts` — gunakan `apiClient`
- [ ] T011 [US1] Verifikasi semua service: jalankan `npm run dev`, login, navigasi semua halaman, pastikan tidak ada broken fetch
- [ ] T012 [US1] Run `npm test` — pastikan test wallet/cash-log/budget route tetap pass

**Checkpoint**: Semua frontend service menggunakan satu `apiClient`. Tidak ada lagi duplikasi error handling di service files.

---

## Phase 3: User Story 2 — Standarisasi Error Handling API Route (Priority: P1 🔴)

**Goal**: API routes pakai `AppError` class hierarchy, hapus string matching `if (error.message === '...')`

**Independent Test**: Throw `new NotFoundError('Wallet')` di route handler → response `{ error: 'Wallet tidak ditemukan' }` status 404

### Implementation for User Story 2

- [ ] T013 [US2] Update `src/app/api/wallets/route.ts` — ganti semua `throw new Error('WALLET_NOT_FOUND')` dengan `throw new NotFoundError('Wallet')`, ganti string matching dengan `instanceof` checks
- [ ] T014 [P] [US2] Update `src/app/api/wallets/transfer/route.ts` — gunakan `ValidationError` untuk fee/invalid transfer errors
- [ ] T015 [P] [US2] Update `src/app/api/cash-log/route.ts` — gunakan `NotFoundError` dan `ValidationError`
- [ ] T016 [P] [US2] Update `src/app/api/monthly-budget/route.ts` — gunakan `AppError` subclass yang sesuai
- [ ] T017 [P] [US2] Update `src/app/api/categories/route.ts` — gunakan `AppError` subclass yang sesuai
- [ ] T018 [P] [US2] Update `src/app/api/auth/route.ts` — gunakan `AuthError` untuk unauthorized
- [ ] T019 [US2] Wrap semua route handler dengan `handleApiError` try-catch pattern (atau terapkan di function helper)
- [ ] T020 [US2] Run `npm test` — pastikan SEMUA 5 test suite existing tetap pass
- [ ] T021 [US2] Manual test: trigger error di setiap modul (create wallet invalid, cash log not found, dll) — pastikan error response konsisten

**Checkpoint**: Error handling terstandarisasi di seluruh API routes. Format respons error konsisten.

---

## Phase 4: User Story 3 — Ekstraksi Validasi Wallet (Priority: P2 🟡)

**Goal**: Validasi wallet goal dan credit card tidak duplikat di POST dan PATCH

**Independent Test**: `npm test` — test wallet existing tetap pass + test validasi baru

### Implementation for User Story 3

- [ ] T022 [US3] Create `src/features/wallets/utils/validation.ts` — `validateWalletFields()` function
- [ ] T023 [US3] Refactor `src/app/api/wallets/route.ts` POST handler — gunakan `validateWalletFields`
- [ ] T024 [US3] Refactor `src/app/api/wallets/route.ts` PATCH handler — gunakan `validateWalletFields`
- [ ] T025 [US3] Tambah unit test di `src/features/wallets/utils/validation.test.ts` — cover: basic valid, goal tanpa amount, credit card tanpa statement day, update partial fields
- [ ] T026 [US3] Run `npm test` — semua test wallet route tetap pass + test validasi baru pass

**Checkpoint**: Wallet validation logic di satu tempat, POST dan PATCH sama-sama pakai fungsi yang sama.

---

## Phase 5: User Story 4 — Pecah DashboardView (Priority: P2 🟡)

**Goal**: DashboardView.tsx dari 2700 baris menjadi <300 baris (compose only)

**Independent Test**: Render DashboardView, bandingkan visual dengan screenshot sebelum refaktor

### Implementation for User Story 4

- [ ] T027 [US4] Create `src/features/dashboard/utils/dashboardCharts.ts` — ekstrak semua konfigurasi Recharts (axis config, color schemes, currency formatters)
- [ ] T028 [P] [US4] Create `src/features/dashboard/components/SummaryCard.tsx` — ekstrak summary card rendering
- [ ] T029 [P] [US4] Create `src/features/dashboard/components/ChartCard.tsx` — ekstrak chart card wrapper
- [ ] T030 [P] [US4] Create `src/features/dashboard/components/TopExpenseTooltip.tsx` — ekstrak tooltip custom
- [ ] T031 [P] [US4] Create `src/features/dashboard/components/DailyTrendTooltip.tsx` — ekstrak tooltip custom
- [ ] T032 [US4] Create `src/features/dashboard/hooks/useDashboardData.ts` — ekstrak semua data fetching, aggregation, dan useMemo ke custom hook
- [ ] T033 [US4] Refactor `src/features/dashboard/components/DashboardView.tsx` — compose sub-components + useDashboardData, target <300 baris
- [ ] T034 [US4] Build & manual test: `npm run build` harus sukses, dashboard render identik

**Checkpoint**: DashboardView <300 baris. Semua sub-komponen independen dan reusable. Tidak ada perubahan visual.

---

## Phase 6: User Story 5 — Data Caching Layer (Priority: P3 🟢)

**Goal**: Data tidak di-fetch ulang saat navigasi antar halaman

**Independent Test**: Buka dashboard → navigasi ke wallets → Network tab tidak ada GET /api/wallets kedua

### Implementation for User Story 5

- [ ] T035 [US5] Update `src/app/layout.tsx` — wrap dengan `QueryClientProvider`
- [ ] T036 [P] [US5] Create `src/features/wallets/hooks/useWallets.ts` — `useQuery` wrapper
- [ ] T037 [P] [US5] Create `src/features/categories/hooks/useCategories.ts` — `useQuery` wrapper
- [ ] T038 [P] [US5] Create `src/features/cash-log/hooks/useCashLogs.ts` — `useQuery` + `useMutation` wrapper
- [ ] T039 [P] [US5] Create `src/features/monthly-budget/hooks/useMonthlyBudgets.ts` — `useQuery` + `useMutation` wrapper
- [ ] T040 [US5] Update `useDashboardData.ts` (from T032) — gunakan `useWallets()` hook daripada fetch langsung
- [ ] T041 [US5] Update `src/app/home/page.tsx` — gunakan hooks React Query
- [ ] T042 [US5] Update `src/app/wallets/page.tsx` — gunakan `useWallets()` hook
- [ ] T043 [US5] Update `src/app/categories/page.tsx` — gunakan `useCategories()` hook
- [ ] T044 [US5] Update `src/app/cash-log/page.tsx` — gunakan `useCashLogs()` hook
- [ ] T045 [US5] Update `src/app/monthly-budget/page.tsx` — gunakan `useMonthlyBudgets()` hook
- [ ] T046 [US5] Build & manual test: navigasi antar halaman, verifikasi cache behavior di React Query DevTools

**Checkpoint**: Semua data fetching melalui React Query. Navigasi instant tanpa re-fetch data yang sudah di-cache.

---

## Phase 7: User Story 6 — Pecah WalletsList & Sidebar (Priority: P3 🟢)

**Goal**: WalletsList.tsx (903→<200 baris), Sidebar.tsx (744→<200 baris main file)

**Independent Test**: Semua interaksi (drag-and-drop, menu, theme toggle, mobile/desktop) tetap berfungsi

### Implementation for User Story 6

- [ ] T047 [US6] Create `src/features/wallets/components/SortableWalletItem.tsx` — ekstrak item + drag handle dari WalletsList
- [ ] T048 [P] [US6] Create `src/features/wallets/components/MenuActions.tsx` — ekstrak menu dropdown dari WalletsList
- [ ] T049 [US6] Refactor `src/features/wallets/components/WalletsList.tsx` — compose SortableWalletItem + MenuActions, target <200 baris
- [ ] T050 [P] [US6] Create `src/shared/layout/SidebarDesktop.tsx` — ekstrak varian desktop (collapsed + expanded) dari Sidebar
- [ ] T051 [P] [US6] Create `src/shared/layout/SidebarMobile.tsx` — ekstrak varian mobile dari Sidebar
- [ ] T052 [US6] Refactor `src/shared/layout/Sidebar.tsx` — compose varian components, target <200 baris
- [ ] T053 [US6] Build & manual test: drag-and-drop wallet ordering, sidebar toggle di mobile & desktop, dark/light mode, semua menu navigasi

**Checkpoint**: WalletsList <200 baris, Sidebar <200 baris. Semua perilaku interaktif tetap berfungsi.

---

## Phase 8: User Story 7 — Test Coverage (Priority: P3 🟢)

**Goal**: Tambah test untuk area kritis yang belum ter-cover

**Independent Test**: `npm test -- --coverage` — coverage meningkat, 0 failing tests

### Implementation for User Story 7

- [ ] T054 [P] [US7] Tambah unit test di `src/features/wallets/utils/goalProgress.test.ts` — cover: goal amount 0, negative progress, exact match, over 100%
- [ ] T055 [P] [US7] Tambah integration test di `src/app/api/wallets/transfer/route.test.ts` — cover: fee calculation edge cases, insufficient balance, invalid wallet IDs
- [ ] T056 [US7] Tambah unit test di `src/features/wallets/utils/validation.test.ts` (jika belum dari T025) — cover semua edge case
- [ ] T057 [US7] Run `npm test -- --coverage` — pastikan coverage ≥ existing, semua test pass
- [ ] T058 [US7] Run `npm run lint` — pastikan tidak ada warning baru

**Checkpoint**: Test coverage meningkat. Semua test pass. ESLint bersih.

---

## Phase 9: Polish & Documentation

**Purpose**: Final cleanup, integrasi dokumentasi, dan persiapan merge

- [ ] T059 [P] Update `README.md` — tambahkan pointer ke Spec-Kit workflow (`specs/` untuk roadmap, `docs/` untuk reference)
- [ ] T060 [P] Create `CLAUDE.md` — project context untuk Claude Code (stack, structure, conventions)
- [ ] T061 Update `docs/architecture.md` jika ada perubahan struktur yang signifikan
- [ ] T062 Review seluruh diff — pastikan tidak ada debugging code, console.log, atau komentar sementara yang tertinggal
- [ ] T063 Final `npm run build` — pastikan production build sukses
- [ ] T064 Final `npm test` — pastikan semua test pass
- [ ] T065 Final `npm run lint` — pastikan 0 warnings

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (US1: API Client) ←→ Phase 3 (US2: Error Handling)  [PARALLEL]
    ↓                               ↓
Phase 4 (US3: Wallet Validation)    ↓
    ↓                               ↓
Phase 5 (US4: DashboardView) ←→ Phase 6 (US5: React Query)  [PARALLEL after US1]
    ↓                               ↓
Phase 7 (US6: WalletsList+Sidebar)  ↓
    ↓                               ↓
Phase 8 (US7: Test Coverage) ←-------┘
    ↓
Phase 9 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|-----------|-------------------|
| US1 (API Client) | Phase 1 | US2, US3 |
| US2 (Error Handling) | Phase 1 | US1, US3 |
| US3 (Wallet Validation) | Phase 1 | US1, US2 |
| US4 (DashboardView) | US1 (service typing) | US5, US6 |
| US5 (React Query) | US1, T032 (useDashboardData) | US4, US6 |
| US6 (WalletsList+Sidebar) | Phase 1 | US4, US5 |
| US7 (Test Coverage) | US3, US4, US6 | — |

### Parallel Opportunities

- **Phase 2**: T006-T009 bisa paralel (setiap service file berbeda)
- **Phase 3**: T014-T018 bisa paralel (setiap route file berbeda)
- **Phase 5**: T028-T031 bisa paralel (setiap komponen berbeda file)
- **Phase 7**: T047-T048 paralel; T050-T051 paralel
- **Phase 8**: T054-T055 paralel (test file berbeda)
- **Cross-phase**: US1 & US2 bisa dikerjakan bersamaan; US4 & US5 bisa bersamaan; US6 independen dari US4/US5

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1-3**: Foundation + API Client + Error Handling → **FIRST MILESTONE** (backend error handling terstandarisasi, frontend service pakai shared client)
2. **Phase 4**: Wallet Validation → **SECOND MILESTONE** (wallet route rapi, tidak ada duplikasi)
3. **Phase 5-6**: Dashboard + React Query → **THIRD MILESTONE** (performa navigasi meningkat, dashboard maintainable)
4. **Phase 7-9**: Komponen lain + Test + Polish → **FINAL** (seluruh refaktor selesai)

### Rollback Safety

- Setiap phase berdiri sendiri — bisa di-merge ke `main` tanpa menunggu phase berikutnya
- API contract tidak berubah — rollback tidak memerlukan perubahan frontend
- Test existing harus selalu pass — CI/CD tidak broken selama refaktor

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit setelah setiap task atau grup task kecil
- Stop di setiap checkpoint untuk validasi independen
- `npm run dev` harus selalu bisa dijalankan — jangan biarkan branch dalam keadaan broken
