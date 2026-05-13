# Feature: Monthly Budget

Sumber utama:

- `src/app/api/monthly-budget/route.ts`
- `src/features/monthly-budget/**`

## Data Inti

- `name`
- `amount`
- `month` (format `YYYY-MM`)
- `category`
- `type` (`income` | `outcome` | `carryover`)
- `isDone`
- `sortOrder`

## Operasi API

- Create: `POST /api/monthly-budget`
- Read: `GET /api/monthly-budget`
- Update/reorder: `PATCH /api/monthly-budget`
- Delete: `DELETE /api/monthly-budget`

## Aturan Validasi

- Semua field wajib saat create (`name`, `amount`, `month`, `category`, `type`).
- `type` hanya menerima `income`, `outcome`, atau `carryover`.
- Update item tunggal wajib menyertakan `id`.
- Reorder wajib menyertakan `orderedIds` valid milik user yang sedang login.

## Aturan Query

- Tanpa query `month`: mengembalikan seluruh budget user.
- `month=future`: hanya bulan setelah bulan berjalan.
- `month=YYYY-MM`:
  - Jika bulan <= bulan berjalan: filter tepat bulan itu.
  - Jika bulan > bulan berjalan: mengembalikan seluruh budget user.

## Catatan Implementasi

- `sortOrder` ditentukan otomatis saat create berdasarkan urutan terakhir dalam bulan yang sama.
- Status selesai dapat diubah lewat `isDone` pada payload `PATCH`.
