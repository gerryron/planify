# Planify

Planify is a personal finance application built with Next.js + Prisma + PostgreSQL.

## Key Features

- Monthly budget planning with reorder and carry-over support
- Cash log tracking with wallet/category integration
- Wallet management and transfer flow
- Category management with parent-child structure
- Responsive mobile-first layout and collapsible sidebar
- PWA support (installable app, offline fallback page, service worker caching)
- Offline write queue for API mutations with replay sync when connection recovers

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

3. Run migration and development mock seed:

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

## Re-running Dev Seed

```bash
npm run dev:clear-mock
npm run dev:seed-mock
```

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
- `npm run db:setup:local` migration + dev mock seed
- `npm run db:setup:deploy` migration + generate for deploy server
- `npm run dev` run Next + Swagger helper process for local development
