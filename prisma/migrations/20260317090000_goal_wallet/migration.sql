-- CreateEnum
CREATE TYPE "WalletKind" AS ENUM ('basic', 'goal');

-- AlterTable
ALTER TABLE "Wallet"
ADD COLUMN "walletKind" "WalletKind" NOT NULL DEFAULT 'basic',
ADD COLUMN "goalAmount" INTEGER,
ADD COLUMN "goalStartMonth" TEXT,
ADD COLUMN "goalDueMonth" TEXT;
