'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  EllipsisVertical,
  Pencil,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { categoryService } from '@/features/categories/services/categoryService';
import { Category } from '@/features/categories/types/category';
import { CategoryTreeNode } from '@/features/categories/types/categoryTree';
import { useConfirm } from '@/shared/ui/ConfirmDialog';

interface CategoryListProps {
  onEdit: (category: Category) => void;
  onAdd?: () => void;
  refreshKey?: number;
  onDataLoaded?: (categories: Category[]) => void;
}

function MenuActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuAlign, setMenuAlign] = useState<'left' | 'right'>('right');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggleMenu = () => {
    if (!open) {
      const triggerRect = containerRef.current?.getBoundingClientRect();
      if (triggerRect) {
        const estimatedMenuWidth = 180;
        const viewportPadding = 12;
        const hasLeftOverflowRisk =
          triggerRect.right - estimatedMenuWidth < viewportPadding;
        setMenuAlign(hasLeftOverflowRisk ? 'left' : 'right');
      }
    }

    setOpen((value) => !value);
  };

  return (
    <div ref={containerRef} className='relative'>
      <button
        className='p-2 rounded hover:bg-emerald-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200'
        aria-label='Action'
        type='button'
        onClick={handleToggleMenu}
      >
        <EllipsisVertical size={16} />
      </button>
      {open && (
        <div
          className={
            'absolute top-10 z-10 min-w-36 max-w-[calc(100vw-1.5rem)] rounded-md border border-emerald-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md ' +
            (menuAlign === 'left' ? 'left-0' : 'right-0')
          }
        >
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-emerald-100 dark:hover:bg-slate-700 flex items-center gap-2'
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            type='button'
          >
            <Pencil size={16} />
            Edit
          </button>
          <button
            className='w-full px-3 py-2 text-left text-sm hover:bg-emerald-100 dark:hover:bg-slate-700 flex items-center gap-2 text-red-600 dark:text-red-400'
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            type='button'
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function CategoryList({
  onEdit,
  onAdd,
  refreshKey = 0,
  onDataLoaded,
}: CategoryListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'income' | 'outcome'>('income');
  const confirm = useConfirm();

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await categoryService.getAll();
        setCategories(data);
        onDataLoaded?.(data);
      } catch {
        setError('Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [refreshKey, onDataLoaded]);

  const handleDelete = async (id: number) => {
    if (!await confirm({
      title: 'Delete category?',
      description: 'Deleted category cannot be restored.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    })) return;

    try {
      await categoryService.remove(id);
      toast.success('Category deleted successfully.');
      const data = await categoryService.getAll();
      setCategories(data);
      onDataLoaded?.(data);
    } catch {
      toast.error('Failed to delete category.');
    }
  };

  const groupedCategories = useMemo(() => {
    const sortByName = (items: CategoryTreeNode[]) =>
      [...items].sort((a, b) => a.name.localeCompare(b.name));

    const byId = new Map<number, Category>();
    categories.forEach((category) => byId.set(category.id, category));

    const rootByType: Record<'income' | 'outcome', CategoryTreeNode[]> = {
      income: [],
      outcome: [],
    };

    categories.forEach((category) => {
      if (category.parentId) return;
      rootByType[category.type].push({ ...category, children: [] });
    });

    const rootNodeById = new Map<number, CategoryTreeNode>();
    rootByType.income.forEach((node) => rootNodeById.set(node.id, node));
    rootByType.outcome.forEach((node) => rootNodeById.set(node.id, node));

    categories.forEach((category) => {
      if (!category.parentId) return;

      const parent = byId.get(category.parentId);
      if (!parent || parent.parentId !== null) return;

      const rootNode = rootNodeById.get(parent.id);
      if (!rootNode) return;

      rootNode.children.push(category);
    });

    rootByType.income.forEach((node) =>
      node.children.sort((a, b) => a.name.localeCompare(b.name)),
    );
    rootByType.outcome.forEach((node) =>
      node.children.sort((a, b) => a.name.localeCompare(b.name)),
    );

    rootByType.income = sortByName(rootByType.income);
    rootByType.outcome = sortByName(rootByType.outcome);

    return rootByType;
  }, [categories]);

  if (error) {
    return <div className='text-red-500'>{error}</div>;
  }

  const activeCategories = groupedCategories[activeTab];

  return (
    <div className='w-full'>
      <div className='md:sticky md:top-0 z-40 bg-emerald-50 dark:bg-slate-900 pt-1 pb-2'>
        <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-2'>
          <div>
            <div className='text-2xl font-semibold'>Categories</div>
          </div>
          {onAdd && (
            <button
              className='w-full md:w-auto min-h-11 px-4 py-2.5 bg-emerald-600 text-white rounded shadow hover:bg-emerald-800 transition'
              onClick={onAdd}
              type='button'
            >
              + Add Category
            </button>
          )}
        </div>
      </div>

      <Card className='shadow'>
        <CardContent>
          <div className='mb-4 w-full'>
            <div className='relative w-full rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 overflow-hidden'>
              <span
                className={
                  'absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded transition-all duration-300 ease-out ' +
                  (activeTab === 'income' ? 'bg-emerald-500 ' : 'bg-red-500 ') +
                  (activeTab === 'income' ? 'translate-x-0' : 'translate-x-full')
                }
                aria-hidden='true'
              />
              <div className='relative z-10 grid grid-cols-2'>
                <button
                  type='button'
                  onClick={() => setActiveTab('income')}
                  className={
                    'rounded px-3 py-2.5 text-sm transition-colors duration-500 ' +
                    (activeTab === 'income'
                      ? 'text-white dark:text-slate-900'
                      : 'text-gray-700 dark:text-gray-200')
                  }
                >
                  Income
                </button>
                <button
                  type='button'
                  onClick={() => setActiveTab('outcome')}
                  className={
                    'rounded px-3 py-2.5 text-sm transition-colors duration-500 ' +
                    (activeTab === 'outcome'
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-200')
                  }
                >
                  Outcome
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className='min-h-56 flex items-center justify-center'>
              <RefreshCw
                className='animate-spin text-emerald-600 dark:text-emerald-400'
                size={24}
              />
            </div>
          ) : (
            <div>
              {activeCategories.length === 0 ? (
                <div className='text-gray-500 dark:text-gray-300'>
                  No categories found.
                </div>
              ) : (
                <ul className='space-y-3'>
                  {activeCategories.map((category, index) => (
                    <li key={category.id}>
                      <div className='px-1 py-1 text-gray-800 dark:text-gray-100 flex items-center justify-between'>
                        <span className='font-semibold'>{category.name}</span>
                        <MenuActions
                          onEdit={() => onEdit(category)}
                          onDelete={() => handleDelete(category.id)}
                        />
                      </div>

                      {category.children.length > 0 && (
                        <ul className='mt-2 ml-1'>
                          {category.children.map((child, childIndex) => (
                            <li
                              key={child.id}
                              className='relative py-2 pl-7 text-gray-700 dark:text-gray-200 flex items-center justify-between'
                            >
                              <span
                                className='absolute left-0 top-1/2 -translate-y-1/2 h-px w-5 bg-emerald-200 dark:bg-emerald-700'
                                aria-hidden='true'
                              />
                              <span
                                className={
                                  'absolute left-0 w-px bg-emerald-200 dark:bg-emerald-700 ' +
                                  (childIndex === category.children.length - 1
                                    ? 'top-0 h-1/2'
                                    : 'top-0 bottom-0')
                                }
                                aria-hidden='true'
                              />
                              <span>{child.name}</span>
                              <MenuActions
                                onEdit={() => onEdit(child)}
                                onDelete={() => handleDelete(child.id)}
                              />
                            </li>
                          ))}
                        </ul>
                      )}

                      {index < activeCategories.length - 1 && (
                        <div className='h-0.5 bg-emerald-200 dark:bg-emerald-800 mt-2' />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
