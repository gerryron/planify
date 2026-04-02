# Planify

Planify is a personal finance application built with Next.js + Prisma + PostgreSQL.

## Key Features

- **Monthly Budget** — planning with reorder and carry-over support
- **Cash Log** — daily transaction tracking with wallet/category integration
- **Wallets** — three wallet types (Basic, Goal, Credit Card) with drag-and-drop reordering
  - **Basic Wallet** — simple balance tracking with include/exclude from total
  - **Goal Wallet** — savings target with timeline tracking, status (on-track / at-risk / overdue / achieved), and withdrawal lock until goal is met
  - **Credit Card** — outstanding balance tracking with credit limit, utilization bar, statement day, and due day
  - **Transfer** — inter-wallet transfer with optional fee (sender/receiver pays), goal wallet lock enforcement, and credit limit validation
- **Categories** — hierarchical parent-child structure with system defaults and user-scoped entries
- **Dashboard** — financial summary overview
- **Settings** — data purge and offline queue diagnostics
- **Responsive Layout** — mobile-first design with collapsible sidebar
- **PWA** — installable app, offline fallback page, service worker caching
- **Offline Queue** — API write mutations queued offline and replayed on reconnect

## Prerequisites

- Node.js 20+
- Local PostgreSQL (for development)

## Environment

This project uses the following env files:

- `.env` for local development
- `.env.example` as a template for local/deploy

Main variable example:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/planify?schema=public"
NODE_ENV="development"
JWT_SECRET="change-this-to-a-long-random-secret"
SUPERADMIN_EMAIL="superadmin@planify.local"
SUPERADMIN_PASSWORD="change-this-superadmin-password"
SUPERADMIN_NAME="Super Admin"
```

For production deployment:

```env
DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@DB_HOST:5432/planify?schema=public&sslmode=require"
NODE_ENV="production"
JWT_SECRET="long-random-production-secret"
SUPERADMIN_EMAIL="admin@yourdomain.com"
SUPERADMIN_PASSWORD="strong-production-admin-password"
SUPERADMIN_NAME="Production Admin"
```

Admin bootstrap notes:

- On first app launch, Planify will auto-create/update one superadmin account from `SUPERADMIN_EMAIL` and `SUPERADMIN_PASSWORD`.
- If `SUPERADMIN_PASSWORD` changes on redeploy, superadmin-owned finance data is cleared and credentials are updated automatically.
- Any legacy user (`legacy.user@planify.local`) and other superadmin accounts are cleaned up automatically.
- Keep the superadmin password in environment variables only.

## First-Time Local Setup

1. Install dependencies

```bash
npm install
```

2. Make sure the `planify` database already exists in local PostgreSQL.

3. Run migration and Prisma generate:

```bash
npm run db:setup:local
```

4. Run the application:

```bash
npm run dev
```

The app will run on:

- Next.js: http://localhost:3000
- Swagger UI: http://localhost:3010

Notes:

- Swagger UI is intended for development workflow and is linked from sidebar only in `NODE_ENV=development`.
- OpenAPI JSON spec is available at `GET /api/swagger`.

## Build and Run in Production

1. Make sure the production `DATABASE_URL` is set in your server environment.
2. Apply migration in the deployment environment:

```bash
npm run db:setup:deploy
```

3. Build the application:

```bash
npm run build
```

4. Start the application:

```bash
npm run start
```

## PWA and Offline Behavior

- Manifest is provided by `src/app/manifest.ts`.
- Service worker is served from `public/sw.js` and registered in production mode.
- Offline fallback page is available at `/offline`.
- API write requests (`POST`, `PUT`, `PATCH`, `DELETE` to `/api/*`) are queued offline and replayed when online.
- Queue diagnostics are available in Settings (pending count, sync now, failed sync history).
- Manual install button is available on mobile; iOS Safari shows Add to Home Screen hint.

## Important Scripts

- `npm run db:generate` generate Prisma client
- `npm run db:migrate:deploy` apply migration
- `npm run db:setup:local` migration + prisma generate
- `npm run db:setup:deploy` migration + generate for deploy server
- `npm run dev` run Next + Swagger helper process for local development
- `npm test` run all tests
- `npm test -- --coverage` run tests with coverage report

## Project Structure

```
src/
├── app/                  # Next.js App Router pages and API routes
│   ├── api/              # REST API endpoints
│   │   ├── cash-log/     # Cash log CRUD
│   │   ├── wallets/      # Wallet CRUD + transfer
│   │   ├── categories/   # Category CRUD
│   │   ├── monthly-budget/ # Budget CRUD
│   │   └── ...
│   └── ...               # Page components
├── core/                 # Shared infrastructure
│   ├── auth/             # JWT session, password hashing, middleware
│   ├── db/               # Prisma client singleton
│   └── http/             # API response helpers
├── features/             # Feature modules (components, services, types, utils)
│   ├── wallets/
│   ├── cash-log/
│   ├── categories/
│   ├── monthly-budget/
│   ├── dashboard/
│   └── ...
├── shared/               # Cross-feature UI (layout, theme, PWA)
└── lib/                  # OpenAPI spec
prisma/
├── schema.prisma         # Database schema
└── migrations/           # SQL migrations
```

## Testing

Tests use Jest with ts-jest. Test files are co-located with their source files (e.g., `route.test.ts` next to `route.ts`).

```bash
# Run all tests
npm test

# Run specific test file
npx jest src/features/wallets/utils/goalProgress.test.ts

# Run with coverage
npm test -- --coverage
```
