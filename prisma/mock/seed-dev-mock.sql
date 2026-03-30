-- Development sample data seed
-- Multi-user ready: sample data belongs to one active demo user

-- Demo users
INSERT INTO "User" ("name", "email", "passwordHash", "role", "status") VALUES
  ('Demo Active User', 'demo.user@planify.local', '$2b$10$DA0oBSOREnPTewShSMATS.ko8HjDSd/nnMdJ8p.CT9GeFaPmMMMZ.', 'user', 'active'),
  ('Demo Pending User', 'pending.user@planify.local', '$2b$10$DA0oBSOREnPTewShSMATS.ko8HjDSd/nnMdJ8p.CT9GeFaPmMMMZ.', 'user', 'pending')
ON CONFLICT ("email") DO NOTHING;

-- Wallets for active demo user
INSERT INTO "Wallet" ("name", "balance", "excludeFromTotal", "walletKind", "sortOrder", "userId") VALUES
  ('BCA Payroll', 6845000, false, 'basic', 101, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('Cash', 465000, false, 'basic', 102, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('GoPay', 325000, false, 'basic', 103, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('Mandiri Savings', 12350000, false, 'basic', 104, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('Travel Fund', 2750000, true, 'goal', 105, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('Emergency Fund', 8500000, true, 'goal', 106, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1))
ON CONFLICT ("userId", "name") DO NOTHING;

-- Monthly budgets for active demo user
INSERT INTO "MonthlyBudget" ("name", "amount", "month", "category", "type", "sortOrder", "userId") VALUES
  ('Main Salary', 9800000, '2026-02', 'Salary', 'income', 101, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('Freelance Project', 1250000, '2026-02', 'Business', 'income', 102, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('Groceries', 1600000, '2026-02', 'Food', 'outcome', 103, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('Transport', 700000, '2026-02', 'Transport', 'outcome', 104, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('Main Salary', 9800000, '2026-03', 'Salary', 'income', 201, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('Household Groceries', 1750000, '2026-03', 'Food', 'outcome', 203, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('Main Salary', 9800000, '2026-04', 'Salary', 'income', 301, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('Carry Over March', 1350000, '2026-04', 'Carry Over', 'carryover', 302, (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Cash logs for active demo user
INSERT INTO "CashLog" (
  "date",
  "description",
  "amount",
  "walletName",
  "excludeFromReport",
  "categoryId",
  "userId"
) VALUES
  ('2026-02-01', 'Salary payment', 9800000, 'BCA Payroll', false, (SELECT id FROM "Category" WHERE "name"='Main Salary' AND "type"='income' LIMIT 1), (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('2026-02-02', 'Apartment rent', 2500000, 'BCA Payroll', false, (SELECT id FROM "Category" WHERE "name"='Rentals' AND "type"='outcome' LIMIT 1), (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('2026-02-03', 'Groceries at GrandLucky', 268000, 'GoPay', false, (SELECT id FROM "Category" WHERE "name"='Groceries' AND "type"='outcome' LIMIT 1), (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('2026-03-01', 'Salary payment', 9800000, 'BCA Payroll', false, (SELECT id FROM "Category" WHERE "name"='Main Salary' AND "type"='income' LIMIT 1), (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('2026-03-03', 'Groceries at Ranch Market', 312000, 'GoPay', false, (SELECT id FROM "Category" WHERE "name"='Groceries' AND "type"='outcome' LIMIT 1), (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('2026-04-01', 'Salary payment', 9800000, 'BCA Payroll', false, (SELECT id FROM "Category" WHERE "name"='Main Salary' AND "type"='income' LIMIT 1), (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1)),
  ('2026-04-08', 'Family gift', 350000, 'Mandiri Savings', false, (SELECT id FROM "Category" WHERE "name"='Family Gift' AND "type"='outcome' LIMIT 1), (SELECT id FROM "User" WHERE "email"='demo.user@planify.local' LIMIT 1))
ON CONFLICT DO NOTHING;
