-- CreateTable
CREATE TABLE "MonthlyBudget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "includeFromTotal" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parentId" TEXT,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "walletName" TEXT NOT NULL,
    "categoryId" TEXT,
    CONSTRAINT "CashLog_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_name_key" ON "Wallet"("name");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_type_parentId_key" ON "Category"("name", "type", "parentId");

-- CreateIndex
CREATE INDEX "CashLog_categoryId_idx" ON "CashLog"("categoryId");

-- Seed Wallet (init only)
INSERT OR IGNORE INTO "Wallet" ("id", "name", "balance", "includeFromTotal", "sortOrder")
VALUES ('seed-wallet-cash', 'Cash', 0, true, 0);

-- Seed Categories (init only)
INSERT OR IGNORE INTO "Category" ("id", "name", "type", "parentId") VALUES
    ('seed-v3-income-salary', 'Salary', 'income', NULL),
    ('seed-v3-income-business', 'Business', 'income', NULL),
    ('seed-v3-income-investment', 'Investment', 'income', NULL),
    ('seed-v3-income-transfer', 'Transfer', 'income', NULL),
    ('seed-v3-income-gift', 'Gift', 'income', NULL),
    ('seed-v3-income-other', 'Other Income', 'income', NULL),
    ('seed-v3-income-salary-main', 'Main Salary', 'income', 'seed-v3-income-salary'),
    ('seed-v3-income-salary-overtime', 'Overtime', 'income', 'seed-v3-income-salary'),
    ('seed-v3-income-salary-bonus', 'Performance Bonus', 'income', 'seed-v3-income-salary'),
    ('seed-v3-income-salary-thr', 'Holiday Allowance', 'income', 'seed-v3-income-salary'),
    ('seed-v3-income-business-consulting', 'Consulting', 'income', 'seed-v3-income-business'),
    ('seed-v3-income-business-service', 'Service Revenue', 'income', 'seed-v3-income-business'),
    ('seed-v3-income-business-selling', 'Selling', 'income', 'seed-v3-income-business'),
    ('seed-v3-income-investment-dividend', 'Dividend', 'income', 'seed-v3-income-investment'),
    ('seed-v3-income-investment-interest', 'Interest', 'income', 'seed-v3-income-investment'),
    ('seed-v3-income-investment-capital-gain', 'Capital Gain', 'income', 'seed-v3-income-investment'),
    ('seed-v3-income-transfer-in', 'Transfer In', 'income', 'seed-v3-income-transfer'),
    ('seed-v3-income-transfer-wallet', 'Wallet Transfer In', 'income', 'seed-v3-income-transfer'),
    ('seed-v3-income-gift-birthday', 'Birthday Gift', 'income', 'seed-v3-income-gift'),
    ('seed-v3-income-gift-family', 'Family Gift', 'income', 'seed-v3-income-gift'),
    ('seed-v3-income-other-cashback', 'Cashback', 'income', 'seed-v3-income-other'),
    ('seed-v3-income-other-refund', 'Refund', 'income', 'seed-v3-income-other'),
    ('seed-v3-income-other-misc', 'Miscellaneous Income', 'income', 'seed-v3-income-other'),
    ('seed-v3-outcome-bills', 'Bills and Utilities', 'outcome', NULL),
    ('seed-v3-outcome-food', 'Food', 'outcome', NULL),
    ('seed-v3-outcome-transport', 'Transport', 'outcome', NULL),
    ('seed-v3-outcome-health', 'Health', 'outcome', NULL),
    ('seed-v3-outcome-education', 'Education', 'outcome', NULL),
    ('seed-v3-outcome-lifestyle', 'Lifestyle', 'outcome', NULL),
    ('seed-v3-outcome-gift-donation', 'Gift & Donations', 'outcome', NULL),
    ('seed-v3-outcome-investment', 'Investment', 'outcome', NULL),
    ('seed-v3-outcome-transfer', 'Transfer', 'outcome', NULL),
    ('seed-v3-outcome-bills-credit-card', 'Credit Card Bills', 'outcome', 'seed-v3-outcome-bills'),
    ('seed-v3-outcome-bills-electricity', 'Electricity Bills', 'outcome', 'seed-v3-outcome-bills'),
    ('seed-v3-outcome-bills-gas', 'Gas Bills', 'outcome', 'seed-v3-outcome-bills'),
    ('seed-v3-outcome-bills-house', 'House Bills', 'outcome', 'seed-v3-outcome-bills'),
    ('seed-v3-outcome-bills-internet', 'Internet Bills', 'outcome', 'seed-v3-outcome-bills'),
    ('seed-v3-outcome-bills-phone', 'Phone Bills', 'outcome', 'seed-v3-outcome-bills'),
    ('seed-v3-outcome-bills-rentals', 'Rentals', 'outcome', 'seed-v3-outcome-bills'),
    ('seed-v3-outcome-bills-streaming', 'Streaming Service', 'outcome', 'seed-v3-outcome-bills'),
    ('seed-v3-outcome-bills-water', 'Water Bills', 'outcome', 'seed-v3-outcome-bills'),
    ('seed-v3-outcome-bills-other', 'Other Utility Bills', 'outcome', 'seed-v3-outcome-bills'),
    ('seed-v3-outcome-food-groceries', 'Groceries', 'outcome', 'seed-v3-outcome-food'),
    ('seed-v3-outcome-food-dining', 'Dining Out', 'outcome', 'seed-v3-outcome-food'),
    ('seed-v3-outcome-food-snacks', 'Snacks & Coffee', 'outcome', 'seed-v3-outcome-food'),
    ('seed-v3-outcome-transport-fuel', 'Fuel', 'outcome', 'seed-v3-outcome-transport'),
    ('seed-v3-outcome-transport-public', 'Public Transport', 'outcome', 'seed-v3-outcome-transport'),
    ('seed-v3-outcome-transport-parking', 'Parking', 'outcome', 'seed-v3-outcome-transport'),
    ('seed-v3-outcome-health-insurance', 'Insurance', 'outcome', 'seed-v3-outcome-health'),
    ('seed-v3-outcome-health-medicine', 'Medicine', 'outcome', 'seed-v3-outcome-health'),
    ('seed-v3-outcome-health-sports', 'Sports', 'outcome', 'seed-v3-outcome-health'),
    ('seed-v3-outcome-education-course', 'Courses', 'outcome', 'seed-v3-outcome-education'),
    ('seed-v3-outcome-education-books', 'Books', 'outcome', 'seed-v3-outcome-education'),
    ('seed-v3-outcome-education-tuition', 'Tuition Fee', 'outcome', 'seed-v3-outcome-education'),
    ('seed-v3-outcome-lifestyle-shopping', 'Shopping', 'outcome', 'seed-v3-outcome-lifestyle'),
    ('seed-v3-outcome-lifestyle-entertainment', 'Entertainment', 'outcome', 'seed-v3-outcome-lifestyle'),
    ('seed-v3-outcome-lifestyle-movies', 'Movies', 'outcome', 'seed-v3-outcome-lifestyle'),
    ('seed-v3-outcome-lifestyle-games', 'Games', 'outcome', 'seed-v3-outcome-lifestyle'),
    ('seed-v3-outcome-gift-family', 'Family Gift', 'outcome', 'seed-v3-outcome-gift-donation'),
    ('seed-v3-outcome-gift-friends', 'Friends Gift', 'outcome', 'seed-v3-outcome-gift-donation'),
    ('seed-v3-outcome-gift-charity', 'Charity', 'outcome', 'seed-v3-outcome-gift-donation'),
    ('seed-v3-outcome-gift-religious', 'Religious Donation', 'outcome', 'seed-v3-outcome-gift-donation'),
    ('seed-v3-outcome-investment-stock', 'Stock Purchase', 'outcome', 'seed-v3-outcome-investment'),
    ('seed-v3-outcome-investment-mutual', 'Mutual Fund Purchase', 'outcome', 'seed-v3-outcome-investment'),
    ('seed-v3-outcome-investment-crypto', 'Crypto Purchase', 'outcome', 'seed-v3-outcome-investment'),
    ('seed-v3-outcome-investment-tax', 'Tax', 'outcome', 'seed-v3-outcome-investment'),
    ('seed-v3-outcome-transfer-out', 'Transfer Out', 'outcome', 'seed-v3-outcome-transfer'),
    ('seed-v3-outcome-transfer-wallet', 'Wallet Transfer Out', 'outcome', 'seed-v3-outcome-transfer');

