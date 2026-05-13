# Feature: Categories

Sumber utama:

- `src/app/api/categories/route.ts`
- `src/features/categories/**`

## Tujuan

Menyediakan struktur kategori income/outcome yang konsisten untuk budget dan cash log.

## Data Inti

- `name`
- `type` (`income` | `outcome`)
- `parentId` (nullable)
- `systemDefault`
- `userId` (nullable untuk kategori sistem)

## Operasi API

- Create: `POST /api/categories`
- Read: `GET /api/categories`
- Update: `PATCH /api/categories`
- Delete: `DELETE /api/categories`

## Aturan Validasi Hierarki

- Parent category harus ada.
- Type parent dan child harus sama.
- Maksimal 1 level child (subcategory tidak boleh punya child lagi).
- Category tidak boleh menjadi parent dirinya sendiri.

## Aturan Perubahan Data

- Default category (`systemDefault=true`) tidak bisa diubah atau dihapus.
- Parent category yang masih punya subcategory tidak bisa dihapus.
- Parent category yang punya child tidak bisa ganti type.

## Scope Data

- `GET` mengembalikan gabungan kategori sistem + kategori milik user login.
- `POST`, `PATCH`, `DELETE` berjalan pada kategori milik user login.
