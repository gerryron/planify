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
