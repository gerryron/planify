# Feature Specification: Refaktor Code Quality & Konsistensi Planify

**Feature Branch**: `002-refactor-code-quality`

**Created**: 2026-07-24

**Status**: Draft

**Input**: Refaktor maintainability lanjutan — menghilangkan duplikasi fungsi route, menyelesaikan migrasi apiClient, menyeragamkan error handling, mengintegrasikan shadcn/ui sebagai design system (menggantikan MUI + custom form styling), memigrasi SweetAlert2 ke Sonner toast, membuat shared utility functions, memecah file besar >500 baris, dan menambah test coverage.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Eliminasi Duplikasi Fungsi Route (Priority: P1 🔴)

Sebagai developer backend, saya ingin fungsi-fungsi helper yang copy-paste di 4+ file route (`toId`, `getWalletDelta`, `assertCreditLimit`, `isValidEmail`) diekstrak ke lokasi terpusat, sehingga saya tidak perlu meng-update 4 file berbeda ketika ada perubahan logika validasi.

**Why this priority**: Duplikasi adalah sumber bug paling umum — jika logika `toId` berubah, developer harus ingat meng-update 5 file. Ini adalah pondasi yang langsung mengurangi risiko inkonsistensi di semua API route.

**Independent Test**: Panggil `toId()` dari shared utility, verifikasi behavior sama dengan versi copy-paste di semua route file. Semua test existing tetap pass tanpa perubahan.

**Acceptance Scenarios**:

1. **Given** 5 file route yang masing-masing mendefinisikan `toId()` lokal, **When** fungsi diekstrak ke `src/shared/utils/routeHelpers.ts`, **Then** semua route menggunakan import dari file yang sama, dan behavior identik.
2. **Given** `getWalletDelta()` dan `assertCreditLimit()` duplikat di `cash-log/route.ts` dan `wallets/transfer/route.ts`, **When** diekstrak ke `src/features/wallets/utils/`, **Then** kedua route menggunakan fungsi yang sama tanpa perbedaan behavior.
3. **Given** `isValidEmail()` duplikat di `auth/login/route.ts` dan `auth/register/route.ts`, **When** diekstrak ke shared validation utility, **Then** kedua route menggunakan fungsi yang sama.

---

### User Story 2 — Selesaikan Migrasi API Client (Priority: P1 🔴)

Sebagai developer frontend, saya ingin SEMUA service file menggunakan shared `apiClient` tanpa exception, sehingga tidak ada lagi `fetch()` langsung atau `readError()` duplikat di service manapun.

**Why this priority**: Spec sebelumnya (001) memigrasi 6 service ke `apiClient`, tapi `superadminService.ts` dan `authService.logout()` terlewat. Menyelesaikan ini memastikan konsistensi 100% di seluruh frontend service layer.

**Independent Test**: Grep `fetch(` di semua file service — tidak ada hasil. Grep `readError` — tidak ada hasil di luar `apiClient.ts`.

**Acceptance Scenarios**:

1. **Given** `superadminService.ts` yang masih menggunakan `fetch()` + `readError()` lokal, **When** di-refactor menggunakan `apiClient`, **Then** semua method (`getUsers`, `approveUser`, `deactivateUser`) tetap berfungsi tanpa perubahan behavior.
2. **Given** `authService.logout()` yang menggunakan `fetch('/api/auth/logout', { method: 'POST' })`, **When** di-refactor menggunakan `apiClient.post()`, **Then** logout tetap berfungsi.
3. **Given** semua service sudah menggunakan `apiClient`, **When** dijalankan `grep fetch(` di `src/features/*/services/`, **Then** tidak ada hasil.

---

### User Story 3 — Seragamkan Error Handling di Semua Route (Priority: P1 🔴)

Sebagai developer backend, saya ingin semua API route menggunakan pattern `handleApiError()` yang konsisten, sehingga format error response selalu sama terlepas dari route mana yang throw error.

**Why this priority**: Saat ini ada 5+ route yang menggunakan pattern error handling berbeda (`badRequest()` langsung, `console.error` + `serverError()`, atau auth manual). Inkonsistensi ini menyebabkan format error response berbeda-beda antar route, membingungkan frontend developer.

**Independent Test**: Throw `AppError` di route settings/purge dan verifikasi response format-nya sama dengan route wallets.

**Acceptance Scenarios**:

1. **Given** `settings/purge/route.ts` yang catch block-nya selalu return `badRequest()`, **When** di-refactor menggunakan `handleApiError()`, **Then** error 400, 404, 500 masing-masing return status code yang tepat.
2. **Given** `cash-log/route.ts` GET handler yang menggunakan umbrella catch `badRequest()`, **When** di-refactor menggunakan `handleApiError()`, **Then** error di-log dan return status code yang sesuai.
3. **Given** 3 route superadmin yang menggunakan `console.error` + `serverError()` manual, **When** di-refactor menggunakan `handleApiError()`, **Then** tidak ada double-logging dan error response konsisten.
4. **Given** `auth/me/route.ts` yang melakukan verifikasi token manual, **When** di-refactor menggunakan `requireAuth()`, **Then** behavior autentikasi tetap sama, kode lebih pendek.

---

### User Story 4 — Integrasi shadcn/ui Design System (Priority: P1 🔴)

Sebagai developer frontend, saya ingin Planify menggunakan shadcn/ui sebagai design system foundation, sehingga saya tidak perlu lagi menulis CSS Tailwind mentah yang duplikat di 20+ lokasi form field, dan semua komponen UI memiliki look-and-feel yang konsisten.

**Why this priority**: Ini adalah perubahan arsitektural terbesar — menggantikan pendekatan "tulis className Tailwind inline di setiap input" dengan komponen deklaratif yang konsisten. Menyentuh hampir semua komponen frontend, jadi harus dikerjakan di awal (setelah foundation US1-US3).

**Independent Test**: `npm run build` sukses, semua halaman render identik secara visual dengan sebelum migrasi, `@mui/material` dan `@mui/icons-material` bisa dihapus dari `package.json`.

**Acceptance Scenarios**:

1. **Given** project Planify, **When** `npx shadcn@latest init` dijalankan dengan konfigurasi Tailwind v4 + CSS variables + emerald theme, **Then** `components.json` dan `src/lib/utils.ts` (cn helper) terbentuk.
2. **Given** shadcn/ui sudah terinisialisasi, **When** komponen `Button`, `Input`, `Select`, `Textarea`, `Card`, `Dialog`, `DropdownMenu`, `Sheet`, `Checkbox`, `Label` di-install via CLI, **Then** semua komponen tersedia di `src/components/ui/` dengan tema emerald.
3. **Given** semua form (6 file: `WalletsForm`, `WalletTransferForm`, `CashLogForm`, `CategoryForm`, `MonthlyBudgetForm`, `SettingsDataResetPanel`) masih menggunakan className Tailwind inline, **When** di-refactor menggunakan shadcn/ui `Input`, `Select`, `Button`, `Textarea`, **Then** tampilan identik, kode form lebih pendek 30-50%.
4. **Given** semua card container (list pages, dashboard cards) masih menggunakan className Tailwind inline, **When** di-refactor menggunakan shadcn/ui `Card`, `CardHeader`, `CardContent`, **Then** tampilan identik, struktur komponen lebih jelas.
5. **Given** 50+ import icon dari `@mui/icons-material` di 15 file, **When** di-migrasi ke `lucide-react`, **Then** semua icon tampil identik (pilih icon lucide yang paling mendekati MUI counterpart).
6. **Given** migrasi shadcn/ui + lucide-react selesai, **When** `npm uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled`, **Then** `npm run build` sukses tanpa error.

---

### User Story 5 — Ganti SweetAlert2 dengan Sonner Toast (Priority: P2 🟡)

Sebagai user Planify, saya ingin notifikasi success/error muncul sebagai toast yang ringan dan tidak memblokir layar (seperti SweetAlert2 yang modal), sehingga flow kerja saya tidak terinterupsi.

**Why this priority**: Sonner adalah toast library yang ringan dan umum dipasangkan dengan shadcn/ui. Menggantikan SweetAlert2 menghilangkan dependency besar (~40KB) dan memberikan UX yang lebih modern.

**Independent Test**: Buat wallet baru — verifikasi notifikasi muncul sebagai toast di pojok kanan bawah, bukan modal tengah layar.

**Acceptance Scenarios**:

1. **Given** `SonnerProvider` sudah di-mount di root layout, **When** form submission berhasil, **Then** toast success muncul dengan pesan yang sesuai dan auto-dismiss.
2. **Given** form submission gagal, **When** error terjadi, **Then** toast error muncul dengan pesan error yang informatif.
3. **Given** konfirmasi destroy/delete diperlukan, **When** user klik delete, **Then** tetap ada dialog konfirmasi (pakai shadcn/ui `AlertDialog`), bukan toast.
4. **Given** semua penggunaan `Swal.fire()` di-migrasi ke `toast()` atau `AlertDialog`, **When** `npm uninstall sweetalert2`, **Then** `npm run build` sukses tanpa error.

---

### User Story 6 — Shared Utility Functions (Priority: P2 🟡)

Sebagai developer frontend, saya ingin fungsi-fungsi formatting yang umum (`formatRupiah`, `monthLabel`, `shiftMonth`, `todayIsoDate`) tersedia di satu lokasi shared, sehingga saya tidak perlu mencari-cari atau copy-paste fungsi yang sama.

**Why this priority**: Saat ini `formatRupiah` diimplementasikan dengan 2 pendekatan berbeda (13+ lokasi), `monthLabel` copy-paste di 3 file, `shiftMonth` di 2 file. Standardisasi fungsi-fungsi ini menghilangkan inkonsistensi formatting dan mengurangi duplikasi ~50+ baris.

**Independent Test**: Panggil `formatRupiah(15000)` dan verifikasi output `"Rp 15.000"`. Panggil `monthLabel('2026-07')` dan verifikasi output `"Jul 2026"`.

**Acceptance Scenarios**:

1. **Given** `formatRupiah()` dibuat di `src/shared/utils/currency.ts`, **When** semua lokasi `toLocaleString('id-ID')` + `"Rp "` diganti dengan `formatRupiah()`, **Then** output formatting konsisten di seluruh aplikasi.
2. **Given** `monthLabel()` dan `shiftMonth()` diekstrak ke `src/shared/utils/dateFormat.ts`, **When** `CashLogList` dan `MonthlyBudgetList` menggunakan fungsi shared, **Then** behavior filter bulan tetap sama.
3. **Given** `todayIsoDate()` dibuat, **When** digunakan di `CashLogForm`, `WalletTransferForm`, dan `MonthlyBudgetForm`, **Then** semua mendapatkan tanggal hari ini dalam format ISO yang konsisten.
4. **Given** `isValidEmail()` diekstrak ke `src/shared/utils/validation.ts`, **When** digunakan di `auth/login` dan `auth/register` routes, **Then** validasi email tetap sama.

---

### User Story 7 — Generalisasi MenuActions dengan shadcn/ui DropdownMenu (Priority: P2 🟡)

Sebagai developer frontend, saya ingin komponen `MenuActions` di-refactor menggunakan shadcn/ui `DropdownMenu` dan bisa digunakan oleh `CashLogList`, `MonthlyBudgetList`, dan `CategoryList`, sehingga tidak ada 3 implementasi lokal yang identik dan semua dropdown memiliki interaksi yang konsisten (keyboard navigation, focus trap, animation).

**Why this priority**: Tiga komponen list mendefinisikan `MenuActions` lokal yang ~80% identik dengan implementasi kustom (click-outside handler manual, positioning manual). shadcn/ui `DropdownMenu` sudah menyediakan aksesibilitas dan animasi built-in. Generalisasi akan memangkas ~250 baris duplikasi.

**Independent Test**: Render `MenuActions` dengan props `onEdit` dan `onDelete` di `CashLogList`, verifikasi dropdown berfungsi dengan keyboard (Arrow keys, Enter, Escape).

**Acceptance Scenarios**:

1. **Given** `MenuActions` di-refactor menggunakan shadcn/ui `DropdownMenu`, **When** digunakan di `CashLogList`, **Then** menu Edit dan Delete berfungsi tanpa Transfer option, dan keyboard navigation berfungsi.
2. **Given** `MenuActions` digunakan di `MonthlyBudgetList`, **When** user klik Edit, **Then** callback `onEdit` dipanggil — behavior sama dengan versi lokal sebelumnya.
3. **Given** `MenuActions` digunakan di `CategoryList`, **When** user tekan Escape, **Then** dropdown menutup — tidak perlu lagi click-outside handler manual.
4. **Given** semua list sudah menggunakan shared `MenuActions`, **When** dicek, **Then** tidak ada lagi `function MenuActions` definisi lokal di `CashLogList`, `MonthlyBudgetList`, atau `CategoryList`.

---

### User Story 8 — Migrasi Dark Mode ke CSS Variables (Priority: P3 🟢)

Sebagai user Planify, saya ingin dark mode berfungsi dengan mulus menggunakan sistem CSS variables shadcn/ui, sehingga transisi tema lebih konsisten dan tidak ada lagi 40+ baris custom CSS untuk styling dark mode input/calendar.

**Why this priority**: Sistem dark mode existing (`.dark` class + `body.theme-dark`) berfungsi, tapi membutuhkan banyak custom CSS (lihat `globals.css` line 17-78). CSS variables shadcn/ui lebih elegan dan terintegrasi dengan komponen.

**Independent Test**: Toggle dark mode — verifikasi semua komponen (input, card, dropdown, dialog, chart tooltip) mengikuti tema dengan mulus.

**Acceptance Scenarios**:

1. **Given** `globals.css` menggunakan CSS variables shadcn/ui (`@theme inline` dengan `--background`, `--foreground`, `--primary`, dll), **When** class `dark` di-toggle di `<html>`, **Then** semua komponen berubah tema tanpa custom CSS tambahan.
2. **Given** `ThemeProvider` yang sudah ada, **When** di-refactor untuk toggle class `dark` di `<html>` element (sesuai next-themes pattern), **Then** tema tersimpan di localStorage dan bertahan saat refresh.
3. **Given** migrasi selesai, **When** dicek, **Then** tidak ada lagi selector `body.theme-dark` atau `.dark input[type='date']` custom di `globals.css` — semua di-handle oleh CSS variables.

---

### User Story 9 — Pecah File Besar >500 Baris (Priority: P3 🟢)

Sebagai developer, saya ingin file-file yang masih >500 baris dipecah menjadi modul lebih kecil (< 300 baris), sehingga setiap bagian mudah dipahami, di-test, dan di-modifikasi secara independen.

**Why this priority**: File besar adalah technical debt yang memperlambat onboarding developer baru dan meningkatkan risiko merge conflict. Setelah foundation (US1-US8) selesai, file-file ini bisa dipecah dengan aman.

**Independent Test**: Setelah refaktor, `npm run build` sukses, semua test pass, dan tidak ada perubahan visual/fungsional.

**Acceptance Scenarios**:

1. **Given** `useDashboardData.ts` (1062 baris), **When** dipecah menjadi `useMonthlyData`, `useSummaryData`, `useChartConfig`, **Then** masing-masing file < 300 baris dan dashboard tetap berfungsi identik.
2. **Given** `SettingsDataResetPanel.tsx` (672 baris), **When** dipecah menggunakan shadcn/ui `Card`, `Checkbox`, `Dialog` untuk sub-panel, **Then** file utama < 300 baris.
3. **Given** `MonthlyBudgetList.tsx` (639 baris) dan `CashLogList.tsx` (556 baris), **When** masing-masing diekstrak `BudgetItem`/`CashLogItem` dan filter bar ke komponen terpisah (pakai shadcn/ui `Card`), **Then** file utama < 300 baris.
4. **Given** `WalletTransferForm.tsx` (522 baris) dan `WalletsForm.tsx` (483 baris), **When** diekstrak step dan section ke sub-komponen (pakai shadcn/ui `Card`, `Input`, `Select`), **Then** file utama < 300 baris.
5. **Given** `openapi.ts` (1136 baris), **When** dipecah menjadi `openapi/schemas.ts`, `openapi/paths.ts`, `openapi/responses.ts`, **Then** Swagger UI tetap menampilkan dokumentasi lengkap.

---

### User Story 10 — Tambah Test Coverage untuk Core & Hooks (Priority: P3 🟢)

Sebagai developer, saya ingin core infrastructure (`apiClient`, `apiErrors`, `apiResponse`) dan utility functions (`dashboardCharts.ts`) memiliki unit test, sehingga saya bisa refaktor dengan confidence bahwa tidak ada yang rusak.

**Why this priority**: Core modules saat ini 0% tested — padahal mereka adalah dependency semua fitur lain. Test untuk module ini adalah safety net paling penting. Bisa dimulai kapan saja, idealnya setelah US1-US3 stabil.

**Independent Test**: `npm test -- --coverage` menunjukkan coverage meningkat, 0 failing tests.

**Acceptance Scenarios**:

1. **Given** `apiResponse.ts` (6 helper functions), **When** unit test ditambahkan, **Then** test memverifikasi setiap function return `NextResponse` dengan status code dan body yang benar.
2. **Given** `apiErrors.ts` (error class hierarchy + `handleApiError`), **When** unit test ditambahkan, **Then** test memverifikasi setiap error class menghasilkan response JSON yang sesuai.
3. **Given** `apiClient.ts` (HTTP client class), **When** unit test dengan mock fetch ditambahkan, **Then** test memverifikasi GET/POST/PATCH/DELETE handling success dan error response.
4. **Given** `dashboardCharts.ts` (11 pure functions), **When** unit test ditambahkan, **Then** test cover: `formatCurrency`, `formatCompact`, `monthLabel`, `shortMonthLabel`, `toIsoDate`, dan edge cases.
5. **Given** hook files (`useWallets`, `useCategories`, `useCashLogs`, `useMonthlyBudgets`), **When** test dengan React Query mock ditambahkan, **Then** test memverifikasi data fetching dan cache behavior.

---

### Edge Cases

- **Fungsi route yang diekstrak berbeda behavior**: Bagaimana memastikan `toId()` versi baru behavior-nya sama persis dengan semua versi copy-paste? → Tulis unit test yang cover semua edge case dari 5 versi sebelumnya, pastikan semua existing test tetap pass.
- **shadcn/ui komponen tidak 100% cocok dengan tampilan existing**: Bagaimana jika `Input` shadcn/ui terlihat berbeda dari input existing? → Override via `className` prop yang diteruskan ke komponen shadcn/ui. Sesuaikan `tailwind.config` theme agar match dengan warna emerald existing.
- **Migrasi icon MUI ke lucide — tidak semua icon punya padanan 1:1**: Beberapa icon MUI tidak punya nama yang sama di lucide-react. → Buat mapping table, pilih icon lucide yang paling mendekati secara visual. Jangan ragu ganti icon jika yang baru lebih baik.
- **Sonner toast tidak bisa menggantikan SweetAlert2 confirmation dialog**: SweetAlert2 digunakan untuk konfirmasi delete/approve/deactivate. → Konfirmasi menggunakan shadcn/ui `AlertDialog`, notifikasi sukses/gagal menggunakan Sonner `toast`.
- **Dark mode CSS variables — existing `globals.css` punya banyak custom rule**: Bagaimana migrasi tanpa merusak existing styling? → Migrasi bertahap: setup CSS variables dulu, pastikan berfungsi, lalu hapus rule `body.theme-dark` secara incremental.
- **MenuActions dengan shadcn/ui DropdownMenu — behavior berbeda**: DropdownMenu menggunakan Radix UI di bawahnya (Portal, FocusTrap). → Pastikan dropdown tidak terpotong oleh overflow parent. Gunakan `modal={false}` jika diperlukan.
- **Pecah file tanpa merusak import**: Bagaimana memastikan tidak ada broken import setelah memecah file? → TypeScript compiler akan catch broken import; `npm run build` harus selalu sukses.
- **Test API client tanpa network**: Bagaimana mengetes `apiClient` tanpa melakukan HTTP call nyata? → Mock `fetch` global, test hanya verifikasi URL, method, headers, dan response handling.

## Requirements *(mandatory)*

### Functional Requirements

#### Backend — Duplikasi & Konsistensi (US1-US3)

- **FR-001**: System MUST memiliki fungsi `toId()` di shared utility (`src/shared/utils/routeHelpers.ts`) yang digunakan oleh semua route handler.
- **FR-002**: System MUST memiliki fungsi `getWalletDelta()` dan `assertCreditLimit()` di `src/features/wallets/utils/` yang digunakan oleh `cash-log/route.ts` dan `wallets/transfer/route.ts`.
- **FR-003**: System MUST memiliki fungsi `isValidEmail()` di `src/shared/utils/validation.ts` yang digunakan oleh `auth/login/route.ts` dan `auth/register/route.ts`.
- **FR-004**: `superadminService.ts` MUST menggunakan `apiClient` untuk semua HTTP call, tidak boleh ada `fetch()` langsung atau `readError()` lokal.
- **FR-005**: `authService.logout()` MUST menggunakan `apiClient.post()` alih-alih `fetch()` langsung.
- **FR-006**: Semua API route handler MUST menggunakan `handleApiError()` di catch block, tidak boleh return `badRequest()` atau `serverError()` secara langsung.
- **FR-007**: `auth/me/route.ts` MUST menggunakan `requireAuth()` guard alih-alih verifikasi token manual.

#### shadcn/ui Design System (US4)

- **FR-008**: Project MUST memiliki `components.json` (konfigurasi shadcn/ui) dengan setting: Tailwind v4, CSS variables, emerald sebagai base color, radius 0.5rem.
- **FR-009**: Semua form (6 file: `WalletsForm`, `WalletTransferForm`, `CashLogForm`, `CategoryForm`, `MonthlyBudgetForm`, `SettingsDataResetPanel`) MUST menggunakan komponen shadcn/ui (`Input`, `Select`, `Button`, `Textarea`, `Label`) alih-alih className Tailwind inline.
- **FR-010**: Semua card/list container MUST menggunakan komponen shadcn/ui `Card`, `CardHeader`, `CardContent` untuk tampilan konsisten.
- **FR-011**: Semua icon dari `@mui/icons-material` MUST di-migrasi ke `lucide-react` dengan mapping yang sesuai (50+ icon di 15 file).
- **FR-012**: `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` MUST dihapus dari `package.json` setelah migrasi selesai (tidak ada import yang tersisa).

#### Notifikasi (US5)

- **FR-013**: `SonnerProvider` MUST di-mount di root layout (`src/app/layout.tsx`) untuk menyediakan toast notifications.
- **FR-014**: Semua `Swal.fire()` untuk success/error notification MUST diganti dengan `toast()` dari Sonner.
- **FR-015**: Semua `Swal.fire()` untuk konfirmasi delete/approve/deactivate MUST diganti dengan shadcn/ui `AlertDialog`.
- **FR-016**: `sweetalert2` MUST dihapus dari `package.json` setelah migrasi selesai.

#### Shared Utilities (US6)

- **FR-017**: System MUST memiliki fungsi `formatRupiah()` di `src/shared/utils/currency.ts` yang konsisten di seluruh aplikasi.
- **FR-018**: System MUST memiliki fungsi `monthLabel()` dan `shiftMonth()` di `src/shared/utils/dateFormat.ts`.
- **FR-019**: System MUST memiliki fungsi `todayIsoDate()` di `src/shared/utils/dateFormat.ts`.

#### MenuActions Generalisasi (US7)

- **FR-020**: `MenuActions` MUST di-refactor menggunakan shadcn/ui `DropdownMenu` dengan props `onEdit`, `onDelete`, `onTransfer?` (opsional), dan `extraActions?` (opsional).
- **FR-021**: `CashLogList`, `MonthlyBudgetList`, dan `CategoryList` MUST menggunakan shared `MenuActions` — tidak boleh ada definisi lokal.

#### Dark Mode (US8)

- **FR-022**: `globals.css` MUST menggunakan CSS variables shadcn/ui (`@theme inline` dengan `--background`, `--foreground`, `--card`, `--primary`, `--muted`, dll) untuk theming.
- **FR-023**: Dark mode MUST di-toggle via class `dark` di `<html>` element, dengan persistence di localStorage.
- **FR-024**: Custom CSS rule `body.theme-dark` dan `.dark input[type='date']` di `globals.css` MUST dihapus setelah migrasi — semua di-handle oleh CSS variables.

#### Pecah File Besar (US9)

- **FR-025**: `useDashboardData.ts` (1062 baris) MUST dipecah menjadi hook-hook yang lebih kecil, masing-masing < 300 baris.
- **FR-026**: `SettingsDataResetPanel.tsx` (672 baris) MUST dipecah, file utama menjadi < 300 baris.
- **FR-027**: `MonthlyBudgetList.tsx` (639 baris) MUST dipecah, file utama menjadi < 300 baris.
- **FR-028**: `CashLogList.tsx` (556 baris) MUST dipecah, file utama menjadi < 300 baris.
- **FR-029**: `WalletTransferForm.tsx` (522 baris) MUST dipecah, file utama menjadi < 300 baris.
- **FR-030**: `WalletsForm.tsx` (483 baris) MUST dipecah, file utama menjadi < 300 baris.
- **FR-031**: `openapi.ts` (1136 baris) MUST dipecah menjadi modul-modul terpisah di direktori `src/lib/openapi/`.

#### Test Coverage (US10)

- **FR-032**: Unit test MUST ditambahkan untuk `apiResponse.ts`, `apiErrors.ts`, dan `apiClient.ts` di `src/core/http/`.
- **FR-033**: Unit test MUST ditambahkan untuk semua 11 exported functions di `dashboardCharts.ts`.
- **FR-034**: Unit test MUST ditambahkan untuk `useWallets`, `useCategories`, `useCashLogs`, dan `useMonthlyBudgets` hooks.

#### Global

- **FR-035**: Semua test existing MUST tetap pass setelah semua refaktor.
- **FR-036**: `npm run build` dan `npm run lint` MUST sukses setelah setiap phase refaktor.

### Key Entities

- **RouteHelper**: Koleksi fungsi pure untuk parsing dan validasi di API route (`toId`, `toNumber`, `isValidEmail`) — stateless, input-output deterministic.
- **shadcn/ui Component Library**: Koleksi komponen UI berbasis Radix UI + Tailwind CSS yang di-copy ke `src/components/ui/` — `Button`, `Input`, `Select`, `Textarea`, `Card`, `Dialog`, `DropdownMenu`, `Sheet`, `Checkbox`, `Label`, `AlertDialog`.
- **Sonner Toast**: Library notifikasi ringan — `Toaster` component di-root, `toast()` function untuk memanggil notifikasi sukses/error/info.
- **CSS Variables Theme**: Sistem theming berbasis CSS custom properties (`--background`, `--foreground`, `--primary`, `--card`, `--muted`, dll) yang di-toggle via class `dark` di `<html>`.
- **MenuActions (v2)**: Komponen dropdown menu generik berbasis shadcn/ui `DropdownMenu` — props untuk menentukan aksi yang tersedia (edit, delete, transfer, custom actions).
- **SharedUtility**: Fungsi formatting (`formatRupiah`, `monthLabel`, `shiftMonth`, `todayIsoDate`) — pure functions, no side effects.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Jumlah definisi `toId()` di codebase berkurang dari 5 menjadi 0 (semua menggunakan 1 shared import).
- **SC-002**: Jumlah definisi `getWalletDelta()` dan `assertCreditLimit()` berkurang dari 2 menjadi 0 lokal (semua menggunakan 1 shared import).
- **SC-003**: `grep fetch(` di `src/features/*/services/` dan `src/features/auth/services/` mengembalikan 0 hasil.
- **SC-004**: Semua route handler (20+ endpoint) menggunakan `handleApiError()` di catch block — 0 exception.
- **SC-005**: `npm ls @mui/material @mui/icons-material @emotion/react @emotion/styled sweetalert2` menunjukkan "not found" — semua 5 dependency dihapus.
- **SC-006**: 6 form file menggunakan komponen shadcn/ui (Input, Select, Button) alih-alih className Tailwind inline — verifikasi via code review.
- **SC-007**: 50+ import `@mui/icons-material` di 15 file termigrasi ke `lucide-react` — 0 import MUI icons tersisa.
- **SC-008**: 0 pemanggilan `Swal.fire()` tersisa di codebase — semua menggunakan Sonner `toast()` atau shadcn/ui `AlertDialog`.
- **SC-009**: Jumlah definisi `function MenuActions` di luar `src/features/wallets/components/MenuActions.tsx` berkurang dari 3 menjadi 0.
- **SC-010**: Jumlah pemanggilan `toLocaleString('id-ID')` inline untuk currency formatting berkurang dari 13+ menjadi 0 (semua menggunakan `formatRupiah()`).
- **SC-011**: 7 file target (US9) masing-masing menjadi < 300 baris untuk file utama.
- **SC-012**: Coverage untuk `src/core/http/` naik dari 0% menjadi ≥ 80%.
- **SC-013**: Coverage untuk `src/features/dashboard/utils/dashboardCharts.ts` naik dari 0% menjadi ≥ 80%.
- **SC-014**: `npm test` passing dengan coverage ≥ existing baseline + peningkatan dari SC-012 dan SC-013.
- **SC-015**: `npm run build` sukses tanpa error baru setelah setiap phase.
- **SC-016**: `npm run lint` menghasilkan 0 warning baru setelah setiap phase.
- **SC-017**: Total dependencies di `package.json` berkurang minimal 4 paket (dari penghapusan MUI + Emotion + SweetAlert2).

## Assumptions

- Branch: `002-refactor-code-quality`, merge ke `main` setelah semua task selesai.
- Backend API contract tidak berubah — hanya struktur kode internal yang di-refaktor.
- Prisma schema tidak berubah — tidak ada migrasi database.
- Tidak ada perubahan UI/UX yang terlihat user — refaktor struktural dengan tampilan identik.
- Pattern React Query yang sudah diterapkan di spec 001 tetap digunakan.
- Test existing menggunakan Jest mock Prisma — pattern yang sama dipertahankan.
- `eslint-config-next` flat config tetap digunakan.
- **shadcn/ui**: Menggunakan versi terbaru yang support Tailwind v4 + React 19 + Next.js 16. Komponen di-copy ke `src/components/ui/`.
- **lucide-react**: Icon mapping MUI → lucide dipilih yang paling mendekati secara visual; jika tidak ada padanan exact, gunakan alternatif terbaik.
- **Sonner**: Hanya untuk toast notifikasi; dialog konfirmasi menggunakan shadcn/ui `AlertDialog`.
- **CSS Variables**: Dark mode CSS variables menggantikan custom CSS `body.theme-dark` secara bertahap — tidak perlu 100% bersih di phase awal, yang penting sistem berfungsi.
- **Tailwind v4**: Konfigurasi existing tetap dipertahankan. shadcn/ui diinisialisasi dengan `--css src/app/globals.css --base-color emerald`.
