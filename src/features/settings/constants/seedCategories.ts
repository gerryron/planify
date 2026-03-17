import { CategoryType } from '@/features/categories/types/category';

export type SeedCategorySpec = {
  name: string;
  type: CategoryType;
  parentName: string | null;
};

export const seedCategorySpecs: SeedCategorySpec[] = [
  { name: 'Salary', type: 'income', parentName: null },
  { name: 'Business', type: 'income', parentName: null },
  { name: 'Investment', type: 'income', parentName: null },
  { name: 'Transfer', type: 'income', parentName: null },
  { name: 'Gift', type: 'income', parentName: null },
  { name: 'Other Income', type: 'income', parentName: null },
  { name: 'Bills and Utilities', type: 'outcome', parentName: null },
  { name: 'Food', type: 'outcome', parentName: null },
  { name: 'Transport', type: 'outcome', parentName: null },
  { name: 'Health', type: 'outcome', parentName: null },
  { name: 'Education', type: 'outcome', parentName: null },
  { name: 'Lifestyle', type: 'outcome', parentName: null },
  { name: 'Gift & Donations', type: 'outcome', parentName: null },
  { name: 'Investment', type: 'outcome', parentName: null },
  { name: 'Transfer', type: 'outcome', parentName: null },
  { name: 'Main Salary', type: 'income', parentName: 'Salary' },
  { name: 'Overtime', type: 'income', parentName: 'Salary' },
  { name: 'Performance Bonus', type: 'income', parentName: 'Salary' },
  { name: 'Holiday Allowance', type: 'income', parentName: 'Salary' },
  { name: 'Consulting', type: 'income', parentName: 'Business' },
  { name: 'Service Revenue', type: 'income', parentName: 'Business' },
  { name: 'Selling', type: 'income', parentName: 'Business' },
  { name: 'Dividend', type: 'income', parentName: 'Investment' },
  { name: 'Interest', type: 'income', parentName: 'Investment' },
  { name: 'Capital Gain', type: 'income', parentName: 'Investment' },
  { name: 'Transfer In', type: 'income', parentName: 'Transfer' },
  { name: 'Wallet Transfer In', type: 'income', parentName: 'Transfer' },
  { name: 'Birthday Gift', type: 'income', parentName: 'Gift' },
  { name: 'Family Gift', type: 'income', parentName: 'Gift' },
  { name: 'Cashback', type: 'income', parentName: 'Other Income' },
  { name: 'Refund', type: 'income', parentName: 'Other Income' },
  { name: 'Miscellaneous Income', type: 'income', parentName: 'Other Income' },
  {
    name: 'Credit Card Bills',
    type: 'outcome',
    parentName: 'Bills and Utilities',
  },
  {
    name: 'Electricity Bills',
    type: 'outcome',
    parentName: 'Bills and Utilities',
  },
  { name: 'Gas Bills', type: 'outcome', parentName: 'Bills and Utilities' },
  { name: 'House Bills', type: 'outcome', parentName: 'Bills and Utilities' },
  {
    name: 'Internet Bills',
    type: 'outcome',
    parentName: 'Bills and Utilities',
  },
  { name: 'Phone Bills', type: 'outcome', parentName: 'Bills and Utilities' },
  { name: 'Rentals', type: 'outcome', parentName: 'Bills and Utilities' },
  {
    name: 'Streaming Service',
    type: 'outcome',
    parentName: 'Bills and Utilities',
  },
  { name: 'Water Bills', type: 'outcome', parentName: 'Bills and Utilities' },
  {
    name: 'Other Utility Bills',
    type: 'outcome',
    parentName: 'Bills and Utilities',
  },
  { name: 'Groceries', type: 'outcome', parentName: 'Food' },
  { name: 'Dining Out', type: 'outcome', parentName: 'Food' },
  { name: 'Snacks & Coffee', type: 'outcome', parentName: 'Food' },
  { name: 'Fuel', type: 'outcome', parentName: 'Transport' },
  { name: 'Public Transport', type: 'outcome', parentName: 'Transport' },
  { name: 'Parking', type: 'outcome', parentName: 'Transport' },
  { name: 'Insurance', type: 'outcome', parentName: 'Health' },
  { name: 'Medicine', type: 'outcome', parentName: 'Health' },
  { name: 'Sports', type: 'outcome', parentName: 'Health' },
  { name: 'Courses', type: 'outcome', parentName: 'Education' },
  { name: 'Books', type: 'outcome', parentName: 'Education' },
  { name: 'Tuition Fee', type: 'outcome', parentName: 'Education' },
  { name: 'Shopping', type: 'outcome', parentName: 'Lifestyle' },
  { name: 'Entertainment', type: 'outcome', parentName: 'Lifestyle' },
  { name: 'Movies', type: 'outcome', parentName: 'Lifestyle' },
  { name: 'Games', type: 'outcome', parentName: 'Lifestyle' },
  { name: 'Family Gift', type: 'outcome', parentName: 'Gift & Donations' },
  { name: 'Friends Gift', type: 'outcome', parentName: 'Gift & Donations' },
  { name: 'Charity', type: 'outcome', parentName: 'Gift & Donations' },
  {
    name: 'Religious Donation',
    type: 'outcome',
    parentName: 'Gift & Donations',
  },
  { name: 'Stock Purchase', type: 'outcome', parentName: 'Investment' },
  { name: 'Mutual Fund Purchase', type: 'outcome', parentName: 'Investment' },
  { name: 'Crypto Purchase', type: 'outcome', parentName: 'Investment' },
  { name: 'Tax', type: 'outcome', parentName: 'Investment' },
  { name: 'Transfer Out', type: 'outcome', parentName: 'Transfer' },
  { name: 'Wallet Transfer Out', type: 'outcome', parentName: 'Transfer' },
];

export function buildSeedCategoryKey(
  type: CategoryType,
  name: string,
  parentName: string | null,
) {
  return `${type}|${name}|${parentName ?? 'ROOT'}`;
}

export const seedCategoryKeys = new Set(
  seedCategorySpecs.map((item) =>
    buildSeedCategoryKey(item.type, item.name, item.parentName),
  ),
);
