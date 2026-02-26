export type CategoryType = 'income' | 'outcome';

export interface CategoryInput {
  name: string;
  type: CategoryType;
  parentId?: string | null;
}

export interface Category extends CategoryInput {
  id: string;
  parentId: string | null;
}
