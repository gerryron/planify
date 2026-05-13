# API Reference

Dokumen ini adalah ringkasan endpoint berdasarkan implementasi route di `src/app/api/**/route.ts`.

## Endpoint Auth

| Method | Path                 | Kegunaan                       | Catatan                                                 |
| ------ | -------------------- | ------------------------------ | ------------------------------------------------------- |
| `POST` | `/api/auth/register` | Registrasi user baru           | Status awal user `pending`, otomatis buat wallet `Cash` |
| `POST` | `/api/auth/login`    | Login user                     | User `pending` tidak bisa login                         |
| `GET`  | `/api/auth/me`       | Ambil profil user dari session | Butuh cookie auth valid                                 |
| `POST` | `/api/auth/logout`   | Logout                         | Cookie auth dihapus                                     |

## Endpoint Monthly Budget

| Method   | Path                  | Kegunaan                   | Catatan                                    |
| -------- | --------------------- | -------------------------- | ------------------------------------------ |
| `GET`    | `/api/monthly-budget` | Ambil daftar budget        | Query: `month=YYYY-MM` atau `month=future` |
| `POST`   | `/api/monthly-budget` | Buat budget                | `type`: `income`/`outcome`/`carryover`     |
| `PATCH`  | `/api/monthly-budget` | Update budget atau reorder | Reorder jika payload berisi `orderedIds`   |
| `DELETE` | `/api/monthly-budget` | Hapus budget               | Body wajib `id`                            |

## Endpoint Cash Log

| Method   | Path            | Kegunaan         | Catatan                                               |
| -------- | --------------- | ---------------- | ----------------------------------------------------- |
| `GET`    | `/api/cash-log` | Ambil transaksi  | Query: `date`, `month`, `month=future`                |
| `POST`   | `/api/cash-log` | Buat transaksi   | Update saldo wallet otomatis                          |
| `PATCH`  | `/api/cash-log` | Update transaksi | Rehitung saldo wallet, termasuk kasus linked transfer |
| `DELETE` | `/api/cash-log` | Hapus transaksi  | Rollback dampak saldo; linked transfer ikut dihapus   |

## Endpoint Wallet

| Method   | Path           | Kegunaan                   | Catatan                           |
| -------- | -------------- | -------------------------- | --------------------------------- |
| `GET`    | `/api/wallets` | Ambil semua wallet         | Urut berdasarkan `sortOrder`      |
| `POST`   | `/api/wallets` | Buat wallet                | Validasi berbeda per wallet kind  |
| `PATCH`  | `/api/wallets` | Update wallet atau reorder | Reorder jika payload `orderedIds` |
| `DELETE` | `/api/wallets` | Hapus wallet               | Tidak boleh hapus wallet terakhir |

## Endpoint Transfer Wallet

| Method | Path                    | Kegunaan              | Catatan                                              |
| ------ | ----------------------- | --------------------- | ---------------------------------------------------- |
| `POST` | `/api/wallets/transfer` | Transfer antar wallet | Support biaya transfer (`fee`) dan `transferGroupId` |

## Endpoint Category

| Method   | Path              | Kegunaan                     | Catatan                                |
| -------- | ----------------- | ---------------------------- | -------------------------------------- |
| `GET`    | `/api/categories` | Ambil category system + user | Include category default sistem        |
| `POST`   | `/api/categories` | Buat category                | Mendukung parent-child 1 level         |
| `PATCH`  | `/api/categories` | Update category              | Default category tidak bisa diubah     |
| `DELETE` | `/api/categories` | Hapus category               | Parent dengan child tidak bisa dihapus |

## Endpoint Settings

| Method | Path                  | Kegunaan                | Catatan                                            |
| ------ | --------------------- | ----------------------- | -------------------------------------------------- |
| `POST` | `/api/settings/purge` | Purge data sesuai scope | Bisa hapus cash log, budget, wallet, category user |

## Endpoint Superadmin

| Method  | Path                               | Kegunaan                   | Catatan          |
| ------- | ---------------------------------- | -------------------------- | ---------------- |
| `GET`   | `/api/superadmin/users`            | Ambil user pending/active  | Hanya superadmin |
| `PATCH` | `/api/superadmin/users/approve`    | Aktivasi user              | Hanya superadmin |
| `PATCH` | `/api/superadmin/users/deactivate` | Kembalikan user ke pending | Hanya superadmin |

## Endpoint Dokumentasi API

| Method | Path           | Kegunaan                | Catatan                          |
| ------ | -------------- | ----------------------- | -------------------------------- |
| `GET`  | `/api/swagger` | Ambil JSON OpenAPI spec | Sumber dari `src/lib/openapi.ts` |

## Catatan OpenAPI

- Spesifikasi di `src/lib/openapi.ts` saat ini mendokumentasikan endpoint:
  - monthly-budget
  - cash-log
  - wallets
  - wallets/transfer
  - categories
  - settings/purge
- Endpoint auth dan superadmin saat ini belum masuk penuh di OpenAPI file, namun sudah tersedia sebagai route implementasi.
