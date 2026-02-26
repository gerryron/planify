import { Category } from '@/features/categories/types/category';

export type CategoryTreeNode = Category & { children: Category[] };
