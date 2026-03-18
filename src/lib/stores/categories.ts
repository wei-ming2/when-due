// Reactive store for categories
import { writable } from 'svelte/store';
import { categoryApi, type Category } from '../services/api';

function createCategoriesStore() {
  const { subscribe, set, update } = writable<Category[]>([]);

  return {
    subscribe,

    // Load all categories
    async load() {
      try {
        const categories = await categoryApi.getCategories();
        set(categories);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    },

    // Create a new category
    async create(name: string, color: string, icon?: string) {
      try {
        const newCategory = await categoryApi.createCategory(name, color, icon);
        update((categories) => [...categories, newCategory]);
        return newCategory;
      } catch (error) {
        console.error('Failed to create category:', error);
        throw error;
      }
    },

    // Update a category
    async updateCategory(
      id: string,
      updates: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>
    ) {
      try {
        await categoryApi.updateCategory(id, updates);
        update((categories) =>
          categories.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
        );
      } catch (error) {
        console.error('Failed to update category:', error);
        throw error;
      }
    },

    // Delete a category
    async delete(id: string) {
      try {
        await categoryApi.deleteCategory(id);
        update((categories) => categories.filter((cat) => cat.id !== id));
      } catch (error) {
        console.error('Failed to delete category:', error);
        throw error;
      }
    },
  };
}

export const categories = createCategoriesStore();
