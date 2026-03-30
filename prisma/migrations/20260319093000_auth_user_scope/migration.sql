-- Auth + user ownership migration

CREATE TYPE "UserRole" AS ENUM ('user', 'superadmin');
CREATE TYPE "UserStatus" AS ENUM ('pending', 'active');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'user',
  "status" "UserStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "status", "createdAt", "updatedAt")
VALUES (
  'legacy-user',
  'Legacy User',
  'legacy.user@planify.local',
  '$2b$10$DA0oBSOREnPTewShSMATS.ko8HjDSd/nnMdJ8p.CT9GeFaPmMMMZ.',
  'user',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("email") DO NOTHING;

ALTER TABLE "MonthlyBudget" ADD COLUMN "userId" TEXT;
ALTER TABLE "Wallet" ADD COLUMN "userId" TEXT;
ALTER TABLE "Category" ADD COLUMN "userId" TEXT;
ALTER TABLE "Category" ADD COLUMN "systemDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CashLog" ADD COLUMN "userId" TEXT;

UPDATE "MonthlyBudget" SET "userId" = 'legacy-user' WHERE "userId" IS NULL;
UPDATE "Wallet" SET "userId" = 'legacy-user' WHERE "userId" IS NULL;
UPDATE "CashLog" SET "userId" = 'legacy-user' WHERE "userId" IS NULL;
UPDATE "Category" SET "systemDefault" = true WHERE "systemDefault" = false;

ALTER TABLE "MonthlyBudget" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Wallet" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "CashLog" ALTER COLUMN "userId" SET NOT NULL;

DROP INDEX IF EXISTS "Wallet_name_key";

CREATE INDEX "MonthlyBudget_userId_idx" ON "MonthlyBudget"("userId");
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");
CREATE UNIQUE INDEX "Wallet_userId_name_key" ON "Wallet"("userId", "name");
CREATE INDEX "Category_userId_idx" ON "Category"("userId");
DROP INDEX IF EXISTS "Category_name_type_parentId_key";
CREATE UNIQUE INDEX "Category_name_type_parentId_userId_key" ON "Category"("name", "type", "parentId", "userId");
CREATE INDEX "CashLog_userId_idx" ON "CashLog"("userId");

ALTER TABLE "MonthlyBudget"
ADD CONSTRAINT "MonthlyBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Wallet"
ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Category"
ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CashLog"
ADD CONSTRAINT "CashLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
