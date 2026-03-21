// Reactive store for categories
import { writable } from 'svelte/store';
import { categoryApi, type Category } from '../services/api';

function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

function createCategoriesStore() {
  const { subscribe, set, update } = writable<Category[]>([]);

  async function reloadCategories() {
    const categories = await categoryApi.getCategories();
    set(sortCategories(categories));
  }

  return {
    subscribe,

    // Load all categories
    async load() {
      try {
        await reloadCategories();
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    },

    // Create a new category
    async create(name: string, color: string, icon?: string) {
      try {
        const newCategory = await categoryApi.createCategory(name, color, icon);
        update((categories) => sortCategories([...categories, newCategory]));
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
          sortCategories(categories.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat)))
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

    async reorder(orderedIds: string[]) {
      const nextLookup = new Map(orderedIds.map((id, index) => [id, index]));

      update((categories) =>
        sortCategories(
          categories.map((category) =>
            nextLookup.has(category.id)
              ? { ...category, sortOrder: nextLookup.get(category.id) ?? category.sortOrder }
              : category
          )
        )
      );

      try {
        await categoryApi.reorderCategories(orderedIds);
        await reloadCategories();
      } catch (error) {
        console.error('Failed to reorder categories:', error);
        await reloadCategories();
        throw error;
      }
    },
  };
}

export const categories = createCategoriesStore();
