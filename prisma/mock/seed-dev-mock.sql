-- DEV MOCK DATA SEED
-- Safe to rerun: uses fixed mock IDs and INSERT OR IGNORE

-- Mock Wallets
INSERT OR IGNORE INTO "Wallet" ("id", "name", "balance", "excludeFromTotal", "sortOrder") VALUES
  ('mock-wallet-001', 'MOCK - BCA', 3250000, false, 101),
  ('mock-wallet-002', 'MOCK - E-Wallet', 780000, false, 102),
  ('mock-wallet-003', 'MOCK - Travel Fund', 1200000, true, 103);

-- Mock Monthly Budgets
INSERT OR IGNORE INTO "MonthlyBudget" ("id", "name", "amount", "month", "category", "type", "sortOrder") VALUES
  ('mock-budget-001', 'MOCK Budget Salary', 9000000, '2026-02', 'Salary', 'income', 101),
  ('mock-budget-002', 'MOCK Budget Food', 1500000, '2026-02', 'Food', 'outcome', 102),
  ('mock-budget-003', 'MOCK Budget Transport', 700000, '2026-02', 'Transport', 'outcome', 103);

-- Mock Cash Logs (12 records, varied)
INSERT OR IGNORE INTO "CashLog" (
  "id",
  "date",
  "description",
  "amount",
  "walletName",
  "excludeFromReport",
  "categoryId"
) VALUES
  ('mock-cashlog-001', '2026-02-01', 'MOCK Salary February', 8500000, 'MOCK - BCA', false, 'seed-v3-income-salary-main'),
  ('mock-cashlog-002', '2026-02-02', 'MOCK Groceries Week 1', -245000, 'MOCK - E-Wallet', false, 'seed-v3-outcome-food-groceries'),
  ('mock-cashlog-003', '2026-02-03', 'MOCK Coffee & Snacks', -68000, 'MOCK - E-Wallet', false, 'seed-v3-outcome-food-snacks'),
  ('mock-cashlog-004', '2026-02-04', 'MOCK Fuel Refill', -210000, 'MOCK - BCA', false, 'seed-v3-outcome-transport-fuel'),
  ('mock-cashlog-005', '2026-02-05', 'MOCK Transfer to Savings', -500000, 'MOCK - BCA', true, 'seed-v3-outcome-transfer-out'),
  ('mock-cashlog-006', '2026-02-06', 'MOCK Cashback Promo', 32000, 'MOCK - E-Wallet', false, 'seed-v3-income-other-cashback'),
  ('mock-cashlog-007', '2026-02-08', 'MOCK Dining Out', -175000, 'MOCK - E-Wallet', false, 'seed-v3-outcome-food-dining'),
  ('mock-cashlog-008', '2026-02-10', 'MOCK Internet Bill', -389000, 'MOCK - BCA', false, 'seed-v3-outcome-bills-internet'),
  ('mock-cashlog-009', '2026-02-12', 'MOCK Dividend Income', 275000, 'MOCK - BCA', false, 'seed-v3-income-investment-dividend'),
  ('mock-cashlog-010', '2026-02-15', 'MOCK Movie Night', -120000, 'MOCK - E-Wallet', false, 'seed-v3-outcome-lifestyle-movies'),
  ('mock-cashlog-011', '2026-02-18', 'MOCK Wallet Transfer In', 400000, 'MOCK - Travel Fund', true, 'seed-v3-income-transfer-wallet'),
  ('mock-cashlog-012', '2026-02-21', 'MOCK Flight Ticket', -950000, 'MOCK - Travel Fund', false, 'seed-v3-outcome-transport-public');
