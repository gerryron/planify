-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('income', 'outcome');

-- CreateTable
CREATE TABLE "MonthlyBudget" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MonthlyBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "excludeFromTotal" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "parentId" INTEGER,

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
    "excludeFromReport" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CashLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_name_key" ON "Wallet"("name");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_type_parentId_key" ON "Category"("name", "type", "parentId");

-- CreateIndex
CREATE INDEX "CashLog_categoryId_idx" ON "CashLog"("categoryId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashLog" ADD CONSTRAINT "CashLog_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed Wallet (init only)
INSERT INTO "Wallet" ("name", "balance", "excludeFromTotal", "sortOrder")
VALUES ('Cash', 0, false, 0)
ON CONFLICT DO NOTHING;

-- Seed Categories root (init only)
INSERT INTO "Category" ("name", "type", "parentId") VALUES
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
    ('Transfer', 'outcome', NULL)
ON CONFLICT DO NOTHING;

-- Seed income subcategories
INSERT INTO "Category" ("name", "type", "parentId") VALUES
    ('Main Salary', 'income', (SELECT "id" FROM "Category" WHERE "name"='Salary' AND "type"='income' AND "parentId" IS NULL)),
    ('Overtime', 'income', (SELECT "id" FROM "Category" WHERE "name"='Salary' AND "type"='income' AND "parentId" IS NULL)),
    ('Performance Bonus', 'income', (SELECT "id" FROM "Category" WHERE "name"='Salary' AND "type"='income' AND "parentId" IS NULL)),
    ('Holiday Allowance', 'income', (SELECT "id" FROM "Category" WHERE "name"='Salary' AND "type"='income' AND "parentId" IS NULL)),
    ('Consulting', 'income', (SELECT "id" FROM "Category" WHERE "name"='Business' AND "type"='income' AND "parentId" IS NULL)),
    ('Service Revenue', 'income', (SELECT "id" FROM "Category" WHERE "name"='Business' AND "type"='income' AND "parentId" IS NULL)),
    ('Selling', 'income', (SELECT "id" FROM "Category" WHERE "name"='Business' AND "type"='income' AND "parentId" IS NULL)),
    ('Dividend', 'income', (SELECT "id" FROM "Category" WHERE "name"='Investment' AND "type"='income' AND "parentId" IS NULL)),
    ('Interest', 'income', (SELECT "id" FROM "Category" WHERE "name"='Investment' AND "type"='income' AND "parentId" IS NULL)),
    ('Capital Gain', 'income', (SELECT "id" FROM "Category" WHERE "name"='Investment' AND "type"='income' AND "parentId" IS NULL)),
    ('Transfer In', 'income', (SELECT "id" FROM "Category" WHERE "name"='Transfer' AND "type"='income' AND "parentId" IS NULL)),
    ('Wallet Transfer In', 'income', (SELECT "id" FROM "Category" WHERE "name"='Transfer' AND "type"='income' AND "parentId" IS NULL)),
    ('Birthday Gift', 'income', (SELECT "id" FROM "Category" WHERE "name"='Gift' AND "type"='income' AND "parentId" IS NULL)),
    ('Family Gift', 'income', (SELECT "id" FROM "Category" WHERE "name"='Gift' AND "type"='income' AND "parentId" IS NULL)),
    ('Cashback', 'income', (SELECT "id" FROM "Category" WHERE "name"='Other Income' AND "type"='income' AND "parentId" IS NULL)),
    ('Refund', 'income', (SELECT "id" FROM "Category" WHERE "name"='Other Income' AND "type"='income' AND "parentId" IS NULL)),
    ('Miscellaneous Income', 'income', (SELECT "id" FROM "Category" WHERE "name"='Other Income' AND "type"='income' AND "parentId" IS NULL))
ON CONFLICT DO NOTHING;

-- Seed outcome subcategories
INSERT INTO "Category" ("name", "type", "parentId") VALUES
    ('Credit Card Bills', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Bills and Utilities' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Electricity Bills', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Bills and Utilities' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Gas Bills', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Bills and Utilities' AND "type"='outcome' AND "parentId" IS NULL)),
    ('House Bills', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Bills and Utilities' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Internet Bills', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Bills and Utilities' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Phone Bills', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Bills and Utilities' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Rentals', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Bills and Utilities' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Streaming Service', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Bills and Utilities' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Water Bills', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Bills and Utilities' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Other Utility Bills', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Bills and Utilities' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Groceries', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Food' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Dining Out', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Food' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Snacks & Coffee', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Food' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Fuel', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Transport' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Public Transport', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Transport' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Parking', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Transport' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Insurance', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Health' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Medicine', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Health' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Sports', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Health' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Courses', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Education' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Books', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Education' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Tuition Fee', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Education' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Shopping', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Lifestyle' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Entertainment', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Lifestyle' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Movies', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Lifestyle' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Games', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Lifestyle' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Family Gift', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Gift & Donations' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Friends Gift', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Gift & Donations' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Charity', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Gift & Donations' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Religious Donation', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Gift & Donations' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Stock Purchase', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Investment' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Mutual Fund Purchase', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Investment' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Crypto Purchase', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Investment' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Tax', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Investment' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Transfer Out', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Transfer' AND "type"='outcome' AND "parentId" IS NULL)),
    ('Wallet Transfer Out', 'outcome', (SELECT "id" FROM "Category" WHERE "name"='Transfer' AND "type"='outcome' AND "parentId" IS NULL))
ON CONFLICT DO NOTHING;
