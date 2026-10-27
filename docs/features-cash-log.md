# Feature: Cash Log

Sumber utama:

- `src/app/api/cash-log/route.ts`
- `src/features/cash-log/**`

## Tujuan

Mencatat mutasi keuangan aktual dan menjaga konsistensi saldo wallet.

## Data Inti

- `date` (`YYYY-MM-DD`)
- `description`
- `amount` (harus > 0)
- `walletName`
- `walletId` (relasi utama)
- `categoryId`
- `excludeFromReport`
- `transferGroupId` (untuk pasangan transfer)

## Operasi API

- Create: `POST /api/cash-log`
- Read: `GET /api/cash-log`
- Update: `PATCH /api/cash-log`
- Delete: `DELETE /api/cash-log`

## Aturan Query Read

- `?date=YYYY-MM-DD`: filter tepat tanggal.
- `?month=YYYY-MM`: filter prefix tanggal sesuai bulan.
- `?month=future`: transaksi dari awal bulan berikutnya.
- `?description=<keyword>`: filter deskripsi transaksi (case-insensitive, partial match).
- Jika `month` lebih besar dari bulan berjalan: route mengembalikan seluruh log user.
- `description` bisa digabung dengan `date`/`month` untuk mempersempit hasil.

## Behavior Search di Halaman Cash Log

- Input search description menggunakan debounce `350ms` untuk mengurangi request beruntun saat mengetik.
- Nilai search disinkronkan ke URL melalui query `description` agar state tetap saat refresh/share.
- Ketika `description` terisi, halaman melakukan pencarian menyeluruh lintas bulan (filter bulan diabaikan untuk request tersebut).

## Quick Create dari Wallet

Pada daftar wallet, action menu tiap item menambahkan opsi `Transaction` untuk membuka form transaksi baru secara cepat. Fitur ini memanggil halaman cash log dengan query `walletId` dan `new=1`, lalu form add transaction otomatis terbuka dengan wallet yang dipilih sebagai default. Ini membantu mempercepat pencatatan transaksi tanpa perlu memilih wallet lagi di form.

## Aturan Sinkronisasi Saldo

- Delta saldo ditentukan dari `category.type`:
  - `income`: menambah saldo wallet normal.
  - `outcome`: mengurangi saldo wallet normal.
- Untuk wallet `credit_card`, arah delta dibalik agar merepresentasikan outstanding.
- Mutasi create/update/delete dilakukan dalam transaction.
- Jika melampaui credit limit, operasi ditolak.

## Linked Transfer Behavior

Untuk transaksi transfer berpasangan (berdasarkan `transferGroupId` atau kandidat cocok):

- Ubah wallet atau category pada satu sisi transfer tidak diperbolehkan.
- Perubahan amount/date/description/exclude dapat diterapkan sinkron ke pasangan.
- Delete satu sisi akan menghapus pasangan linked transfer juga.

## Catatan Penting

- `excludeFromReport` tidak otomatis meniadakan dampak saldo wallet.
- Dampak saldo dihitung selama transaksi memiliki `category.type` yang valid.
