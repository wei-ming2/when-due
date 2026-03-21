// Tauri IPC API wrapper for task and category commands
import { invoke } from '@tauri-apps/api/core';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  timeEstimate?: number;
  categoryId?: string;
  categoryIds?: string[];
  subtaskCount?: number;
  subtaskCompletedCount?: number;
  status: 'active' | 'completed' | 'archived';
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: 'low' | 'medium' | 'high';
  timeEstimate?: number | null;
  categoryId?: string | null;
  categoryIds?: string[] | null;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Task API calls
export const taskApi = {
  async getTasks(
    filter?: 'today' | 'week' | 'overdue' | 'all',
    includeCompleted: boolean = false
  ): Promise<Task[]> {
    try {
      const result = await invoke<{ tasks: Task[] }>('get_tasks', {
        filter,
        includeCompleted,
      });
      return result.tasks;
    } catch (error) {
      console.error('Failed to load tasks from the backend:', error);
      throw error;
    }
  },

  async createTask(
    title: string,
    description?: string,
    dueDate?: string,
    priority?: 'low' | 'medium' | 'high',
    timeEstimate?: number,
    categoryIds?: string[]
  ): Promise<Task> {
    const task = await invoke<Task>('create_task', {
      title,
      description,
      dueDate,
      priority,
      timeEstimate,
      categoryId: categoryIds?.[0],
      categoryIds,
    });
    return task;
  },

  async updateTask(
    id: string,
    updates: TaskUpdateInput
  ): Promise<{ success: boolean; updatedAt: string }> {
    const hasDescription = Object.prototype.hasOwnProperty.call(updates, 'description');
    const hasDueDate = Object.prototype.hasOwnProperty.call(updates, 'dueDate');
    const hasTimeEstimate = Object.prototype.hasOwnProperty.call(updates, 'timeEstimate');
    const hasCategoryId = Object.prototype.hasOwnProperty.call(updates, 'categoryId');
    const hasCategoryIds = Object.prototype.hasOwnProperty.call(updates, 'categoryIds');

    const result = await invoke<{ success: boolean; updatedAt: string }>('update_task', {
      id,
      title: updates.title,
      description: hasDescription && updates.description !== null ? updates.description : undefined,
      clearDescription: hasDescription && updates.description === null,
      dueDate: hasDueDate && updates.dueDate !== null ? updates.dueDate : undefined,
      clearDueDate: hasDueDate && updates.dueDate === null,
      priority: updates.priority,
      timeEstimate: hasTimeEstimate && updates.timeEstimate !== null ? updates.timeEstimate : undefined,
      clearTimeEstimate: hasTimeEstimate && updates.timeEstimate === null,
      categoryId: hasCategoryId && updates.categoryId !== null ? updates.categoryId : undefined,
      clearCategoryId: hasCategoryId && updates.categoryId === null,
      categoryIds: hasCategoryIds && updates.categoryIds !== null ? updates.categoryIds : undefined,
      clearCategoryIds: hasCategoryIds && updates.categoryIds === null,
    });
    return result;
  },

  async deleteTask(id: string): Promise<{ success: boolean }> {
    const result = await invoke<{ success: boolean }>('delete_task', { id });
    return result;
  },

  async toggleTaskComplete(id: string, completed: boolean): Promise<{ success: boolean; updatedAt: string }> {
    const result = await invoke<{ success: boolean; updatedAt: string }>('toggle_task_complete', {
      id,
      completed,
    });
    return result;
  },

  async archiveCompletedTasks(daysThreshold: number): Promise<{ success: boolean; archivedCount: number }> {
    const result = await invoke<{ success: boolean; archivedCount: number }>('archive_completed_tasks', {
      daysThreshold,
    });
    return result;
  },

  async searchTasks(query: string, limit?: number): Promise<{ tasks: Task[]; count: number }> {
    const result = await invoke<{ tasks: Task[]; count: number }>('search_tasks', {
      query,
      limit,
    });
    return result;
  },
};

// Category API calls
export const categoryApi = {
  async getCategories(): Promise<Category[]> {
    const result = await invoke<{ categories: Category[] }>('get_categories', {});
    return result.categories;
  },

  async createCategory(name: string, color: string, icon?: string): Promise<Category> {
    const category = await invoke<Category>('create_category', {
      name,
      color,
      icon,
    });
    return category;
  },

  async updateCategory(
    id: string,
    updates: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<{ success: boolean; updatedAt: string }> {
    const result = await invoke<{ success: boolean; updatedAt: string }>('update_category', {
      id,
      name: updates.name,
      color: updates.color,
      icon: updates.icon,
    });
    return result;
  },

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    const result = await invoke<{ success: boolean }>('delete_category', { id });
    return result;
  },
};

// Subtask API calls
export const subtaskApi = {
  async addSubtask(taskId: string, title: string, order?: number): Promise<Subtask> {
    const subtask = await invoke<Subtask>('add_subtask', {
      taskId,
      title,
      order,
    });
    return subtask;
  },

  async getSubtasks(taskId: string): Promise<Subtask[]> {
    const result = await invoke<{ subtasks: Subtask[] }>('get_subtasks', {
      taskId,
    });
    return result.subtasks;
  },

  async toggleSubtaskComplete(id: string, completed: boolean): Promise<{ success: boolean; updatedAt: string }> {
    const result = await invoke<{ success: boolean; updatedAt: string }>('toggle_subtask_complete', {
      id,
      completed,
    });
    return result;
  },

  async updateSubtask(id: string, title?: string, order?: number): Promise<{ success: boolean; updatedAt: string }> {
    const result = await invoke<{ success: boolean; updatedAt: string }>('update_subtask', {
      id,
      title,
      order,
    });
    return result;
  },

  async deleteSubtask(id: string): Promise<{ success: boolean }> {
    const result = await invoke<{ success: boolean }>('delete_subtask', { id });
    return result;
  },
};
