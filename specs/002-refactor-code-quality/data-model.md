# Data Model: Refaktor Code Quality & Konsistensi Planify

**Feature**: `002-refactor-code-quality`
**Date**: 2026-07-24

> **Note**: Ini adalah refactoring spec — tidak ada perubahan database schema atau API contract. "Data model" di sini mendokumentasikan struktur modul yang dibuat/diubah.

## Module Structure

### 1. Shared Utilities (`src/shared/utils/`)

| Module | Exports | Used By |
|--------|---------|---------|
| `routeHelpers.ts` | `toId(value: unknown): number \| null`, `toNumber(value: unknown): number \| null` | All API route handlers (5 route files) |
| `validation.ts` | `isValidEmail(value: string): boolean` | `auth/login/route.ts`, `auth/register/route.ts` |
| `currency.ts` | `formatRupiah(amount: number, options?: { compact?: boolean }): string` | All frontend components (13+ locations) |
| `dateFormat.ts` | `monthLabel(yyyyMM: string): string`, `shortMonthLabel(yyyyMM: string): string`, `shiftMonth(base: Date, offset: number): string`, `todayIsoDate(): string`, `toIsoDate(date: Date): string` | Dashboard, CashLogList, MonthlyBudgetList, Forms |

### 2. Wallet Utilities (`src/features/wallets/utils/`)

| Module | Exports | Used By |
|--------|---------|---------|
| `walletDelta.ts` (new) | `getWalletDelta(amount, type, walletKind): number` | `cash-log/route.ts`, `wallets/transfer/route.ts` |
| `creditLimit.ts` (new) | `assertCreditLimit(nextBalance, walletKind, creditLimit): void` | `cash-log/route.ts`, `wallets/transfer/route.ts` |
| `validation.ts` (existing) | `validateWalletFields(input): ValidationResult` | `wallets/route.ts` POST/PATCH |
| `goalProgress.ts` (existing) | `computeGoalProgress(...)` | GoalTrackingModal |
| `sortWallets.ts` (existing) | `buildNextWallets(...)` | WalletsList, useWalletDragDrop |

### 3. shadcn/ui Components (`src/components/ui/`)

Installed via `npx shadcn@latest add`:

| Component | Radix UI Underlying | Primary Use |
|-----------|-------------------|-------------|
| `button.tsx` | @radix-ui/react-slot | All form submissions, actions |
| `input.tsx` | — (native input) | All text/number/date inputs |
| `select.tsx` | @radix-ui/react-select | All dropdown selects |
| `textarea.tsx` | — (native textarea) | Notes/description fields |
| `checkbox.tsx` | @radix-ui/react-checkbox | Settings toggles, reset panel |
| `label.tsx` | @radix-ui/react-label | Form field labels |
| `card.tsx` | — (div + styles) | List containers, dashboard cards |
| `dialog.tsx` | @radix-ui/react-dialog | Form modals (goal tracking, transfer) |
| `dropdown-menu.tsx` | @radix-ui/react-dropdown-menu | MenuActions, user menus |
| `sheet.tsx` | @radix-ui/react-dialog | Mobile sidebar |
| `alert-dialog.tsx` | @radix-ui/react-alert-dialog | Delete/approve/deactivate confirmations |

### 4. Sonner Toast (`src/app/layout.tsx`)

```typescript
// Root layout
import { Toaster } from 'sonner';

<Toaster position="bottom-right" richColors theme="system" />
```

### 5. CSS Variables Theme (`src/app/globals.css`)

**Variables defined**:
```css
:root {
  --background: #f0fdf4;     /* emerald-50 */
  --foreground: #0f172a;     /* slate-900 */
  --card: #ffffff;
  --card-foreground: #0f172a;
  --primary: #059669;        /* emerald-600 */
  --primary-foreground: #ffffff;
  --muted: #f1f5f9;          /* slate-100 */
  --muted-foreground: #64748b; /* slate-500 */
  --border: #e2e8f0;         /* slate-200 */
  --ring: #059669;           /* emerald-600 */
  --radius: 0.5rem;
}

.dark {
  --background: #0f172a;     /* slate-900 */
  --foreground: #f1f5f9;     /* slate-100 */
  --card: #1e293b;           /* slate-800 */
  --card-foreground: #f1f5f9;
  --primary: #34d399;        /* emerald-400 */
  --primary-foreground: #0f172a;
  --muted: #1e293b;          /* slate-800 */
  --muted-foreground: #94a3b8; /* slate-400 */
  --border: #334155;         /* slate-700 */
  --ring: #34d399;           /* emerald-400 */
}
```

### 6. Test Modules (new)

| Test File | Tests |
|-----------|-------|
| `src/core/http/apiResponse.test.ts` | 6 helpers: `ok()`, `badRequest()`, `notFound()`, `unauthorized()`, `forbidden()`, `serverError()` |
| `src/core/http/apiErrors.test.ts` | 5 error classes + `handleApiError` dispatch logic |
| `src/core/http/apiClient.test.ts` | GET/POST/PATCH/DELETE success + error response + network error |
| `src/features/dashboard/utils/dashboardCharts.test.ts` | 11 functions: `formatCurrency`, `formatCompact`, `monthLabel`, `shortMonthLabel`, `toIsoDate`, `getNextDueDate`, `buildTop5WithOther`, `calcIncome`, `calcOutcome`, `getRecentMonths`, `getMonthLogs` |
| `src/features/wallets/hooks/useWallets.test.ts` | useQuery wrapper: loading, success, error states |
| `src/features/categories/hooks/useCategories.test.ts` | useQuery wrapper |
| `src/features/cash-log/hooks/useCashLogs.test.ts` | useQuery + useMutation |
| `src/features/monthly-budget/hooks/useMonthlyBudgets.test.ts` | useQuery + useMutation |

## Dependency Graph (Removal)

```
BEFORE:
├── @mui/material (UNUSED — transitive only)
├── @mui/icons-material (50+ imports in 15 files)
├── @emotion/react (MUI peer dep)
├── @emotion/styled (MUI peer dep)
└── sweetalert2 (~10 usages in form components)

AFTER:
├── lucide-react (replaces @mui/icons-material)
├── sonner (replaces SweetAlert2 for toasts)
├── shadcn/ui components (replaces custom form CSS + MUI components)
└── (no emotion, no MUI, no sweetalert2)
```
