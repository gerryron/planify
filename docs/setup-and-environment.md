# Setup and Environment

## Prasyarat

- Node.js 20+
- PostgreSQL lokal untuk development
- NPM (sesuai `package-lock.json`)

## Variabel Environment

Gunakan `.env` untuk lokal dan `.env.example` sebagai template.

Variabel inti:

- `DATABASE_URL`: koneksi PostgreSQL
- `NODE_ENV`: `development` atau `production`
- `JWT_SECRET`: minimal 16 karakter
- `SUPERADMIN_EMAIL`: akun superadmin bootstrap
- `SUPERADMIN_PASSWORD`: password akun superadmin bootstrap
- `SUPERADMIN_NAME`: nama superadmin bootstrap

Contoh format lokal:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/planify?schema=public"
NODE_ENV="development"
JWT_SECRET="change-this-to-a-long-random-secret"
SUPERADMIN_EMAIL="superadmin@planify.local"
SUPERADMIN_PASSWORD="change-this-superadmin-password"
SUPERADMIN_NAME="Super Admin"
```

## Setup Lokal Pertama Kali

1. Install dependency:

```bash
npm install
```

2. Pastikan database `planify` sudah ada di PostgreSQL.

3. Jalankan migration dan generate Prisma client:

```bash
npm run db:setup:local
```

4. Jalankan aplikasi development:

```bash
npm run dev
```

Service lokal:

- App Next.js: http://localhost:3000
- Swagger helper: http://localhost:3010

## Setup Deploy/Production

1. Set environment variable production (terutama `DATABASE_URL`, `JWT_SECRET`, dan kredensial superadmin).
2. Jalankan migration + generate:

```bash
npm run db:setup:deploy
```

3. Build:

```bash
npm run build
```

4. Start:

```bash
npm run start
```

## Script Penting

- `npm run dev`: jalankan Next + Swagger helper bersama
- `npm run dev:next`: Next.js dev server
- `npm run dev:swagger`: Swagger standalone server
- `npm run db:generate`: generate Prisma client
- `npm run db:migrate:deploy`: migrate + generate
- `npm run db:setup:local`: migrate + generate untuk lokal
- `npm run db:setup:deploy`: migrate + generate untuk deploy
- `npm run lint`: jalankan ESLint
- `npm test`: jalankan test suite Jest
