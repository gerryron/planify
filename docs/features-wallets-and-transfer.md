# Feature: Wallets and Transfer

Sumber utama:

- `src/app/api/wallets/route.ts`
- `src/app/api/wallets/transfer/route.ts`
- `src/features/wallets/**`

## Wallet Kind

- `basic`
- `goal`
- `credit_card`

## Aturan Wallet

### Aturan Umum

- Nama wallet unik per user.
- Wallet type (`walletKind`) tidak bisa diubah setelah dibuat.
- Reorder wallet memakai `orderedIds` di `PATCH /api/wallets`.
- Tidak boleh menghapus wallet terakhir user.

### Goal Wallet

- Wajib `goalAmount > 0` dan `goalDueMonth` format `YYYY-MM`.
- Field goal hanya valid untuk wallet kind `goal`.
- `goalStartMonth` ditetapkan saat create dan tidak dapat diubah.
- Secara paksa `excludeFromTotal = true`.

### Credit Card Wallet

- Wajib `creditLimit > 0`, `statementDay` 1-31, `dueDay` 1-31.
- Outstanding (`balance`) tidak boleh melebihi `creditLimit`.
- Field credit card hanya valid untuk wallet kind `credit_card`.
- Secara paksa `excludeFromTotal = true`.

## Adjustment Otomatis

Saat create/update wallet mengubah saldo:

- Sistem membuat cash log penyesuaian `Adjust Balance`.
- Category penyesuaian memakai `Transfer In` atau `Transfer Out` sesuai arah perubahan saldo.
- Log penyesuaian diberi `excludeFromReport=true`.

## Transfer Antar Wallet

Endpoint: `POST /api/wallets/transfer`

Payload inti:

- `fromWalletId`, `toWalletId`
- `amount`, `date`
- Opsional: `transferNote`
- Opsional fee: `enableFee`, `feeAmount`, `feePayer`, `feeNote`

Aturan transfer:

- Sumber dan tujuan harus berbeda.
- Amount harus > 0.
- Jika fee receiver, amount harus > fee.
- Wallet sumber non-credit-card harus punya saldo cukup.
- Goal wallet yang belum mencapai target tidak bisa transfer keluar.
- Goal wallet yang sudah mencapai target tidak bisa menerima transfer baru.
- Credit card tetap tunduk pada credit limit.

Efek transfer:

- Membuat 2 cash log transfer (out + in) dengan `transferGroupId` sama.
- Keduanya `excludeFromReport=true`.
- Jika fee aktif, dibuat cash log fee tambahan.
- Category transfer fallback antara nama `Wallet Transfer In/Out` dan `Transfer In/Out`.
