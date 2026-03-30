-- Backward compatibility: restore CashLog.walletName and remove legacy walletId dependency

ALTER TABLE "CashLog"
ADD COLUMN IF NOT EXISTS "walletName" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'CashLog'
      AND column_name = 'walletId'
  ) THEN
    UPDATE "CashLog" AS c
    SET "walletName" = w."name"
    FROM "Wallet" AS w
    WHERE c."walletId" = w."id"
      AND (c."walletName" IS NULL OR c."walletName" = '');
  END IF;
END $$;

-- Fallback for any orphaned legacy rows so app can still read data safely
UPDATE "CashLog"
SET "walletName" = 'Unknown Wallet'
WHERE "walletName" IS NULL OR "walletName" = '';

ALTER TABLE "CashLog"
ALTER COLUMN "walletName" SET NOT NULL;

ALTER TABLE "CashLog"
DROP COLUMN IF EXISTS "walletId";
