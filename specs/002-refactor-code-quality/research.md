# Research: Refaktor Code Quality & Konsistensi Planify

**Feature**: `002-refactor-code-quality`
**Date**: 2026-07-24

## 1. shadcn/ui + Tailwind v4 + Next.js 16 Setup

### Decision

Gunakan `npx shadcn@latest init` dengan konfigurasi:
- Base color: `emerald` (match existing theme `bg-emerald-600`)
- CSS variables: `yes` (enable dark mode via CSS custom properties)
- Style: `default`
- Radius: `0.5rem`
- Tailwind v4: supported by shadcn/ui latest

### Rationale

- shadcn/ui v5+ supports Tailwind v4 via `@theme inline` in `globals.css`
- Tidak perlu `tailwind.config.js` update (Tailwind v4 uses CSS-based config)
- Komponen di-copy ke `src/components/ui/` — full control, bisa dikustomisasi
- Tidak ada runtime dependency (bukan npm package, melainkan source code yang di-copy)

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Mantine UI | Terlalu berat, menggantikan terlalu banyak. shadcn/ui lebih minimalis dan incremental. |
| Headless UI (Tailwind Labs) | Mirip dengan Radix (underlying shadcn/ui), tapi shadcn/ui menyediakan styling out-of-box. |
| Tetap custom CSS | Tidak scalable — 20+ lokasi duplikasi className Tailwind. |
| Tailwind CSS 3 downgrade | Tidak perlu — shadcn/ui sudah support v4. |

### Setup Steps

1. `npx shadcn@latest init` — creates `components.json`, updates `globals.css` with CSS variables
2. `npx shadcn@latest add button input select textarea card dialog dropdown-menu sheet checkbox label alert-dialog` — install components
3. `npm install lucide-react sonner` — icons + toast
4. Verify `npm run dev` works with shadcn/ui components available

---

## 2. MUI Icon → lucide-react Migration Mapping

### Decision

Buat mapping table, migrasi 50+ icon import di 15 file ke lucide-react equivalents.

### Rationale

- lucide-react adalah default icon library shadcn/ui — fully typed, tree-shakeable
- Nama icon mirip dengan MUI (keduanya berbasis Material Design icon set)
- Size default sama (24px)

### Key Mappings (>80% direct equivalents)

| MUI Icon | lucide-react | Notes |
|----------|-------------|-------|
| `LockIcon` | `Lock` | Identical |
| `LockOpenIcon` | `LockOpen` | Identical |
| `MoreVertIcon` | `EllipsisVertical` | Different name, same icon |
| `EditIcon` | `Pencil` | Different name, same concept |
| `DeleteIcon` | `Trash2` | Different name, same concept |
| `AutorenewIcon` | `RefreshCw` with `animate-spin` | Same spinner animation |
| `CloseIcon` | `X` | Identical |
| `MenuIcon` | `Menu` | Identical |
| `HomeIcon` | `Home` | Identical |
| `AccountBalanceWalletIcon` | `Wallet` | Similar |
| `CalendarMonthIcon` | `Calendar` | Similar |
| `TodayIcon` | `CalendarDays` | Similar |
| `CategoryIcon` | `LayoutGrid` | Similar |
| `SettingsIcon` | `Settings` | Identical |
| `AdminPanelSettingsIcon` | `Shield` | Similar |
| `DescriptionIcon` | `FileText` | Similar |
| `WbSunnyIcon` | `Sun` | Similar |
| `NightlightIcon` | `Moon` | Similar |
| `KeyboardDoubleArrowLeftIcon` | `PanelLeftClose` | Similar |
| `DownloadForOfflineIcon` | `Download` | Similar |
| `DragIndicatorIcon` | `GripVertical` | Different name, same icon |
| `TrackChangesIcon` | `Target` | Similar |
| `SwapHorizIcon` | `ArrowLeftRight` | Different name, same icon |
| `TrendingUpIcon` | `TrendingUp` | Identical |
| `TrendingDownIcon` | `TrendingDown` | Identical |
| `ReceiptLongIcon` | `Receipt` | Similar |
| `SavingsIcon` | `PiggyBank` | Similar |
| `NavigateBeforeIcon` | `ChevronLeft` | Similar |
| `NavigateNextIcon` | `ChevronRight` | Similar |

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Tetap MUI icons saja | Tidak bisa — shadcn/ui tidak depend pada MUI. Ingin menghapus MUI dependency sepenuhnya. |
| react-icons (Feather subset) | lucide-react lebih terintegrasi dengan shadcn/ui ecosystem |
| @radix-ui/react-icons | Icon set terlalu kecil, tidak cover semua use case Planify |

---

## 3. SweetAlert2 → Sonner + shadcn/ui AlertDialog Migration

### Decision

- **Toast notifications** (success/error/info): Gunakan Sonner `toast()` — ringan, auto-dismiss, stackable
- **Confirmation dialogs** (delete, approve, deactivate): Gunakan shadcn/ui `AlertDialog` — accessible, cancel/confirm pattern
- Hapus `sweetalert2` dari dependencies

### Rationale

- SweetAlert2 (~40KB gzipped) adalah dependency terbesar yang tidak terkait UI inti
- Sonner adalah toast library standar untuk shadcn/ui ecosystem (~4KB)
- shadcn/ui `AlertDialog` dibangun di atas Radix UI — accessible, keyboard-friendly
- UX improvement: toast tidak memblokir layar seperti modal SweetAlert2

### Migration Pattern

**Sebelum (SweetAlert2)**:
```typescript
await Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1200, showConfirmButton: false });
```

**Sesudah (Sonner)**:
```typescript
import { toast } from 'sonner';
toast.success('Berhasil');
```

**Sebelum (SweetAlert2 confirmation)**:
```typescript
const result = await Swal.fire({ title: 'Hapus?', showCancelButton: true, confirmButtonColor: '#dc2626' });
if (result.isConfirmed) { await service.delete(id); }
```

**Sesudah (AlertDialog)**:
```tsx
<AlertDialog>
  <AlertDialogTrigger>Delete</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Hapus?</AlertDialogTitle>
    <AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
    <AlertDialogCancel>Batal</AlertDialogCancel>
    <AlertDialogAction onClick={() => service.delete(id)}>Hapus</AlertDialogAction>
  </AlertDialogContent>
</AlertDialog>
```

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| react-hot-toast | Sonner lebih terintegrasi dengan shadcn/ui ecosystem |
| Tetap SweetAlert2 | User meminta full shadcn/ui adoption |
| shadcn/ui Toast (useToast) | Sonner lebih mature, lebih ringan, tidak perlu bikin komponen toast sendiri |

---

## 4. Dark Mode: Class-Based → CSS Variables Migration

### Decision

Migrasi dari sistem dark mode manual (class `.dark` + `body.theme-dark` + custom CSS di `globals.css`) ke CSS variables shadcn/ui.

### Rationale

- CSS variables adalah native browser feature — performa lebih baik daripada toggle class manual
- shadcn/ui components otomatis mengikuti CSS variables — tidak perlu custom styling per komponen
- `globals.css` bisa dikurangi ~40 baris custom CSS dark mode
- `next-themes` (opsional) bisa digunakan untuk SSR-safe theme persistence

### Approach

**Step 1**: Setup CSS variables di `globals.css`:
```css
@import 'tailwindcss';

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-primary: var(--primary);
  /* ... shadcn/ui theme variables */
}

:root {
  --background: #ffffff;
  --foreground: #0f172a;
  --card: #ffffff;
  --primary: #059669; /* emerald-600 */
  /* ... */
}

.dark {
  --background: #0f172a; /* slate-900 */
  --foreground: #f1f5f9; /* slate-100 */
  --card: #1e293b; /* slate-800 */
  --primary: #34d399; /* emerald-400 */
  /* ... */
}
```

**Step 2**: Update `ThemeProvider` untuk toggle class `dark` di `<html>` (bukan `body.theme-dark`).

**Step 3**: Hapus custom CSS rule `body.theme-dark` dan `.dark input[type='date']` secara bertahap.

### Alternatives Considered

| Alternative | Why Rejected |
|-------------|--------------|
| Tetap class-based | CSS variables adalah standard shadcn/ui — tidak kompatibel jika tetap class-based |
| next-themes | Opsional — bisa ditambahkan nanti. Cukup toggle class `dark` manual dulu. |
| data-theme attribute | Class `dark` lebih umum dan didukung semua komponen shadcn/ui |

---

## 5. File Splitting Strategy for Large Files

### Decision

Pecah file dengan pendekatan: extract by responsibility, bukan by line count.

### Rationale

Setiap file besar punya "tanggung jawab" berbeda yang bisa diekstrak:

| File | Baris | Strategy |
|------|-------|----------|
| `useDashboardData.ts` | 1062 | Split into: `useMonthlyOverview`, `useSummaryCards`, `useChartData`, `useDashboardFilters` |
| `SettingsDataResetPanel.tsx` | 672 | Extract: `ResetCheckboxGroup`, `ResetConfirmationDialog`, `ResetProgressIndicator` |
| `MonthlyBudgetList.tsx` | 639 | Extract: `BudgetItem`, `BudgetFilterBar`, `BudgetDragHandle` |
| `CashLogList.tsx` | 556 | Extract: `CashLogItem`, `CashLogFilterBar` |
| `WalletTransferForm.tsx` | 522 | Extract: `SourceWalletStep`, `DestinationWalletStep`, `TransferFeeDisplay` |
| `WalletsForm.tsx` | 483 | Extract: `StandardWalletFields`, `GoalWalletFields`, `CreditCardFields` per wallet kind |
| `openapi.ts` | 1136 | Split into: `openapi/schemas/`, `openapi/paths/`, `openapi/responses.ts`, barrel export |

### Key Principle
Extract sub-components/hooks so main file becomes a composer (like DashboardView was in spec 001).

---

## 6. Test Strategy for Core Modules

### Decision

Unit test untuk pure functions dan modules, mock-only untuk external dependencies.

### Rationale

- `apiResponse.ts` (6 functions): Pure functions returning `NextResponse` — test with plain object assertions
- `apiErrors.ts` (4 classes + `handleApiError`): Test each class instantiation and `handleApiError` dispatch
- `apiClient.ts`: Mock `global.fetch`, test URL construction, method, headers, response parsing, error handling
- `dashboardCharts.ts` (11 functions): Pure math/formatting — the easiest to test
- Hooks: Wrap with React Query `QueryClientProvider` mock, verify data flow

### Test Framework
Jest 30 + ts-jest 29 — same as existing tests.
