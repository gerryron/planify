# Database Schema

Dokumen ini merangkum model data dari `prisma/schema.prisma`.

## Enums

- `CategoryType`: `income`, `outcome`
- `WalletKind`: `basic`, `goal`, `credit_card`
- `UserRole`: `user`, `superadmin`
- `UserStatus`: `pending`, `active`

## Model Utama

### User

Kolom penting:

- `id`, `name`, `email` (unik), `passwordHash`
- `role`, `status`
- `createdAt`, `updatedAt`

Relasi:

- 1:N ke `Wallet`, `CashLog`, `Category`, `MonthlyBudget`

### Wallet

Kolom penting:

- `name`, `balance`, `excludeFromTotal`, `sortOrder`
- `walletKind`
- Goal wallet: `goalAmount`, `goalStartMonth`, `goalDueMonth`
- Credit card wallet: `creditLimit`, `statementDay`, `dueDay`
- `userId`

Constraint:

- Unik kombinasi `[userId, name]`

Relasi:

- N:1 ke `User`
- 1:N ke `CashLog`

### Category

Kolom penting:

- `name`, `type`, `parentId`
- `userId` (nullable untuk category global/system)
- `systemDefault`

Constraint:

- Unik kombinasi `[name, type, parentId, userId]`

Relasi:

- Self relation parent-child (`CategoryHierarchy`)
- 1:N ke `CashLog`
- N:1 ke `User` (nullable)

### CashLog

Kolom penting:

- `date`, `description`, `amount`
- `walletName` (legacy compatibility)
- `walletId`
- `categoryId` (nullable)
- `transferGroupId` (nullable)
- `excludeFromReport`
- `userId`

Relasi:

- N:1 ke `Wallet`
- N:1 ke `Category` (nullable)
- N:1 ke `User`

Index:

- `walletId`, `categoryId`, `userId`, dan `[userId, transferGroupId]`

### MonthlyBudget

Kolom penting:

- `name`, `amount`, `month`, `category`, `type`
- `isDone`, `sortOrder`
- `userId`

Relasi:

- N:1 ke `User`

## Catatan Aturan Data

- `type` pada `MonthlyBudget` disimpan string (`income`, `outcome`, `carryover`).
- `walletName` pada `CashLog` masih disimpan untuk kompatibilitas frontend lama, meskipun relasi utama sudah `walletId`.
- Penghapusan user akan cascade ke budget, wallet, cash log, dan category user.
