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
- `npm run cli` run the interactive Planify CLI locally
- `npm test` run all tests
- `npm test -- --coverage` run tests with coverage report

## CLI Mode

Planify now includes an interactive CLI built with Ink. The CLI is intentionally shell-first: you start it with `planify` or `npm run cli`, then run all actions inside the shell using slash commands.

### Local usage

```bash
npm run cli
```

To expose the command globally on your local machine during development:

```bash
npm link
planify
```

If the global command was removed with `npm unlink -g planify` or you are setting up a fresh terminal environment, run `npm link` again from the project root.
If dependencies were reinstalled or the CLI launcher changed, run `npm install` and then `npm link` again so the global `planify` command keeps using the current local runtime.
The global launcher always boots from the Planify project root, so `planify` keeps using the repo's TypeScript and path-alias configuration even when you invoke it from another directory.

### Available commands

- `/help` show the available commands and quick usage hints
- `/login` start interactive sign in inside the CLI shell
- `/logout` clear the local CLI session
- `/wallets` show your wallet list and tracked total balance
- `/wallets tracked` show only wallets included in the tracked total
- `/wallets excluded` show only wallets excluded from the tracked total
- `/wallets <number>` show one wallet by its displayed number
- `/wallets <name fragment>` filter wallets by name, with autocomplete suggestions and wallet previews while you type

### Authentication behavior

- CLI login follows the same account rules as the web app: the user must exist, the password must match, and the account status must be `active`.
- CLI loads the project environment files before connecting to Prisma, so it uses the same `DATABASE_URL` and `JWT_SECRET` values as the web app.
- After a successful `/login`, the CLI stores a local session file and restores it automatically on the next `planify` run.
- The session stays active until the user runs `/logout`.
- On Windows, the session file is stored under `%APPDATA%/planify/session.json`.
- If `%APPDATA%` is unavailable, Planify falls back to `~/.planify/session.json`.
- Legacy session files that still exist under `~/.planify/session.json` are read for backward compatibility, then rewritten to the current session schema and storage path.
- Planify also mirrors the latest CLI session to the legacy fallback path so session restore still works if one local storage path becomes unavailable or malformed.
- If a saved token is no longer valid, Planify clears the local session file and asks the user to login again.
- A stale invalid session discovered during startup will not wipe a newer session that is saved later in the same CLI run.

### Current scope

- The first CLI slice currently covers authentication and wallet listing only.
- Wallet totals shown in `/wallets` follow the same tracked-balance behavior as the web app by excluding wallets marked `excludeFromTotal`, and the CLI now renders a bordered wallet overview with a highlighted tracked-total metric plus stronger tracked/excluded section headers. When the terminal is wide enough, those wallet sections are shown in responsive side-by-side columns with a single-column fallback for narrower windows.
- The CLI shell keeps the prompt pinned to the bottom, while a bordered green header with the Planify title stays inside the scrollable output so it moves away naturally with long output.
- When the current output is shorter than the viewport, Planify keeps the header at the top of the output area and uses real spacer rows so the body content can sit closer to the prompt without leaving a collapsed empty gap below it.
- Commands you submit are echoed in the output with a leading `>`, a small spacer separates each command from the system response that follows, and only the first system line in each response block uses the green circle marker.
- Slash command suggestions stay hidden until you type `/`, then you can move through them with the up and down arrows before pressing Enter. Selecting `/wallets` from the top-level slash menu now fills the prompt with `/wallets` first instead of running it immediately.
- When the prompt is exactly `/wallets`, the suggestion menu now shows syntax templates first: `/wallets`, `/wallets [number]`, `/wallets [wallet name]`, and `/wallets [tracked/excluded]`. After you continue typing a filter such as `/wallets 1`, `/wallets tracked`, or a wallet name, the menu switches to matching wallet-specific suggestions with quick balance previews.
- The prompt now shows a visible cursor marker at the current typing position, including while command, email, and password input is active.
- When the output grows beyond the visible viewport, the output area stays scrollable with the keyboard and mouse wheel while the prompt remains pinned at the bottom, and the custom prompt input avoids leaking mouse-wheel escape text into the command line.
- When the terminal window is resized after minimize or maximize, the CLI recalculates its output viewport and prompt borders immediately without requiring a scroll action first.

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
