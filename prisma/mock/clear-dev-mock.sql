-- DEV MOCK DATA CLEANUP
-- Deletes only records tagged with mock ID/name prefix

DELETE FROM "CashLog"
WHERE "id" LIKE 'mock-%'
   OR "description" LIKE 'MOCK %'
   OR "walletName" LIKE 'MOCK - %';

DELETE FROM "MonthlyBudget"
WHERE "id" LIKE 'mock-%'
   OR "name" LIKE 'MOCK %';

DELETE FROM "Wallet"
WHERE "id" LIKE 'mock-%'
   OR "name" LIKE 'MOCK - %';
