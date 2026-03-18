// Reactive store for tasks
import { writable, derived } from 'svelte/store';
import { taskApi, type Task } from '../services/api';

function createTasksStore() {
  const { subscribe, set, update } = writable<Task[]>([]);

  return {
    subscribe,
    
    // Load all tasks for a filter
    async loadTasks(filter: 'today' | 'week' | 'overdue' | 'all' = 'all') {
      try {
        const tasks = await taskApi.getTasks(filter);
        set(tasks);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    },

    // Create a new task
    async create(
      title: string,
      description?: string,
      dueDate?: string,
      priority: 'low' | 'medium' | 'high' = 'medium',
      timeEstimate?: number,
      categoryId?: string
    ) {
      try {
        const newTask = await taskApi.createTask(title, description, dueDate, priority, timeEstimate, categoryId);
        update((tasks) => [...tasks, newTask]);
        return newTask;
      } catch (error) {
        console.error('Failed to create task:', error);
        throw error;
      }
    },

    // Update a task
    async update(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'status'>>) {
      try {
        await taskApi.updateTask(id, updates);
        update((tasks) =>
          tasks.map((task) => (task.id === id ? { ...task, ...updates } : task))
        );
      } catch (error) {
        console.error('Failed to update task:', error);
        throw error;
      }
    },

    // Delete a task
    async delete(id: string) {
      try {
        await taskApi.deleteTask(id);
        update((tasks) => tasks.filter((task) => task.id !== id));
      } catch (error) {
        console.error('Failed to delete task:', error);
        throw error;
      }
    },

    // Toggle task completion
    async toggleComplete(id: string, completed: boolean) {
      try {
        await taskApi.toggleTaskComplete(id, completed);
        update((tasks) =>
          tasks.map((task) =>
            task.id === id ? { ...task, status: completed ? 'completed' : 'active' } : task
          )
        );
      } catch (error) {
        console.error('Failed to toggle task completion:', error);
        throw error;
      }
    },

    // Toggle task focus status
    async toggleFocus(id: string, isFocus: boolean) {
      try {
        await taskApi.toggleFocus(id, isFocus);
        update((tasks) =>
          tasks.map((task) => (task.id === id ? { ...task, isFocus } : task))
        );
      } catch (error) {
        console.error('Failed to toggle focus:', error);
        throw error;
      }
    },

    // Search tasks
    async search(query: string, limit?: number) {
      try {
        const result = await taskApi.searchTasks(query, limit);
        set(result.tasks);
        return result.tasks;
      } catch (error) {
        console.error('Failed to search tasks:', error);
        throw error;
      }
    },
  };
}

export const tasks = createTasksStore();

// Derived stores for common filters
export const todaysTasks = derived(tasks, ($tasks) =>
  $tasks.filter((t) => t.status === 'active').sort((a, b) => {
    // Sort by focus first, then by due date, then by priority
    if (a.isFocus !== b.isFocus) return a.isFocus ? -1 : 1;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  })
);

export const overdueTasks = derived(tasks, ($tasks) => {
  const today = new Date().toISOString().split('T')[0];
  return $tasks.filter((t) => t.status === 'active' && t.dueDate && t.dueDate < today);
});

export const completedTasks = derived(tasks, ($tasks) =>
  $tasks.filter((t) => t.status === 'completed')
);

// Calculate total time estimate for active tasks (for capacity planning)
export const totalTimeEstimate = derived(tasks, ($tasks) => {
  return $tasks
    .filter((t) => t.status === 'active')
    .reduce((sum, t) => sum + (t.timeEstimate || 0), 0);
});
