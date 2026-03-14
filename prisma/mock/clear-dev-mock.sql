-- Development sample data cleanup
-- Deletes only records inserted by the development seed script

DELETE FROM "CashLog"
WHERE "date" BETWEEN '2026-02-01' AND '2026-04-30'
  AND "walletName" IN ('BCA Payroll', 'Cash', 'GoPay', 'Mandiri Savings', 'Travel Fund');

DELETE FROM "MonthlyBudget"
WHERE "sortOrder" >= 100
  AND "month" IN ('2026-02', '2026-03', '2026-04');

DELETE FROM "Wallet"
WHERE "sortOrder" >= 100
  AND "name" IN ('BCA Payroll', 'Cash', 'GoPay', 'Mandiri Savings', 'Travel Fund', 'Emergency Fund');
