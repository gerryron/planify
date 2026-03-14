export type CategoryType = 'income' | 'outcome';

export interface CategoryInput {
  name: string;
  type: CategoryType;
  parentId?: number | null;
}

export interface Category extends CategoryInput {
  id: number;
  parentId: number | null;
}
