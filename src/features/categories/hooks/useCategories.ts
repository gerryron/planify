import { useQuery } from '@tanstack/react-query';
import { categoryService } from '../services/categoryService';
import type { Category } from '../types/category';
import { QUERY_KEYS } from '@/lib/queryClient';

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: () => categoryService.getAll(),
    staleTime: 30 * 60 * 1000, // 30 menit – kategori jarang berubah
  });
}
