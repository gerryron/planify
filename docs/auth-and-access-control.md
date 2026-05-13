# Auth and Access Control

## Session dan Token

Sumber utama:

- `src/core/auth/session.ts`
- `src/core/auth/requireAuth.ts`
- `middleware.ts`

Ringkasan implementasi:

- Session disimpan di cookie `planify_auth_token`.
- Token ditandatangani HS256 dengan `JWT_SECRET`.
- TTL token: 7 hari.
- Cookie `httpOnly`, `sameSite=lax`, `path=/`, dan `secure` menyesuaikan environment/proxy.

## Endpoint Auth

Sumber utama:

- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/auth/logout/route.ts`

Behavior:

- Register membuat user baru dengan status `pending` dan wallet default `Cash`.
- Login menolak user berstatus `pending`.
- Me membaca user aktif dari cookie token.
- Logout menghapus cookie auth.

## Guard Endpoint API

`requireAuth`:

- Menolak request tanpa token valid.
- Secara default mewajibkan user status `active`.
- Dapat memaksa role superadmin (`requireSuperadmin: true`).

Catatan test:

- Pada `NODE_ENV=test`, `requireAuth` mengembalikan user test otomatis agar pengujian route tidak butuh token nyata.

## Middleware Rules

Sumber utama: `middleware.ts`.

Aturan inti:

- Public page: hanya root (`/`).
- Public API: `/api/auth/*` dan `/api/swagger`.
- Endpoint API selain public memerlukan token valid dan user aktif.
- User superadmin dibatasi hanya untuk panel approval (`/admin-panel`) dan API superadmin (`/api/superadmin/*`).
- User biasa tidak bisa akses route superadmin.

Aturan redirect halaman:

- Root dengan session aktif diarahkan ke:
  - `/home` untuk role `user`
  - `/admin-panel` untuk role `superadmin`
- Halaman privat tanpa session aktif diarahkan ke `/`.
