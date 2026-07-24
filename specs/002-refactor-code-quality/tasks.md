# Tasks: Refaktor Code Quality & Konsistensi Planify

**Input**: Design documents from `specs/002-refactor-code-quality/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new packages, initialize shadcn/ui, create shared directories

- [x] T001 Install new dependencies: `npm install lucide-react sonner`
- [x] T002 [P] Initialize shadcn/ui: `npx shadcn@latest init` with base color emerald, CSS variables, radius 0.5rem — creates `components.json` and updates `src/app/globals.css`
- [x] T003 [P] Create shared utility directories: `src/shared/utils/` (ensure exists)
- [x] T004 Install shadcn/ui components: `npx shadcn@latest add button input select textarea card dialog dropdown-menu sheet checkbox label alert-dialog`

**Checkpoint**: shadcn/ui initialized, new packages installed. `npm run dev` must still work (no integration yet).

---

## Phase 2: User Story 1 — Eliminasi Duplikasi Fungsi Route (Priority: P1 🔴)

**Goal**: Semua fungsi helper yang copy-paste di route handler diekstrak ke shared utilities

**Independent Test**: `grep -r "function toId" src/` hanya muncul di `src/shared/utils/routeHelpers.ts`. `npm test` semua pass.

### Implementation for User Story 1

- [x] T005 [US1] Create `src/shared/utils/routeHelpers.ts` — ekstrak `toId()` dan `toNumber()` dari 5 route file, tulis unit test `src/shared/utils/routeHelpers.test.ts`
- [x] T006 [P] [US1] Update `src/app/api/wallets/route.ts` — hapus `toId()` lokal, import dari `@/shared/utils/routeHelpers`
- [x] T007 [P] [US1] Update `src/app/api/wallets/transfer/route.ts` — hapus `toNumber()` lokal, import dari `@/shared/utils/routeHelpers`
- [x] T008 [P] [US1] Update `src/app/api/cash-log/route.ts` — hapus `toId()` lokal, import dari shared
- [x] T009 [P] [US1] Update `src/app/api/categories/route.ts` — hapus `toId()` lokal, import dari shared
- [x] T010 [P] [US1] Update `src/app/api/monthly-budget/route.ts` — hapus `toId()` lokal, import dari shared
- [x] T011 [US1] Create `src/features/wallets/utils/walletDelta.ts` — ekstrak `getWalletDelta()` dan `assertCreditLimit()` dari `cash-log/route.ts` dan `wallets/transfer/route.ts`
- [x] T012 [US1] Update `src/app/api/cash-log/route.ts` — hapus `getWalletDelta()` dan `assertCreditLimit()` lokal, import dari `@/features/wallets/utils/walletDelta`
- [x] T013 [US1] Update `src/app/api/wallets/transfer/route.ts` — hapus `getWalletDelta()` dan `assertCreditLimit()` lokal, import dari `@/features/wallets/utils/walletDelta`
- [x] T014 [US1] Create `src/shared/utils/validation.ts` — ekstrak `isValidEmail()` dari `auth/login/route.ts` dan `auth/register/route.ts`
- [x] T015 [US1] Update `src/app/api/auth/login/route.ts` — hapus `isValidEmail()` lokal, import dari `@/shared/utils/validation`
- [x] T016 [US1] Update `src/app/api/auth/register/route.ts` — hapus `isValidEmail()` lokal, import dari `@/shared/utils/validation`
- [x] T017 [US1] Run `npm test` — pastikan semua test existing tetap pass

**Checkpoint**: 0 definisi `toId()`, `getWalletDelta()`, `assertCreditLimit()`, `isValidEmail()` yang duplikat. Semua route menggunakan shared import.

---

## Phase 3: User Story 2 — Selesaikan Migrasi API Client (Priority: P1 🔴)

**Goal**: Semua service file menggunakan `apiClient`, tidak ada `fetch()` atau `readError()` di service manapun

**Independent Test**: `grep -r "fetch(" src/features/*/services/` tidak ada hasil. `grep -r "readError" src/features/` tidak ada hasil di luar `apiClient.ts`.

### Implementation for User Story 2

- [x] T018 [US2] Refactor `src/features/superadmin/services/superadminService.ts` — ganti `fetch()` + `readError()` lokal dengan `apiClient.get()`, `apiClient.patch()`; hapus fungsi `readError()` lokal
- [x] T019 [US2] Refactor `src/features/auth/services/authService.ts` method `logout()` — ganti `fetch('/api/auth/logout', { method: 'POST' })` dengan `apiClient.post('/api/auth/logout')`
- [x] T020 [US2] Run `npm test` + manual test: login → logout, buka `/superadmin` verifikasi user list ter-load

**Checkpoint**: 0 `fetch()` langsung di service files. Semua service menggunakan shared `apiClient`.

---

## Phase 4: User Story 3 — Seragamkan Error Handling di Semua Route (Priority: P1 🔴)

**Goal**: Semua API route menggunakan `handleApiError()` di catch block, format error response konsisten

**Independent Test**: Throw `AppError` di route settings/purge, verifikasi response format sama dengan route wallets.

### Implementation for User Story 3

- [x] T021 [US3] Refactor `src/app/api/settings/purge/route.ts` — ganti catch block yang selalu return `badRequest()` dengan `handleApiError(error)`; pastikan error 400/404/500 return status code yang tepat
- [x] T022 [US3] Refactor `src/app/api/cash-log/route.ts` GET handler (baris ~432) — ganti `catch { return badRequest(); }` dengan `catch (error) { return handleApiError(error); }`
- [x] T023 [P] [US3] Refactor `src/app/api/superadmin/users/route.ts` — ganti `console.error` + `serverError()` manual dengan `handleApiError(error)`
- [x] T024 [P] [US3] Refactor `src/app/api/superadmin/users/approve/route.ts` — ganti `console.error` + `serverError()` manual dengan `handleApiError(error)`
- [x] T025 [P] [US3] Refactor `src/app/api/superadmin/users/deactivate/route.ts` — ganti `console.error` + `serverError()` manual dengan `handleApiError(error)`
- [x] T026 [US3] Refactor `src/app/api/auth/me/route.ts` — ganti verifikasi token manual dengan `const auth = requireAuth(req); if (auth.error) return auth.error;`
- [x] T027 [US3] Run `npm test` — pastikan semua 5 test suite API route tetap pass

**Checkpoint**: Semua route handler menggunakan `handleApiError()`. Format error response konsisten. 0 double-logging.

---

## Phase 5: User Story 4 — Integrasi shadcn/ui Design System (Priority: P1 🔴)

**Goal**: Semua form dan card menggunakan komponen shadcn/ui, semua icon MUI termigrasi ke lucide-react, MUI + Emotion dependency dihapus

**Independent Test**: `npm ls @mui/material @mui/icons-material @emotion/react @emotion/styled` → semua "not found". `npm run build` sukses.

### Implementation for User Story 4

#### Part A: Form Migration (semua komponen berbeda — bisa paralel)

- [x] T028 [P] [US4] Refactor `src/features/wallets/components/WalletsForm.tsx` — ganti input/select/button className Tailwind inline dengan shadcn/ui `Input`, `Select`, `Textarea`, `Button`
- [x] T029 [P] [US4] Refactor `src/features/wallets/components/WalletTransferForm.tsx` — ganti input/select/button dengan shadcn/ui components
- [x] T030 [P] [US4] Refactor `src/features/cash-log/components/CashLogForm.tsx` — ganti input/select/button dengan shadcn/ui components
- [x] T031 [P] [US4] Refactor `src/features/categories/components/CategoryForm.tsx` — ganti input/select/button dengan shadcn/ui components
- [x] T032 [P] [US4] Refactor `src/features/monthly-budget/components/MonthlyBudgetForm.tsx` — ganti input/select/button dengan shadcn/ui components
- [x] T033 [P] [US4] Refactor `src/features/settings/components/SettingsDataResetPanel.tsx` — ganti checkbox/button dengan shadcn/ui `Checkbox`, `Button`

#### Part B: Card Container Migration

- [x] T034 [P] [US4] Refactor `src/features/wallets/components/WalletsList.tsx` — ganti card container div dengan shadcn/ui `Card`, `CardHeader`, `CardContent`
- [x] T035 [P] [US4] Refactor `src/features/cash-log/components/CashLogList.tsx` — ganti card container div dengan shadcn/ui `Card`
- [x] T036 [P] [US4] Refactor `src/features/monthly-budget/components/MonthlyBudgetList.tsx` — ganti card container div dengan shadcn/ui `Card`
- [x] T037 [P] [US4] Refactor `src/features/categories/components/CategoryList.tsx` — ganti card container div dengan shadcn/ui `Card`

#### Part C: Icon Migration (15 file — paralel per file)

- [x] T038 [P] [US4] Migrasi icon di `src/features/wallets/components/` (WalletsList, SortableWalletItem, MenuActions, GoalTrackingModal, WalletTransferForm) — ganti semua `@mui/icons-material/*` import dengan `lucide-react` equivalents
- [x] T039 [P] [US4] Migrasi icon di `src/features/cash-log/components/CashLogList.tsx` — ganti 6 MUI icon imports dengan lucide-react
- [x] T040 [P] [US4] Migrasi icon di `src/features/categories/components/CategoryList.tsx` — ganti 4 MUI icon imports dengan lucide-react
- [x] T041 [P] [US4] Migrasi icon di `src/features/monthly-budget/components/MonthlyBudgetList.tsx` — ganti 7 MUI icon imports dengan lucide-react
- [x] T042 [P] [US4] Migrasi icon di `src/features/dashboard/components/` (DashboardView, DashboardSummaryView, DashboardMonthlyView) — ganti MUI icon imports dengan lucide-react
- [x] T043 [P] [US4] Migrasi icon di `src/shared/layout/` (SidebarNavContent, sidebarIcons, SidebarMobile) — ganti MUI icon imports dengan lucide-react
- [x] T044 [P] [US4] Migrasi icon di `src/shared/pwa/PWAInstallButton.tsx` — ganti MUI icon dengan lucide-react

#### Part D: Cleanup

- [x] T045 [US4] Hapus dependency MUI + Emotion: `npm uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled`
- [x] T046 [US4] Build & manual test: `npm run build` sukses, semua halaman render identik, semua icon tampil

**Checkpoint**: shadcn/ui components digunakan di semua form dan card. lucide-react menggantikan MUI icons. 4 dependency MUI/Emotion dihapus. `npm run build` sukses.

---

## Phase 6: User Story 5 — Ganti SweetAlert2 dengan Sonner (Priority: P2 🟡)

**Goal**: Semua notifikasi sukses/error pakai Sonner toast, konfirmasi pakai shadcn/ui AlertDialog. Hapus sweetalert2.

**Independent Test**: `grep -r "Swal" src/` tidak ada hasil. `npm ls sweetalert2` → "not found".

### Implementation for User Story 5

- [x] T047 [US5] Add `<Toaster position="bottom-right" richColors />` ke `src/app/layout.tsx` (Sonner provider)
- [x] T048 [P] [US5] Refactor `src/features/wallets/components/WalletsForm.tsx` — ganti `Swal.fire()` success/error dengan `toast.success()` / `toast.error()` dari Sonner
- [x] T049 [P] [US5] Refactor `src/features/wallets/components/WalletTransferForm.tsx` — ganti `Swal.fire()` dengan Sonner toast
- [x] T050 [P] [US5] Refactor `src/features/cash-log/components/CashLogForm.tsx` — ganti `Swal.fire()` dengan Sonner toast
- [x] T051 [P] [US5] Refactor `src/features/categories/components/CategoryForm.tsx` — ganti `Swal.fire()` dengan Sonner toast
- [x] T052 [P] [US5] Refactor `src/features/monthly-budget/components/MonthlyBudgetForm.tsx` — ganti `Swal.fire()` dengan Sonner toast
- [x] T053 [P] [US5] Refactor `src/features/settings/components/SettingsDataResetPanel.tsx` — ganti `Swal.fire()` konfirmasi dengan shadcn/ui `AlertDialog`; ganti notifikasi sukses/error dengan Sonner toast
- [x] T054 [US5] Refactor konfirmasi delete di semua list components — ganti `Swal.fire()` confirm dialog dengan shadcn/ui `AlertDialog`:
  - `src/features/cash-log/components/CashLogList.tsx`
  - `src/features/categories/components/CategoryList.tsx`
  - `src/features/monthly-budget/components/MonthlyBudgetList.tsx`
- [x] T055 [US5] Hapus sweetalert2: `npm uninstall sweetalert2` + hapus import `sweetalert2` dari semua file
- [x] T056 [US5] `npm run build` — pastikan sukses tanpa sweetalert2

**Checkpoint**: 0 `Swal.fire()`. Semua notifikasi pakai Sonner toast. Semua konfirmasi pakai AlertDialog. sweetalert2 dihapus.

---

## Phase 7: User Story 6 — Shared Utility Functions (Priority: P2 🟡)

**Goal**: `formatRupiah`, `monthLabel`, `shiftMonth`, `todayIsoDate` tersedia sebagai shared utilities, tidak ada lagi inline formatting yang duplikat

**Independent Test**: `grep -r "toLocaleString('id-ID')" src/` tidak ada hasil untuk currency. `grep -r "function monthLabel" src/` hanya di `src/shared/utils/dateFormat.ts`.

### Implementation for User Story 7 (US6)

- [x] T057 [US6] Create `src/shared/utils/currency.ts` — `formatRupiah(amount: number, options?: { compact?: boolean }): string` menggunakan `Intl.NumberFormat('id-ID')` + unit test `src/shared/utils/currency.test.ts`
- [x] T058 [P] [US6] Create `src/shared/utils/dateFormat.ts` — `monthLabel(yyyyMM)`, `shortMonthLabel(yyyyMM)`, `shiftMonth(base, offset)`, `todayIsoDate()`, `toIsoDate(date)` + unit test `src/shared/utils/dateFormat.test.ts`
- [x] T059 [US6] Ganti semua pemanggilan `toLocaleString('id-ID')` inline untuk currency (13+ lokasi) dengan `formatRupiah()`:
  - `src/features/wallets/components/` (WalletsForm, SortableWalletItem, WalletTransferForm, GoalTrackingModal, WalletsList)
  - `src/features/cash-log/components/` (CashLogForm, CashLogList)
  - `src/features/monthly-budget/components/` (MonthlyBudgetForm, MonthlyBudgetList)
  - `src/features/settings/components/SettingsDataResetPanel.tsx`
  - `src/features/dashboard/hooks/useDashboardData.ts`
  - `src/app/offline/OfflineSummaryCard.tsx`
- [x] T060 [US6] Ganti `monthLabel()` dan `shiftMonth()` lokal di `src/features/cash-log/components/CashLogList.tsx` dengan import dari `@/shared/utils/dateFormat`
- [x] T061 [US6] Ganti `monthLabel()` dan `shiftMonth()` lokal di `src/features/monthly-budget/components/MonthlyBudgetList.tsx` dengan import dari `@/shared/utils/dateFormat`
- [x] T062 [US6] Ganti `getCurrentDate()` / `todayIsoDate()` lokal di 3 file (`CashLogForm`, `WalletTransferForm`, `MonthlyBudgetForm`) dengan import dari `@/shared/utils/dateFormat`
- [x] T063 [US6] Update `src/features/dashboard/utils/dashboardCharts.ts` — gunakan `formatRupiah` dari shared utility untuk `formatCurrency` (atau delegasikan)

**Checkpoint**: Semua fungsi formatting dari satu sumber. 0 duplikasi inline formatting.

---

## Phase 8: User Story 7 — Generalisasi MenuActions dengan DropdownMenu (Priority: P2 🟡)

**Goal**: `MenuActions` menggunakan shadcn/ui `DropdownMenu`, digunakan oleh semua list components

**Independent Test**: `grep -r "function MenuActions" src/features/cash-log/ src/features/monthly-budget/ src/features/categories/` tidak ada hasil.

### Implementation for User Story 8 (US7)

- [x] T064 [US7] Refactor `src/features/wallets/components/MenuActions.tsx` — ganti implementasi kustom (click-outside handler manual) dengan shadcn/ui `DropdownMenu`; tambahkan props opsional `extraActions?: ReactNode` untuk ekstensi
- [x] T065 [P] [US7] Update `src/features/cash-log/components/CashLogList.tsx` — hapus `function MenuActions` lokal (line 48-131), import dari `@/features/wallets/components/MenuActions`
- [x] T066 [P] [US7] Update `src/features/monthly-budget/components/MonthlyBudgetList.tsx` — hapus `function MenuActions` lokal (line 54-136), import dari shared MenuActions
- [x] T067 [P] [US7] Update `src/features/categories/components/CategoryList.tsx` — hapus `function MenuActions` lokal (line 20-80+), import dari shared MenuActions
- [x] T068 [US7] Manual test: buka `/cash-log`, `/categories`, `/monthly-budget` — verifikasi dropdown menu (klik, keyboard Enter/Escape/Arrow) berfungsi di semua list

**Checkpoint**: 1 definisi `MenuActions` (di wallets/components/). 3 list menggunakan komponen yang sama. Keyboard navigation + aksesibilitas built-in.

---

## Phase 9: User Story 8 — Migrasi Dark Mode ke CSS Variables (Priority: P3 🟢)

**Goal**: Dark mode menggunakan CSS variables shadcn/ui, tidak ada lagi custom CSS `body.theme-dark`

**Independent Test**: `grep "body.theme-dark" src/app/globals.css` tidak ada hasil. Toggle dark mode — semua komponen berubah tema.

### Implementation for User Story 9 (US8)

- [x] T069 [US8] Update `src/app/globals.css` — setup CSS variables shadcn/ui di `:root` dan `.dark` (lihat data-model.md untuk nilai variabel)
- [x] T070 [US8] Update `src/shared/theme/ThemeProvider.tsx` — refactor untuk toggle class `dark` di `document.documentElement` (html element), bukan `body.theme-dark`; pastikan localStorage persistence tetap berfungsi
- [x] T071 [P] [US8] Update semua komponen yang menggunakan `body.theme-dark` selector — ganti dengan CSS variables reference (komponen shadcn/ui otomatis mengikuti)
- [x] T072 [US8] Hapus custom CSS rule `body.theme-dark`, `.dark input[type='date']`, `.dark input[type='month']`, dll dari `globals.css` (baris 17-78) — semua di-handle CSS variables
- [x] T073 [US8] Manual test: toggle dark mode → semua halaman render dengan tema yang benar; refresh browser → tema bertahan

**Checkpoint**: Dark mode via CSS variables. `globals.css` bersih dari custom dark mode rule. ~40 baris CSS dihapus.

---

## Phase 10: User Story 9 — Pecah File Besar (Priority: P3 🟢)

**Goal**: 7 file target masing-masing < 300 baris untuk file utama

**Independent Test**: `wc -l` setiap file target < 300. `npm run build` sukses.

### Implementation for User Story 9

- [ ] T074 [US9] Pecah `src/features/dashboard/hooks/useDashboardData.ts` (1062 baris) → extract ke:
  - `src/features/dashboard/hooks/useMonthlyOverview.ts` (< 300 baris)
  - `src/features/dashboard/hooks/useSummaryCards.ts` (< 200 baris)
  - `src/features/dashboard/hooks/useDashboardCharts.ts` (< 200 baris)
  - Update `useDashboardData.ts` menjadi barrel re-export (< 50 baris)
- [ ] T075 [US9] Pecah `src/features/settings/components/SettingsDataResetPanel.tsx` (672 baris) → extract:
  - `src/features/settings/components/ResetCheckboxGroup.tsx` (< 200 baris)
  - `src/features/settings/components/ResetConfirmationDialog.tsx` (< 150 baris)
  - `src/features/settings/components/ResetProgressIndicator.tsx` (< 100 baris)
  - Update `SettingsDataResetPanel.tsx` menjadi composer (< 300 baris)
- [ ] T076 [US9] Pecah `src/features/monthly-budget/components/MonthlyBudgetList.tsx` (639 baris) → extract:
  - `src/features/monthly-budget/components/BudgetItem.tsx` (< 200 baris)
  - `src/features/monthly-budget/components/BudgetFilterBar.tsx` (< 150 baris)
  - Update `MonthlyBudgetList.tsx` menjadi composer (< 300 baris)
- [ ] T077 [US9] Pecah `src/features/cash-log/components/CashLogList.tsx` (556 baris) → extract:
  - `src/features/cash-log/components/CashLogItem.tsx` (< 200 baris)
  - `src/features/cash-log/components/CashLogFilterBar.tsx` (< 150 baris)
  - Update `CashLogList.tsx` menjadi composer (< 300 baris)
- [ ] T078 [US9] Pecah `src/features/wallets/components/WalletTransferForm.tsx` (522 baris) → extract:
  - `src/features/wallets/components/SourceWalletStep.tsx` (< 150 baris)
  - `src/features/wallets/components/DestinationWalletStep.tsx` (< 150 baris)
  - `src/features/wallets/components/TransferFeeDisplay.tsx` (< 100 baris)
  - Update `WalletTransferForm.tsx` menjadi composer (< 300 baris)
- [ ] T079 [US9] Pecah `src/features/wallets/components/WalletsForm.tsx` (483 baris) → extract:
  - `src/features/wallets/components/StandardWalletFields.tsx` (< 150 baris)
  - `src/features/wallets/components/GoalWalletFields.tsx` (< 150 baris)
  - `src/features/wallets/components/CreditCardFields.tsx` (< 100 baris)
  - Update `WalletsForm.tsx` menjadi composer (< 300 baris)
- [ ] T080 [US9] Pecah `src/lib/openapi.ts` (1136 baris) → split ke:
  - `src/lib/openapi/schemas.ts` — semua schema definitions
  - `src/lib/openapi/paths.ts` — semua path/endpoint definitions
  - `src/lib/openapi/responses.ts` — semua response definitions
  - Update `src/lib/openapi.ts` menjadi barrel export; update `src/app/api/swagger/route.ts` import jika diperlukan
- [ ] T081 [US9] Build & test: `npm run build` && `npm test` — pastikan semua masih berfungsi

**Checkpoint**: Semua 7 file target < 300 baris untuk file utama. Build + test sukses.

---

## Phase 11: User Story 10 — Test Coverage untuk Core & Hooks (Priority: P3 🟢)

**Goal**: Core modules dan utility functions punya unit test, coverage ≥ 80%

**Independent Test**: `npm test -- --coverage` menunjukkan coverage `src/core/http/` ≥ 80%, `dashboardCharts.ts` ≥ 80%.

### Implementation for User Story 10

- [ ] T082 [P] [US10] Create `src/core/http/apiResponse.test.ts` — test 6 helper functions: `ok()`, `badRequest()`, `notFound()`, `unauthorized()`, `forbidden()`, `serverError()` — verifikasi status code, body format, headers
- [ ] T083 [P] [US10] Create `src/core/http/apiErrors.test.ts` — test 5 error classes (`AppError`, `NotFoundError`, `ValidationError`, `AuthError`, `ForbiddenError`) + `handleApiError()` dispatch logic
- [ ] T084 [P] [US10] Create `src/core/http/apiClient.test.ts` — mock `global.fetch`, test `get()`, `post()`, `patch()`, `delete()` — verifikasi URL construction, method, headers, JSON parsing, error response handling, network error
- [ ] T085 [P] [US10] Create `src/features/dashboard/utils/dashboardCharts.test.ts` — test 11 pure functions: `formatCurrency`, `formatCompact`, `monthLabel`, `shortMonthLabel`, `toIsoDate`, `getDateWithSafeDay`, `getNextDueDate`, `buildTop5WithOther`, `calcIncome`, `calcOutcome`, `getRecentMonths` — cover edge cases (zero, negative, boundary values)
- [ ] T086 [P] [US10] Create `src/features/wallets/hooks/useWallets.test.ts` — mock React Query + apiClient, test loading/success/error states
- [ ] T087 [P] [US10] Create `src/features/categories/hooks/useCategories.test.ts` — mock React Query + apiClient
- [ ] T088 [P] [US10] Create `src/features/cash-log/hooks/useCashLogs.test.ts` — mock React Query useQuery + useMutation
- [ ] T089 [P] [US10] Create `src/features/monthly-budget/hooks/useMonthlyBudgets.test.ts` — mock React Query useQuery + useMutation
- [ ] T090 [US10] Run `npm test -- --coverage` — verifikasi coverage ≥ target, semua test pass

**Checkpoint**: 8 test files baru. Core/http coverage ≥ 80%. dashboardCharts coverage ≥ 80%.

---

## Phase 12: Polish & Final Validation

**Purpose**: Cleanup, lint, final build, dependency verification

- [ ] T091 Remove unused `src/shared/ui/` directory (sekarang digantikan `src/components/ui/` oleh shadcn/ui)
- [ ] T092 [P] Run `npm run lint` — fix semua warning baru yang muncul dari refactoring
- [ ] T093 [P] Review seluruh diff — pastikan tidak ada `console.log` debugging, komentar sementara, atau import unused
- [ ] T094 Run `npm run build` — pastikan production build sukses
- [ ] T095 Run `npm test` — pastikan semua test (existing + 8 baru) pass
- [ ] T096 Verify dependency removal: `npm ls @mui/material @mui/icons-material @emotion/react @emotion/styled sweetalert2` — semua harus "not found"
- [ ] T097 Run quickstart.md validation checklist — smoke test semua halaman

**Checkpoint**: Build sukses, semua test pass, 0 lint warnings, 5 dependency dihapus.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ├── Phase 2 (US1: Route Duplication)     [INDEPENDENT from Phase 3,4]
    ├── Phase 3 (US2: API Client)            [INDEPENDENT from Phase 2,4]
    ├── Phase 4 (US3: Error Handling)        [INDEPENDENT from Phase 2,3]
    │
    └── Phase 5 (US4: shadcn/ui)             [NEEDS Phase 1]
            │
            ├── Phase 6 (US5: Sonner)        [NEEDS US4 for AlertDialog]
            ├── Phase 7 (US6: Shared Utils)  [INDEPENDENT but easier after US4]
            ├── Phase 8 (US7: MenuActions)   [NEEDS US4 for DropdownMenu]
            │
            ├── Phase 9 (US8: Dark Mode)     [NEEDS US4 for CSS variables]
            ├── Phase 10 (US9: Split Files)   [EASIER after US4 components]
            │
            └── Phase 11 (US10: Tests)        [CAN START ANYTIME]
                    │
                    └── Phase 12 (Polish)     [NEEDS all phases]
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|-----------|-------------------|
| US1 (Route Duplication) | — | US2, US3, US10 |
| US2 (API Client) | — | US1, US3, US10 |
| US3 (Error Handling) | — | US1, US2, US10 |
| US4 (shadcn/ui) | Phase 1 (Setup) | US1, US2, US3, US10 |
| US5 (Sonner) | US4 (AlertDialog) | US6, US7, US10 |
| US6 (Shared Utils) | — (easier after US4) | US5, US7, US10 |
| US7 (MenuActions) | US4 (DropdownMenu) | US5, US6, US10 |
| US8 (Dark Mode) | US4 (CSS variables) | US9, US10 |
| US9 (Split Files) | — (easier after US4) | US8, US10 |
| US10 (Tests) | — | ALL stories |

### Parallel Opportunities

- **P1 Stories (Phase 2-4)**: US1, US2, US3 bisa dikerjakan bersamaan (semua file berbeda)
- **Phase 5 (US4) Part A**: T028-T033 (6 form files) semua paralel
- **Phase 5 (US4) Part B**: T034-T037 (4 card containers) semua paralel
- **Phase 5 (US4) Part C**: T038-T044 (7 icon migration groups) semua paralel
- **Phase 6 (US5)**: T048-T053 (5 form notifications) semua paralel
- **Phase 11 (US10)**: T082-T089 (8 test files) semua paralel

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1-4**: Setup + Backend consistency (US1, US2, US3) → **FIRST MILESTONE** (0 duplikasi route, apiClient 100%, error handling seragam)
2. **Phase 5**: shadcn/ui integration (US4) → **SECOND MILESTONE** (design system, icon migration, MUI removed)
3. **Phase 6-8**: Sonner + Shared Utils + MenuActions (US5, US6, US7) → **THIRD MILESTONE** (notifikasi ringan, formatting shared, dropdown konsisten)
4. **Phase 9-11**: Dark mode + Split Files + Tests (US8, US9, US10) → **FOURTH MILESTONE** (CSS variables, file <300 baris, test coverage ≥80%)
5. **Phase 12**: Polish → **FINAL** (seluruh refaktor selesai)

### MVP Scope (Minimal Viable)

- Phase 1 (Setup) + Phase 2-4 (US1, US2, US3) = backend consistency MVP
- Bisa di-merge ke `main` tanpa menunggu story lain

### Rollback Safety

- Setiap phase berdiri sendiri — bisa di-merge tanpa menunggu phase berikutnya
- API contract tidak berubah — rollback tidak memerlukan perubahan frontend
- Test existing selalu pass — CI/CD tidak broken
- `npm run dev` harus selalu bisa dijalankan

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit setelah setiap task atau grup task kecil
- Stop di setiap checkpoint untuk validasi independen
- `npm run dev` harus selalu bisa dijalankan — jangan biarkan branch dalam keadaan broken
- Total tasks: **97 tasks** (T001-T097)

### Format Validasi
- ✅ Semua tasks menggunakan format `- [ ] [TaskID] [P?] [Story?] Description with file path`
- ✅ Task IDs sequential (T001-T097)
- ✅ P1 stories have [P] markers for parallel tasks
- ✅ All implementation tasks have exact file paths
- ✅ Each phase has a checkpoint description
