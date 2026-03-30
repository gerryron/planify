-- Development sample data cleanup
-- Cleans only demo mock users and their owned records

DELETE FROM "CashLog"
WHERE "userId" IN (
  SELECT id FROM "User" WHERE "email" IN ('demo.user@planify.local', 'pending.user@planify.local')
);

DELETE FROM "MonthlyBudget"
WHERE "userId" IN (
  SELECT id FROM "User" WHERE "email" IN ('demo.user@planify.local', 'pending.user@planify.local')
);

DELETE FROM "Wallet"
WHERE "userId" IN (
  SELECT id FROM "User" WHERE "email" IN ('demo.user@planify.local', 'pending.user@planify.local')
);

DELETE FROM "Category"
WHERE "userId" IN (
  SELECT id FROM "User" WHERE "email" IN ('demo.user@planify.local', 'pending.user@planify.local')
);

DELETE FROM "User"
WHERE "email" IN ('demo.user@planify.local', 'pending.user@planify.local')
  AND "role" = 'user';
