# Feature: Monthly Budget

Sumber utama:

- `src/app/api/monthly-budget/route.ts`
- `src/app/api/monthly-budget/copy/route.ts`
- `src/features/monthly-budget/**`

## Data Inti

- `name`
- `amount`
- `month` (format `YYYY-MM`)
- `category`
- `type` (`income` | `outcome`)
- `isDone`
- `sortOrder`

## Operasi API

- Create: `POST /api/monthly-budget`
- Read: `GET /api/monthly-budget`
- Update/reorder: `PATCH /api/monthly-budget`
- Delete: `DELETE /api/monthly-budget`
- Copy: `POST /api/monthly-budget/copy`

## Aturan Validasi

- Semua field wajib saat create (`name`, `amount`, `month`, `category`, `type`).
- `type` hanya menerima `income` atau `outcome`.
- Update item tunggal wajib menyertakan `id`.
- Reorder wajib menyertakan `orderedIds` valid milik user yang sedang login.

## Aturan Query

- Tanpa query `month`: mengembalikan seluruh budget user.
- `month=future`: hanya bulan setelah bulan berjalan.
- `month=YYYY-MM`:
  - Jika bulan <= bulan berjalan: filter tepat bulan itu.
  - Jika bulan > bulan berjalan: mengembalikan seluruh budget user.

## Copy Budget ke Bulan Lain

- Payload: `ids` (array id budget sumber) dan `targetMonth` (format `YYYY-MM`).
- `ids` wajib non-empty dan semua id harus milik user yang sedang login.
- Salinan dibuat di `targetMonth` dengan menyalin `name`, `amount`, `category`, dan `type` dari budget sumber; `isDone` diset `false`.
- `sortOrder` salinan melanjutkan urutan terakhir di bulan target.

## Catatan Implementasi

- `sortOrder` ditentukan otomatis saat create berdasarkan urutan terakhir dalam bulan yang sama.
- Status selesai dapat diubah lewat `isDone` pada payload `PATCH`.
