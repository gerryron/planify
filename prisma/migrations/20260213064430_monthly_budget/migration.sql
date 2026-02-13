-- CreateTable
CREATE TABLE "MonthlyBudget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "category" TEXT NOT NULL
);
