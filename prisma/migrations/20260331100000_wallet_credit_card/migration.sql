-- Add credit card wallet kind and metadata fields

DO $$
BEGIN
  ALTER TYPE "WalletKind" ADD VALUE 'credit_card';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Wallet"
ADD COLUMN IF NOT EXISTS "creditLimit" INTEGER,
ADD COLUMN IF NOT EXISTS "statementDay" INTEGER,
ADD COLUMN IF NOT EXISTS "dueDay" INTEGER;
