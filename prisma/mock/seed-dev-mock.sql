-- Development sample data seed
-- Compatible with INTEGER AUTOINCREMENT ids

-- Wallets
INSERT OR IGNORE INTO "Wallet" ("name", "balance", "excludeFromTotal", "sortOrder") VALUES
  ('BCA Payroll', 6845000, false, 101),
  ('Cash', 465000, false, 102),
  ('GoPay', 325000, false, 103),
  ('Mandiri Savings', 12350000, false, 104),
  ('Travel Fund', 2750000, true, 105),
  ('Emergency Fund', 8500000, true, 106);

-- Monthly budgets
INSERT OR IGNORE INTO "MonthlyBudget" ("name", "amount", "month", "category", "type", "sortOrder") VALUES
  ('Main Salary', 9800000, '2026-02', 'Salary', 'income', 101),
  ('Freelance Project', 1250000, '2026-02', 'Business', 'income', 102),
  ('Groceries', 1600000, '2026-02', 'Food', 'outcome', 103),
  ('Transport', 700000, '2026-02', 'Transport', 'outcome', 104),
  ('Internet and Utilities', 420000, '2026-02', 'Bills and Utilities', 'outcome', 105),
  ('Main Salary', 9800000, '2026-03', 'Salary', 'income', 201),
  ('Performance Bonus', 1500000, '2026-03', 'Salary', 'income', 202),
  ('Household Groceries', 1750000, '2026-03', 'Food', 'outcome', 203),
  ('Rent and Bills', 3150000, '2026-03', 'Bills and Utilities', 'outcome', 204),
  ('Weekend and Leisure', 650000, '2026-03', 'Lifestyle', 'outcome', 205),
  ('Investment Top Up', 1000000, '2026-03', 'Investment', 'outcome', 206),
  ('Main Salary', 9800000, '2026-04', 'Salary', 'income', 301),
  ('Carry Over March', 1350000, '2026-04', 'Carry Over', 'carryover', 302),
  ('Family Trip', 2200000, '2026-04', 'Transport', 'outcome', 303),
  ('Home Utilities', 700000, '2026-04', 'Bills and Utilities', 'outcome', 304),
  ('Charity and Giving', 300000, '2026-04', 'Gift & Donations', 'outcome', 305);

-- Helper style: category lookup by name + type
-- Cash logs
INSERT OR IGNORE INTO "CashLog" (
  "date",
  "description",
  "amount",
  "walletName",
  "excludeFromReport",
  "categoryId"
) VALUES
  ('2026-02-01', 'Salary payment', 9800000, 'BCA Payroll', false, (SELECT id FROM "Category" WHERE "name"='Main Salary' AND "type"='income' LIMIT 1)),
  ('2026-02-02', 'Apartment rent', -2500000, 'BCA Payroll', false, (SELECT id FROM "Category" WHERE "name"='Rentals' AND "type"='outcome' LIMIT 1)),
  ('2026-02-03', 'Groceries at GrandLucky', -268000, 'GoPay', false, (SELECT id FROM "Category" WHERE "name"='Groceries' AND "type"='outcome' LIMIT 1)),
  ('2026-02-04', 'Morning coffee', -38000, 'Cash', false, (SELECT id FROM "Category" WHERE "name"='Snacks & Coffee' AND "type"='outcome' LIMIT 1)),
  ('2026-02-05', 'Fuel refill', -240000, 'BCA Payroll', false, (SELECT id FROM "Category" WHERE "name"='Fuel' AND "type"='outcome' LIMIT 1)),
  ('2026-02-06', 'Transfer to travel budget', -750000, 'BCA Payroll', true, (SELECT id FROM "Category" WHERE "name"='Wallet Transfer Out' AND "type"='outcome' LIMIT 1)),
  ('2026-02-06', 'Travel fund top up', 750000, 'Travel Fund', true, (SELECT id FROM "Category" WHERE "name"='Wallet Transfer In' AND "type"='income' LIMIT 1)),
  ('2026-02-08', 'Internet subscription', -389000, 'BCA Payroll', false, (SELECT id FROM "Category" WHERE "name"='Internet Bills' AND "type"='outcome' LIMIT 1)),
  ('2026-02-10', 'Dividend payout', 315000, 'Mandiri Savings', false, (SELECT id FROM "Category" WHERE "name"='Dividend' AND "type"='income' LIMIT 1)),
  ('2026-02-12', 'Dinner with clients', -265000, 'GoPay', false, (SELECT id FROM "Category" WHERE "name"='Dining Out' AND "type"='outcome' LIMIT 1)),
  ('2026-02-14', 'Movie night', -95000, 'GoPay', false, (SELECT id FROM "Category" WHERE "name"='Movies' AND "type"='outcome' LIMIT 1)),
  ('2026-02-18', 'Marketplace refund', 124000, 'GoPay', false, (SELECT id FROM "Category" WHERE "name"='Refund' AND "type"='income' LIMIT 1)),
  ('2026-03-01', 'Salary payment', 9800000, 'BCA Payroll', false, (SELECT id FROM "Category" WHERE "name"='Main Salary' AND "type"='income' LIMIT 1)),
  ('2026-03-02', 'Landing page project', 1750000, 'Mandiri Savings', false, (SELECT id FROM "Category" WHERE "name"='Consulting' AND "type"='income' LIMIT 1)),
  ('2026-03-03', 'Groceries at Ranch Market', -312000, 'GoPay', false, (SELECT id FROM "Category" WHERE "name"='Groceries' AND "type"='outcome' LIMIT 1)),
  ('2026-03-05', 'Electricity bill', -276000, 'BCA Payroll', false, (SELECT id FROM "Category" WHERE "name"='Electricity Bills' AND "type"='outcome' LIMIT 1)),
  ('2026-03-07', 'Pharmacy purchase', -148000, 'Cash', false, (SELECT id FROM "Category" WHERE "name"='Medicine' AND "type"='outcome' LIMIT 1)),
  ('2026-03-09', 'Weekend brunch', -172000, 'GoPay', false, (SELECT id FROM "Category" WHERE "name"='Dining Out' AND "type"='outcome' LIMIT 1)),
  ('2026-03-11', 'Office parking', -45000, 'Cash', false, (SELECT id FROM "Category" WHERE "name"='Parking' AND "type"='outcome' LIMIT 1)),
  ('2026-03-13', 'Streaming services', -169000, 'BCA Payroll', false, (SELECT id FROM "Category" WHERE "name"='Streaming Service' AND "type"='outcome' LIMIT 1)),
  ('2026-03-17', 'Ride-hailing cashback', 28000, 'GoPay', false, (SELECT id FROM "Category" WHERE "name"='Cashback' AND "type"='income' LIMIT 1)),
  ('2026-03-20', 'Mutual fund top up', -1000000, 'Mandiri Savings', false, (SELECT id FROM "Category" WHERE "name"='Mutual Fund Purchase' AND "type"='outcome' LIMIT 1)),
  ('2026-04-01', 'Salary payment', 9800000, 'BCA Payroll', false, (SELECT id FROM "Category" WHERE "name"='Main Salary' AND "type"='income' LIMIT 1)),
  ('2026-04-03', 'Holiday allowance', 2200000, 'Mandiri Savings', false, (SELECT id FROM "Category" WHERE "name"='Holiday Allowance' AND "type"='income' LIMIT 1)),
  ('2026-04-04', 'Flight ticket to Singapore', -1850000, 'Travel Fund', false, (SELECT id FROM "Category" WHERE "name"='Public Transport' AND "type"='outcome' LIMIT 1)),
  ('2026-04-06', 'Hotel deposit', -950000, 'Travel Fund', false, (SELECT id FROM "Category" WHERE "name"='Rentals' AND "type"='outcome' LIMIT 1)),
  ('2026-04-08', 'Family gift', -350000, 'Mandiri Savings', false, (SELECT id FROM "Category" WHERE "name"='Family Gift' AND "type"='outcome' LIMIT 1)),
  ('2026-04-10', 'Charity donation', -200000, 'Cash', false, (SELECT id FROM "Category" WHERE "name"='Charity' AND "type"='outcome' LIMIT 1)),
  ('2026-04-12', 'Portfolio dividend', 420000, 'Mandiri Savings', false, (SELECT id FROM "Category" WHERE "name"='Dividend' AND "type"='income' LIMIT 1)),
  ('2026-04-15', 'Airport transfer', -180000, 'Travel Fund', false, (SELECT id FROM "Category" WHERE "name"='Public Transport' AND "type"='outcome' LIMIT 1)),
  ('2026-04-18', 'Airline refund', 275000, 'Travel Fund', false, (SELECT id FROM "Category" WHERE "name"='Refund' AND "type"='income' LIMIT 1));
