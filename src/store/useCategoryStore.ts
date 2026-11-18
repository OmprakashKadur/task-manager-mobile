import { create } from 'zustand';
import { Category } from '@/types';
import {
  getAllCategories,
  insertCategory,
  updateCategory as dbUpdateCategory,
  deleteCategory as dbDeleteCategory,
} from '@/db/categories';

interface CategoryState {
  categories: Category[];
  isLoaded: boolean;
  loadCategories: () => void;
  addCategory: (category: Omit<Category, 'is_default'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => boolean;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  isLoaded: false,

  loadCategories: () => {
    try {
      const categories = getAllCategories();
      set({ categories, isLoaded: true });
    } catch (e) {
      console.error('[CategoryStore] Failed to load categories:', e);
      set({ isLoaded: true });
    }
  },

  addCategory: (cat) => {
    insertCategory(cat);
    set({ categories: getAllCategories() });
  },

  updateCategory: (cat) => {
    dbUpdateCategory(cat);
    set({ categories: getAllCategories() });
  },

  deleteCategory: (id) => {
    const success = dbDeleteCategory(id);
    if (success) {
      set({ categories: getAllCategories() });
    }
    return success;
  },
}));

