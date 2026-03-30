-- Backward compatibility: restore CashLog.walletName and remove legacy walletId dependency

ALTER TABLE "CashLog"
ADD COLUMN IF NOT EXISTS "walletName" TEXT;

UPDATE "CashLog" AS c
SET "walletName" = w."name"
FROM "Wallet" AS w
WHERE c."walletId" = w."id"
  AND (c."walletName" IS NULL OR c."walletName" = '');

-- Fallback for any orphaned legacy rows so app can still read data safely
UPDATE "CashLog"
SET "walletName" = 'Unknown Wallet'
WHERE "walletName" IS NULL OR "walletName" = '';

ALTER TABLE "CashLog"
ALTER COLUMN "walletName" SET NOT NULL;

ALTER TABLE "CashLog"
DROP COLUMN IF EXISTS "walletId";
