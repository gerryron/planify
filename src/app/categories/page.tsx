'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import CategoryList from '@/features/categories/components/CategoryList';
import CategoryForm from '@/features/categories/components/CategoryForm';
import { Category } from '@/features/categories/types/category';

export default function CategoriesPage() {
  const [editing, setEditing] = useState<Category | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const canUsePortal = typeof document !== 'undefined';

  const handleEdit = (category: Category) => {
    setEditing(category);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setEditing(null);
    setShowForm(false);
    setRefreshKey((key) => key + 1);
  };

  const handleCancel = () => {
    setEditing(null);
    setShowForm(false);
  };

  return (
    <div className='max-w-2xl mx-auto pt-0 pb-8 space-y-6'>
      <CategoryList
        key={refreshKey}
        onEdit={handleEdit}
        onAdd={handleAdd}
        onDataLoaded={setCategories}
      />

      {canUsePortal &&
        showForm &&
        createPortal(
          <div
            className='fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-4'
            onClick={handleCancel}
          >
            <div
              className='bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-[calc(100vw-1.5rem)] sm:min-w-[320px] sm:max-w-md relative'
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className='absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:text-slate-300 dark:hover:text-white text-2xl font-bold'
                onClick={handleCancel}
                aria-label='Close dialog'
              >
                ×
              </button>
              <CategoryForm
                key={editing ? editing.id : 'new'}
                initial={editing}
                categories={categories}
                onSuccess={handleSuccess}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
