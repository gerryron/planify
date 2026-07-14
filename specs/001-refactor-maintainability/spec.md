# Feature Specification: Refaktor Maintainability Planify

**Feature Branch**: `001-refactor-maintainability`

**Created**: 2026-07-12

**Status**: Done

**Input**: Refaktor struktural Planify — memecah komponen besar, unifikasi API client, standarisasi error handling, ekstraksi validasi duplikat, menambah data caching layer, dan meningkatkan test coverage.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Konsistensi API Client (Priority: P1 🔴)

Sebagai developer, saya ingin semua API call dari frontend menggunakan satu shared API client yang terstandarisasi, sehingga saya tidak perlu menduplikasi `buildApiError()` dan `readError()` di setiap service file, dan error handling konsisten di seluruh aplikasi.

**Why this priority**: Foundation untuk semua perubahan berikutnya. Tanpa ini, setiap service tetap duplikasi error handling dan perubahan global (seperti refresh token) harus di-update di banyak file.

**Independent Test**: Buat `apiClient.get('/api/wallets')` dan verifikasi bahwa response typed, error handling, dan base URL semua berfungsi tanpa tambahan boilerplate di service file.

**Acceptance Scenarios**:

1. **Given** service file `walletsService.ts` yang ada, **When** di-refactor menggunakan shared `apiClient`, **Then** semua fungsi (`getAll`, `create`, `update`, `delete`) tetap bekerja tanpa perubahan behavior.
2. **Given** response error dari API, **When** `apiClient` menerima status non-2xx, **Then** throw `ApiError` dengan `.message` yang bisa langsung ditampilkan ke user.
3. **Given** 5 service files (`walletsService`, `cashLogService`, `monthlyBudgetService`, `categoriesService`, `authService`), **When** shared `apiClient` diimplementasikan, **Then** tidak ada lagi definisi `buildApiError`/`readError` yang duplikat di file-file tersebut.

---

### User Story 2 — Standarisasi Error Handling API Route (Priority: P1 🔴)

Sebagai developer backend, saya ingin memiliki error class hierarchy yang terstandarisasi, sehingga saya tidak perlu menulis `if (error instanceof Error && error.message === 'WALLET_NOT_FOUND')` di setiap route handler.

**Why this priority**: Dipasangkan dengan US1, ini menyelesaikan masalah error handling di seluruh stack (frontend + backend). US2 tidak depend pada US1, jadi bisa dikerjakan paralel.

**Independent Test**: Throw `new AppError('WALLET_NOT_FOUND', 404)` di route handler dan verifikasi response JSON berisi `{ error: 'Wallet tidak ditemukan' }` dengan status 404.

**Acceptance Scenarios**:

1. **Given** route handler wallet POST, **When** validasi gagal, **Then** throw `AppError` dengan code spesifik, ditangkap oleh error handler terpusat, dan return response yang konsisten.
2. **Given** route handler cash-log PATCH, **When** transfer validation gagal, **Then** error response format sama dengan di wallet route.
3. **Given** middleware error handler, **When** error tidak terduga (500) terjadi, **Then** log error detail ke console tapi return generic message ke client.

---

### User Story 3 — Ekstraksi Duplikasi Validasi Wallet (Priority: P2 🟡)

Sebagai developer yang bekerja di wallet route, saya ingin validasi goal wallet dan credit card wallet diekstrak ke utility functions terpisah, sehingga POST dan PATCH tidak menduplikasi logika validasi yang sama.

**Why this priority**: Langsung mengurangi technical debt di route file terbesar kedua (555 baris). Bisa dikerjakan bersamaan dengan US2.

**Independent Test**: Panggil `validateWalletFields(input)` langsung di unit test, verifikasi return error untuk input invalid, dan sukses untuk input valid.

**Acceptance Scenarios**:

1. **Given** input wallet POST dengan `kind: 'goal'` tanpa `goalAmount`, **When** `validateWalletFields` dipanggil, **Then** return error `'Goal amount harus diisi untuk wallet tujuan'`.
2. **Given** input wallet PATCH dengan credit card fields tidak lengkap, **When** validasi dijalankan, **Then** return error yang sesuai tanpa perlu duplikasi kode validasi.
3. **Given** `validateWalletFields` sudah ada, **When** POST dan PATCH route di-refactor untuk menggunakannya, **Then** semua test existing tetap pass.

---

### User Story 4 — Pecah DashboardView (Priority: P2 🟡)

Sebagai developer frontend, saya ingin DashboardView.tsx (2700 baris) dipecah menjadi komponen-komponen kecil dan custom hook, sehingga setiap bagian dashboard bisa di-test, di-modifikasi, dan dipahami secara independen.

**Why this priority**: File terbesar di proyek, menyumbang technical debt paling signifikan. Tapi bisa dikerjakan secara inkremental (pecah per section).

**Independent Test**: Setelah refaktor, render DashboardView dan verifikasi semua visual (SummaryCard, ChartCard, tooltips) identik dengan sebelum refaktor.

**Acceptance Scenarios**:

1. **Given** DashboardView, **When** di-refaktor, **Then** data fetching logic terekstrak ke `useDashboardData()` hook yang bisa di-mock untuk testing.
2. **Given** DashboardView, **When** di-refaktor, **Then** `SummaryCard` menjadi komponen terpisah yang bisa di-render independen.
3. **Given** DashboardView, **When** di-refaktor, **Then** konfigurasi chart Recharts terekstrak ke file `dashboardCharts.ts` terpisah.
4. **Given** DashboardView, **When** di-refaktor, **Then** DashboardView.tsx < 300 baris (hanya compose sub-komponen).

---

### User Story 5 — Tambah Data Caching Layer (Priority: P3 🟢)

Sebagai user Planify, saya ingin data yang sudah di-fetch (wallets, categories) tidak di-fetch ulang setiap kali saya navigasi antar halaman, sehingga aplikasi terasa lebih responsif.

**Why this priority**: UX improvement yang signifikan, tapi perlu foundation US1 dulu. Bisa dikerjakan paralel dengan US4.

**Independent Test**: Buka dashboard (fetch wallets), navigasi ke halaman wallets — network tab tidak menunjukkan request GET /api/wallets kedua.

**Acceptance Scenarios**:

1. **Given** data wallets sudah di-fetch di dashboard, **When** user navigasi ke halaman wallets, **Then** data dari cache langsung ditampilkan tanpa loading spinner.
2. **Given** user membuat wallet baru, **When** wallet berhasil dibuat, **Then** cache otomatis invalidasi dan menampilkan data terbaru.
3. **Given** data kategori jarang berubah, **When** app di-load, **Then** data kategori di-cache dengan stale time yang panjang.

---

### User Story 6 — Pecah Komponen Besar Lainnya (Priority: P3 🟢)

Sebagai developer, saya ingin WalletsList.tsx (903 baris) dan Sidebar.tsx (744 baris) juga dipecah menjadi komponen lebih kecil mengikuti pattern yang sama dengan DashboardView.

**Why this priority**: Konsistensi — setelah DashboardView dipecah, pattern yang sama diterapkan ke komponen besar lainnya. Bisa paralel dengan US5.

**Independent Test**: Render WalletsList dan Sidebar, verifikasi semua interaksi (drag-and-drop, menu actions, dark/light mode, mobile/desktop view) tetap berfungsi.

**Acceptance Scenarios**:

1. **Given** WalletsList, **When** di-refaktor, **Then** `SortableWalletItem`, `MenuActions`, dan drag-and-drop logic masing-masing di file terpisah.
2. **Given** Sidebar, **When** di-refaktor, **Then** varian render (desktop collapsed, desktop expanded, mobile) terekstrak ke komponen terpisah.
3. **Given** semua komponen sudah dipecah, **When** app dijalankan, **Then** tidak ada perubahan visual atau fungsional.

---

### User Story 7 — Peningkatan Test Coverage (Priority: P3 🟢)

Sebagai developer, saya ingin menambah test coverage untuk area kritis yang belum ter-cover, sehingga refaktor di masa depan lebih aman.

**Why this priority**: Safety net. Bisa dimulai kapan saja, lebih baik setelah foundation (US1-US3) stabil.

**Independent Test**: Run `npm test -- --coverage` — coverage meningkat, tidak ada test yang fail.

**Acceptance Scenarios**:

1. **Given** `goalProgress.ts` utility, **When** test ditambahkan untuk edge cases (goal amount = 0, negative progress), **Then** test pass dan mendokumentasikan expected behavior.
2. **Given** wallet transfer API, **When** test ditambahkan untuk fee calculation dan balance validation, **Then** test pass.
3. **Given** komponen `SummaryCard` yang sudah diekstrak, **When** React Testing Library test ditambahkan, **Then** test memverifikasi rendering dengan berbagai props.

---

### Edge Cases

- **Ngin cache stale**: Apa yang terjadi jika data berubah di server (misal sync dari device lain) tapi cache frontend masih lama? → React Query punya `staleTime` dan `refetchOnWindowFocus` sebagai mekanisme standar.
- **API client breaking change**: Bagaimana memastikan semua service berfungsi setelah refaktor API client? → Test existing API route integration test harus tetap pass.
- **Komponen pecah tidak identik**: Bagaimana memastikan DashboardView yang sudah dipecah render output yang sama? → Bandingkan screenshot sebelum/sesudah, atau lakukan side-by-side testing.
- **Drag-and-drop WalletsList**: Refaktor tidak boleh merusak @dnd-kit behavior. → Manual testing drag-and-drop setelah refaktor.
- **Sidebar dark/light mode**: Theme toggle harus tetap berfungsi di semua varian render. → Test dengan toggle tema di setiap variant.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST memiliki satu modul `src/core/http/apiClient.ts` yang menyediakan fungsi `get`, `post`, `patch`, `delete` dengan typing generik dan error handling terstandarisasi.
- **FR-002**: System MUST memiliki error class hierarchy (`AppError`, `ValidationError`, `NotFoundError`, `AuthError`) di `src/core/http/apiErrors.ts` yang digunakan oleh semua API route.
- **FR-003**: System MUST memiliki `validateWalletFields()` utility di `src/features/wallets/utils/validation.ts` yang digunakan oleh POST dan PATCH route handler.
- **FR-004**: System MUST memiliki `useDashboardData()` custom hook di `src/features/dashboard/hooks/` yang meng-enkapsulasi semua data fetching dan aggregation logic.
- **FR-005**: System MUST memiliki komponen `SummaryCard`, `ChartCard`, `TopExpenseTooltip`, `DailyTrendTooltip` masing-masing di file terpisah di `src/features/dashboard/components/`.
- **FR-006**: System MUST memiliki konfigurasi chart Recharts di file terpisah `src/features/dashboard/utils/dashboardCharts.ts`.
- **FR-007**: System MUST menggunakan React Query (`@tanstack/react-query`) untuk data fetching di komponen frontend, dengan `QueryClientProvider` di root layout.
- **FR-008**: System MUST memiliki `SortableWalletItem` dan `MenuActions` sebagai komponen terpisah di `src/features/wallets/components/`.
- **FR-009**: System MUST memiliki varian Sidebar (desktop-collapsed, desktop-expanded, mobile) masing-masing di komponen terpisah.
- **FR-010**: System MUST menambah unit test untuk `goalProgress.ts` edge cases.
- **FR-011**: System MUST menambah integration test untuk wallet transfer API (fee calculation, balance validation).
- **FR-012**: Semua test existing MUST tetap pass setelah refaktor.

### Key Entities

- **ApiClient**: HTTP client terstandarisasi — method (`get`, `post`, `patch`, `delete`), generic typing `<T>`, error transformation (`ApiError` class)
- **AppError**: Base error class dengan `code` (machine-readable) dan `message` (human-readable) — digunakan di semua API route
- **QueryCache**: Cache entries untuk data yang di-fetch via React Query — wallet list, category list, dashboard data

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: DashboardView.tsx berkurang dari ~2700 baris menjadi <300 baris (89% reduction).
- **SC-002**: Tidak ada lagi definisi `buildApiError` atau `readError` yang duplikat — total 0 duplikasi (sebelumnya 5+ duplikat).
- **SC-003**: Wallet route POST handler berkurang dari ~120 baris validasi inline menjadi <20 baris (pakai shared validator).
- **SC-004**: `npm test` passing dengan coverage ≥ existing (existing sebagai baseline).
- **SC-005**: WalletsList.tsx berkurang dari 903 baris menjadi <200 baris.
- **SC-006**: Sidebar.tsx berkurang dari 744 baris menjadi <200 baris (main file).
- **SC-007**: User bisa navigasi antar halaman tanpa re-fetch data yang sudah ada di cache (verifikasi via browser DevTools Network tab).
- **SC-008**: Semua file yang di-refaktor lulus ESLint tanpa warning baru.

## Assumptions

- React Query v5 (`@tanstack/react-query`) akan digunakan sebagai caching library — sudah mature, dokumentasi baik, dan kompatibel dengan React 19.
- Backend API tidak berubah — hanya struktur kode internal yang di-refaktor. API contract tetap sama.
- Prisma schema tidak berubah — tidak ada migrasi database yang diperlukan.
- Tidak ada perubahan UI/UX — refaktor murni struktural, user tidak melihat perbedaan.
- Semua pekerjaan dilakukan di branch `001-refactor-maintainability`, merge ke `main` setelah semua task selesai dan verified.
- Test existing menggunakan Jest mock Prisma — pattern yang sama dipertahankan untuk test baru.
