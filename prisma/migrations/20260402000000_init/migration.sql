-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('income', 'outcome');

-- CreateEnum
CREATE TYPE "WalletKind" AS ENUM ('basic', 'goal', 'credit_card');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'superadmin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'active');

-- CreateTable
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

-- CreateTable
CREATE TABLE "MonthlyBudget" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MonthlyBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "excludeFromTotal" BOOLEAN NOT NULL DEFAULT false,
    "walletKind" "WalletKind" NOT NULL DEFAULT 'basic',
    "goalAmount" INTEGER,
    "goalStartMonth" TEXT,
    "goalDueMonth" TEXT,
    "creditLimit" INTEGER,
    "statementDay" INTEGER,
    "dueDay" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "parentId" INTEGER,
    "userId" TEXT,
    "systemDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashLog" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "walletName" TEXT NOT NULL,
    "categoryId" INTEGER,
    "userId" TEXT NOT NULL,
    "transferGroupId" TEXT,
    "excludeFromReport" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CashLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MonthlyBudget_userId_idx" ON "MonthlyBudget"("userId");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_name_key" ON "Wallet"("userId", "name");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_type_parentId_userId_key" ON "Category"("name", "type", "parentId", "userId");

-- CreateIndex
CREATE INDEX "CashLog_categoryId_idx" ON "CashLog"("categoryId");

-- CreateIndex
CREATE INDEX "CashLog_userId_idx" ON "CashLog"("userId");

-- CreateIndex
CREATE INDEX "CashLog_userId_transferGroupId_idx" ON "CashLog"("userId", "transferGroupId");

-- AddForeignKey
ALTER TABLE "MonthlyBudget" ADD CONSTRAINT "MonthlyBudget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashLog" ADD CONSTRAINT "CashLog_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashLog" ADD CONSTRAINT "CashLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed default categories
WITH seed(name, type, parent_name) AS (
VALUES
  ('Salary', 'income', NULL),
  ('Business', 'income', NULL),
  ('Investment', 'income', NULL),
  ('Transfer', 'income', NULL),
  ('Gift', 'income', NULL),
  ('Other Income', 'income', NULL),
  ('Bills and Utilities', 'outcome', NULL),
  ('Food', 'outcome', NULL),
  ('Transport', 'outcome', NULL),
  ('Health', 'outcome', NULL),
  ('Education', 'outcome', NULL),
  ('Lifestyle', 'outcome', NULL),
  ('Gift & Donations', 'outcome', NULL),
  ('Investment', 'outcome', NULL),
  ('Transfer', 'outcome', NULL),
  ('Main Salary', 'income', 'Salary'),
  ('Overtime', 'income', 'Salary'),
  ('Performance Bonus', 'income', 'Salary'),
  ('Holiday Allowance', 'income', 'Salary'),
  ('Consulting', 'income', 'Business'),
  ('Service Revenue', 'income', 'Business'),
  ('Selling', 'income', 'Business'),
  ('Dividend', 'income', 'Investment'),
  ('Interest', 'income', 'Investment'),
  ('Capital Gain', 'income', 'Investment'),
  ('Transfer In', 'income', 'Transfer'),
  ('Wallet Transfer In', 'income', 'Transfer'),
  ('Birthday Gift', 'income', 'Gift'),
  ('Family Gift', 'income', 'Gift'),
  ('Cashback', 'income', 'Other Income'),
  ('Refund', 'income', 'Other Income'),
  ('Miscellaneous Income', 'income', 'Other Income'),
  ('Gas Bills', 'outcome', 'Bills and Utilities'),
  ('House Bills', 'outcome', 'Bills and Utilities'),
  ('Phone Bills', 'outcome', 'Bills and Utilities'),
  ('Rentals', 'outcome', 'Bills and Utilities'),
  ('Water Bills', 'outcome', 'Bills and Utilities'),
  ('Groceries', 'outcome', 'Food'),
  ('Dining Out', 'outcome', 'Food'),
  ('Snacks & Coffee', 'outcome', 'Food'),
  ('Fuel', 'outcome', 'Transport'),
  ('Public Transport', 'outcome', 'Transport'),
  ('Parking', 'outcome', 'Transport'),
  ('Insurance', 'outcome', 'Health'),
  ('Medicine', 'outcome', 'Health'),
  ('Sports', 'outcome', 'Health'),
  ('Courses', 'outcome', 'Education'),
  ('Books', 'outcome', 'Education'),
  ('Tuition Fee', 'outcome', 'Education'),
  ('Shopping', 'outcome', 'Lifestyle'),
  ('Entertainment', 'outcome', 'Lifestyle'),
  ('Movies', 'outcome', 'Lifestyle'),
  ('Games', 'outcome', 'Lifestyle'),
  ('Family Gift', 'outcome', 'Gift & Donations'),
  ('Friends Gift', 'outcome', 'Gift & Donations'),
  ('Charity', 'outcome', 'Gift & Donations'),
  ('Stock Purchase', 'outcome', 'Investment'),
  ('Mutual Fund Purchase', 'outcome', 'Investment'),
  ('Crypto Purchase', 'outcome', 'Investment'),
  ('Tax', 'outcome', 'Investment'),
  ('Transfer Out', 'outcome', 'Transfer'),
  ('Wallet Transfer Out', 'outcome', 'Transfer')
)
INSERT INTO "Category" ("name", "type", "parentId", "userId", "systemDefault")
SELECT
  s.name,
  s.type::"CategoryType",
  p.id,
  NULL,
  true
FROM seed s
LEFT JOIN "Category" p
  ON p."name" = s.parent_name
 AND p."type" = s.type::"CategoryType"
 AND p."parentId" IS NULL
 AND p."userId" IS NULL
 AND p."systemDefault" = true
WHERE NOT EXISTS (
  SELECT 1
  FROM "Category" c
  WHERE c."name" = s.name
    AND c."type" = s.type::"CategoryType"
    AND c."parentId" IS NOT DISTINCT FROM p.id
    AND c."userId" IS NULL
    AND c."systemDefault" = true
);
