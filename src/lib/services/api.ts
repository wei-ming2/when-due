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
  status: 'active' | 'completed' | 'archived';
  isFocus: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
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
  async getTasks(filter?: 'today' | 'week' | 'overdue' | 'all'): Promise<Task[]> {
    try {
      console.log(`[API] Calling get_tasks with filter: ${filter}`);
      const result = await invoke<{ tasks: Task[] }>('get_tasks', { filter });
      console.log(`[API] get_tasks response:`, result);
      return result.tasks;
    } catch (error) {
      console.error('[API] get_tasks failed:', error);
      throw error;
    }
  },

  async createTask(
    title: string,
    description?: string,
    dueDate?: string,
    priority?: 'low' | 'medium' | 'high',
    timeEstimate?: number,
    categoryId?: string
  ): Promise<Task> {
    const task = await invoke<Task>('create_task', {
      title,
      description,
      due_date: dueDate,
      priority,
      time_estimate: timeEstimate,
      category_id: categoryId,
    });
    return task;
  },

  async updateTask(
    id: string,
    updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status'>>
  ): Promise<{ success: boolean; updatedAt: string }> {
    const result = await invoke<{ success: boolean; updatedAt: string }>('update_task', {
      id,
      title: updates.title,
      description: updates.description,
      due_date: updates.dueDate,
      priority: updates.priority,
      time_estimate: updates.timeEstimate,
      category_id: updates.categoryId,
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

  async toggleFocus(id: string, isFocus: boolean): Promise<{ success: boolean; updatedAt: string }> {
    const result = await invoke<{ success: boolean; updatedAt: string }>('toggle_focus', {
      id,
      is_focus: isFocus,
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
      task_id: taskId,
      title,
      order,
    });
    return subtask;
  },

  async getSubtasks(taskId: string): Promise<Subtask[]> {
    const result = await invoke<{ subtasks: Subtask[] }>('get_subtasks', {
      task_id: taskId,
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
