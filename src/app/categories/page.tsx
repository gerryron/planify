'use client';

import { useState } from 'react';
import CategoryList from '@/features/categories/components/CategoryList';
import CategoryForm from '@/features/categories/components/CategoryForm';
import { Category } from '@/features/categories/types/category';

export default function CategoriesPage() {
  const [editing, setEditing] = useState<Category | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

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
    <div className='max-w-2xl mx-auto py-8 space-y-6'>
      <CategoryList
        key={refreshKey}
        onEdit={handleEdit}
        onAdd={handleAdd}
        onDataLoaded={setCategories}
      />

      {showForm && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
          onClick={handleCancel}
        >
          <div
            className='bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 min-w-[320px] max-w-md w-full relative'
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className='absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-white text-2xl font-bold'
              onClick={handleCancel}
              aria-label='Tutup'
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
        </div>
      )}
    </div>
  );
}
