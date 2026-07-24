# Quickstart: Validasi Refaktor Code Quality

**Feature**: `002-refactor-code-quality`
**Date**: 2026-07-24

Panduan validasi untuk memverifikasi refactoring di setiap phase.

## Prerequisites

- Node.js 20+ terinstall
- PostgreSQL running (untuk integration test)
- `.env` configured dengan `DATABASE_URL`

```bash
npm install
npm run db:setup:local
```

## Phase-by-Phase Validation

### Phase 1: Setup (Foundation)

```bash
# Pastikan environment berjalan
npm run dev &
# Cek di browser: http://localhost:3000

# Run existing tests — harus semua pass
npm test
```

### Phase 2: US1 — Eliminasi Duplikasi Route

```bash
# Verifikasi fungsi toId hanya ada di satu file
grep -r "function toId" src/ | grep -v "node_modules" | grep -v ".test."
# Expected: hanya src/shared/utils/routeHelpers.ts

# Test
npm test
# Expected: semua test pass, termasuk wallet/cash-log/budget route tests
```

### Phase 3: US2 — Selesaikan Migrasi API Client

```bash
# Verifikasi tidak ada fetch() di service files
grep -r "fetch(" src/features/*/services/
# Expected: tidak ada hasil

# Verifikasi tidak ada readError di luar apiClient.ts
grep -r "readError" src/features/
# Expected: tidak ada hasil

# Test superadmin page
npm run dev &
# Buka http://localhost:3000/superadmin
# Expected: user list ter-load normal
```

### Phase 4: US3 — Seragamkan Error Handling

```bash
# Verifikasi semua route handler pakai handleApiError
grep -r "handleApiError" src/app/api/
# Expected: setiap route.ts muncul

# Trigger error manual
curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{}'
# Expected: { "error": "..." } — format konsisten
```

### Phase 5: US4 — Integrasi shadcn/ui

```bash
# Init shadcn/ui
npx shadcn@latest init --css src/app/globals.css --base-color emerald

# Install komponen yang dibutuhkan
npx shadcn@latest add button input select textarea card dialog dropdown-menu sheet checkbox label alert-dialog

# Install icon + toast libraries
npm install lucide-react sonner

# Build — pastikan tidak ada error
npm run build

# Dev server — pastikan semua halaman render
npm run dev &
# Buka semua halaman: /home, /wallets, /cash-log, /categories, /monthly-budget, /settings, /superadmin
# Verifikasi: tidak ada visual regression
```

### Phase 6: US5 — SweetAlert2 → Sonner

```bash
# Verifikasi tidak ada Swal.fire()
grep -r "Swal" src/
# Expected: tidak ada hasil (setelah migrasi)

# Test form submission
# Buka /wallets → create wallet → verifikasi toast sukses muncul
# Buka /settings → purge data → verifikasi AlertDialog konfirmasi muncul

# Hapus sweetalert2
npm uninstall sweetalert2
npm run build
# Expected: build sukses
```

### Phase 7: US6 — Shared Utilities

```bash
# Verifikasi formatRupiah digunakan di semua tempat
grep -r "toLocaleString('id-ID')" src/
# Expected: tidak ada hasil untuk currency formatting

# Verifikasi monthLabel shared
grep -r "function monthLabel" src/
# Expected: hanya src/shared/utils/dateFormat.ts

# Verifikasi shiftMonth shared
grep -r "function shiftMonth" src/
# Expected: hanya src/shared/utils/dateFormat.ts

# Test unit
npm test -- --testPathPattern="dateFormat|currency|validation"
```

### Phase 8: US7 — MenuActions + DropdownMenu

```bash
# Verifikasi tidak ada MenuActions lokal di list components
grep -r "function MenuActions" src/features/cash-log/
grep -r "function MenuActions" src/features/monthly-budget/
grep -r "function MenuActions" src/features/categories/
# Expected: tidak ada hasil (semua pakai shared MenuActions)

# Test interaksi
npm run dev &
# Buka /cash-log → klik MoreVert → verifikasi dropdown muncul
# Buka /categories → klik MoreVert → verifikasi dropdown muncul
# Keyboard test: Arrow keys + Enter + Escape
```

### Phase 9: US8 — Dark Mode CSS Variables

```bash
# Verifikasi CSS variables ada di globals.css
grep -E "^  --" src/app/globals.css
# Expected: list CSS variables (background, foreground, primary, dll)

# Verifikasi body.theme-dark sudah dihapus
grep "body.theme-dark" src/app/globals.css
# Expected: tidak ada hasil

# Toggle dark mode
npm run dev &
# Buka http://localhost:3000 → toggle dark mode
# Verifikasi: semua komponen ikut berubah tema, tidak ada yang broken
```

### Phase 10: US9 — Pecah File Besar

```bash
# Cek ukuran file setelah refactor
wc -l src/features/dashboard/hooks/useDashboardData.ts
wc -l src/features/settings/components/SettingsDataResetPanel.tsx
wc -l src/features/monthly-budget/components/MonthlyBudgetList.tsx
wc -l src/features/cash-log/components/CashLogList.tsx
wc -l src/features/wallets/components/WalletTransferForm.tsx
wc -l src/features/wallets/components/WalletsForm.tsx
wc -l src/lib/openapi.ts
# Expected: semua < 300 baris

# Build + test
npm run build && npm test
# Expected: sukses, tidak ada perubahan behavior
```

### Phase 11: US10 — Test Coverage

```bash
# Run full test suite dengan coverage
npm test -- --coverage

# Verifikasi coverage target
# Expected:
#   src/core/http/     ≥ 80%
#   src/features/dashboard/utils/dashboardCharts.ts  ≥ 80%
#   Semua test pass

# Lint
npm run lint
# Expected: 0 warnings baru
```

## Final Validation (Semua Phase Selesai)

```bash
# Clean install
rm -rf node_modules
npm install

# Build production
npm run build
# Expected: BUILD SUCCESSFUL

# Test
npm test
# Expected: semua test pass, coverage meningkat

# Lint
npm run lint
# Expected: 0 warnings

# Dependency check
npm ls @mui/material @mui/icons-material @emotion/react @emotion/styled sweetalert2
# Expected: kelima paket "not found" (sudah dihapus)

# Manual smoke test
npm run dev &
# Buka semua halaman:
# /home → dashboard render
# /wallets → list + drag-and-drop + create/edit/delete wallet
# /cash-log → list + filter month + create/edit/delete entry
# /categories → list + create/edit/delete category
# /monthly-budget → list + drag-and-drop + create/edit/delete budget
# /settings → data reset panel + dark mode toggle
# /superadmin → user list + approve/deactivate

# Verifikasi dark mode
# Toggle dark mode → semua halaman berubah tema
# Refresh browser → tema bertahan (localStorage persistence)

# Verifikasi notifikasi
# Create wallet → toast sukses di pojok kanan bawah
# Delete wallet → AlertDialog konfirmasi → toast sukses setelah hapus

# Verifikasi cache
# Buka /home → buka /wallets → Network tab tidak ada GET /api/wallets baru
```
