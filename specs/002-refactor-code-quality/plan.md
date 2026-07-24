# Implementation Plan: Refaktor Code Quality & Konsistensi Planify

**Branch**: `002-refactor-code-quality` | **Date**: 2026-07-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-refactor-code-quality/spec.md`

## Summary

Refaktor struktural lanjutan Planify dengan 10 user story. Tiga pilar utama:

1. **Backend consistency** (US1-US3): Eliminasi duplikasi fungsi route, selesaikan migrasi `apiClient`, seragamkan error handling `handleApiError`.
2. **Design system adoption** (US4-US5, US8): Integrasi shadcn/ui menggantikan MUI + custom form CSS, migrasi icon ke lucide-react, SweetAlert2 ke Sonner, dark mode ke CSS variables.
3. **Code quality** (US6-US7, US9-US10): Shared utilities, generalisasi MenuActions, pecah 7 file besar, tambah test coverage core modules.

Technical approach: Incremental per user story, setiap story independent dan bisa di-merge tanpa menunggu story lain. shadcn/ui (US4) dikerjakan paling awal di P1 karena menjadi foundation untuk story frontend lainnya.

## Technical Context

**Language/Version**: TypeScript 5 (strict mode), Node.js 20+

**Primary Dependencies**: Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui (NEW), lucide-react (NEW), Sonner (NEW), Prisma 7, @tanstack/react-query 5, Jest 30, ts-jest 29

**Storage**: PostgreSQL via Prisma 7 (no schema changes)

**Testing**: Jest 30 + ts-jest 29 (mock Prisma at module level), React Testing Library (for hook tests)

**Target Platform**: Web application — Linux/Windows server, modern browsers (Chrome, Firefox, Safari, Edge)

**Project Type**: Web application (Next.js App Router, SSR + client components)

**Performance Goals**: No performance regression from current baseline. Bundle size reduction expected from removing MUI + Emotion + SweetAlert2 (~100KB gzipped).

**Constraints**:
- No API contract changes (route behavior identical)
- No database schema changes (Prisma schema unchanged)
- No visible UI/UX changes (refactor is structural)
- All existing tests must continue to pass
- `npm run build` and `npm run lint` must succeed after each phase

**Scale/Scope**: ~60 source files modified, 5 packages removed, 4 packages added, 10 user stories, 36 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-Based Modularity | ✅ PASS | shadcn/ui components → `src/components/ui/` (cross-cutting, equivalent to `src/shared/`). Shared utilities → `src/shared/utils/`. Icon migration → drop-in replacement, no structure change. |
| II. Type Safety First | ✅ PASS | All new components must have explicit prop interfaces. lucide-react is fully typed. shadcn/ui components are TypeScript-native. |
| III. API Route Consistency | ✅ PASS | US1-US3 directly improve route consistency — shared `toId()`, `handleApiError()` everywhere, `requireAuth()` at `auth/me`. |
| IV. Component Discipline | ✅ PASS | US9 targets 7 files to <300 lines. shadcn/ui naturally encourages small components. |
| V. Test Coverage (API Routes) | ✅ PASS | US10 adds tests for core/http (0% → ≥80%), dashboardCharts utilities, and React Query hooks. |
| VI. Documentation-Driven Development | ✅ FOLLOWED | Spec → Plan → Tasks workflow being followed. |

**Gate Result**: ALL PASS. No violations requiring complexity tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-refactor-code-quality/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/                    # API route handlers (US1, US3)
│   │   ├── auth/               # login, register, logout, me
│   │   ├── cash-log/
│   │   ├── categories/
│   │   ├── monthly-budget/
│   │   ├── wallets/            # + transfer/
│   │   ├── settings/           # + purge/
│   │   └── superadmin/users/   # + approve, deactivate
│   ├── layout.tsx               # Root layout (US5: SonnerProvider, US8: theme)
│   ├── globals.css              # US8: CSS variables migration
│   └── (pages)/                 # home, wallets, cash-log, categories, monthly-budget, settings, superadmin
├── components/
│   └── ui/                      # US4: shadcn/ui components (Button, Input, Select, Card, Dialog, DropdownMenu, Sheet, Checkbox, Label, AlertDialog, Textarea)
├── core/
│   └── http/                    # US10: apiClient.ts, apiErrors.ts, apiResponse.ts + tests
├── features/
│   ├── auth/services/           # US2: authService.logout() → apiClient
│   ├── cash-log/components/     # US4, US7, US9: CashLogForm, CashLogList
│   ├── categories/components/   # US4, US7, US9: CategoryForm, CategoryList
│   ├── dashboard/
│   │   ├── components/          # US4, US9: DashboardView, DashboardMonthlyView, etc.
│   │   ├── hooks/               # US9: useDashboardData → multiple hooks
│   │   └── utils/               # US10: dashboardCharts.ts + test
│   ├── monthly-budget/components/  # US4, US7, US9
│   ├── settings/components/     # US4, US9: SettingsDataResetPanel
│   ├── superadmin/services/     # US2: superadminService → apiClient
│   └── wallets/
│       ├── components/          # US4, US7, US9: WalletsForm, WalletTransferForm, MenuActions, WalletsList
│       ├── hooks/               # US10: useWallets + test
│       └── utils/               # US1: getWalletDelta, assertCreditLimit
├── shared/
│   ├── layout/                  # Sidebar components (existing)
│   ├── ui/                      # (deprecated after US4 — replaced by src/components/ui/)
│   ├── utils/                   # US6: currency.ts, dateFormat.ts, validation.ts, routeHelpers.ts
│   ├── providers/               # QueryProvider (existing)
│   ├── pwa/                     # PWA (existing)
│   └── theme/                   # US8: ThemeProvider updated for CSS variables
└── lib/
    ├── openapi/                  # US9: openapi.ts split into schemas, paths, responses
    ├── queryClient.ts           # (existing)
    └── utils.ts                  # US4: cn() helper from shadcn/ui init
```

**Structure Decision**: Existing Next.js App Router structure maintained. New `src/components/ui/` directory for shadcn/ui components. `src/shared/utils/` expanded with new utility modules.

## Complexity Tracking

*No violations. All gates pass.*
