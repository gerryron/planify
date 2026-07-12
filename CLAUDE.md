# CLAUDE.md

Planify context for Claude Code — tech stack, conventions, and workflow.

## Stack

- **Framework**: Next.js 16 (App Router) with TypeScript 5 strict
- **Database**: PostgreSQL via Prisma 7 (`prisma.config.ts`, schema at `prisma/schema.prisma`)
- **Frontend**: React 19, Tailwind CSS 4, MUI 7 (icons only), Recharts 3, @dnd-kit 6
- **Auth**: JWT via `planify_auth_token` cookie (HS256, 7-day TTL, httpOnly)
- **Testing**: Jest 30 + ts-jest 29 (mock Prisma at module level)
- **Specs**: GitHub Spec-Kit (`/speckit.*` slash commands)

## Project Structure

```text
src/
├── app/          → Next.js App Router pages + API routes
│   ├── page.tsx  → entry point (AuthEntryPage, mode='login')
│   ├── layout.tsx → root layout (ThemeProvider, PWA, QueryClientProvider)
│   └── api/      → route handlers (auth, wallets, cash-log, monthly-budget, categories, settings, superadmin)
├── core/         → cross-cutting infrastructure (auth, db, http)
├── features/     → domain modules (wallets, cash-log, dashboard, monthly-budget, categories, auth, settings)
│   └── <name>/
│       ├── components/  → UI components
│       ├── services/    → API client functions (fetch wrappers)
│       ├── types/       → domain types
│       └── utils/       → pure helpers
├── shared/       → cross-feature UI (layout/Sidebar, pwa, theme)
└── lib/          → global utilities (openapi.ts, queryClient.ts)
```

## Conventions

### API Route Pattern
```typescript
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = requireAuth(req);
  if (auth.error) return auth.error;
  try {
    // validate → operate (Prisma) → respond
    return ok(result, 201);
  } catch (error) {
    if (error instanceof ValidationError) return badRequest(error.message);
    throw error; // or handleApiError(error)
  }
}
```

### Frontend Service Pattern
```typescript
import { apiClient } from '@/core/http/apiClient';

export const walletsService = {
  getAll: () => apiClient.get<Wallet[]>('/api/wallets'),
  create: (data: CreateWalletInput) => apiClient.post<Wallet>('/api/wallets', data),
};
```

### Component Discipline
- Files < 300 lines; extract sub-components or hooks when over
- Pages (`page.tsx`) compose only — data fetching in custom hooks
- `'use client'` directive for interactive components
- Props interfaces required, no implicit `any`

### Naming
- `PascalCase` for components, `camelCase` for functions/variables
- Service files: `<feature>Service.ts`
- Type files: `types.ts`
- Route files: `route.ts`

## Key Patterns

- **Error handling**: Use `AppError` hierarchy from `@/core/http/apiErrors` (not string matching)
- **HTTP client**: Singleton `apiClient` from `@/core/http/apiClient` (not per-service fetch)
- **Data caching**: React Query via custom hooks (`useWallets`, `useCategories`, etc.)
- **Auth guard**: `requireAuth(req)` at top of every API route handler
- **Transactions**: Use `prisma.$transaction` for multi-record writes (wallet balance + cash log)

## Spec-Kit Workflow

For new features or major changes:

1. `/speckit.specify` — define what & why
2. `/speckit.plan` — define how (tech approach)
3. `/speckit.tasks` — break into actionable tasks
4. `/speckit.implement` — execute

Documentation:
- `specs/` — living specs & development roadmap
- `docs/` — static technical reference
- `.specify/memory/constitution.md` — project principles

## Useful Commands

```bash
npm run dev              # Next.js + Swagger (ports 3000, 3010)
npm run dev:next         # Next.js only
npm test                 # Jest
npm test -- --coverage   # with coverage
npm run lint             # ESLint
npm run db:setup:local   # Prisma migrate + generate
npm run build            # Production build
```
