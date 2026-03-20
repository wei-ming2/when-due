// Reactive store for tasks
import { writable, derived } from 'svelte/store';
import { taskApi, type Task, type TaskUpdateInput } from '../services/api';
import { shouldIncludeTask, sortTasksForDeadlineList } from '../utils/task-list';

function createTasksStore() {
  const { subscribe, set, update } = writable<Task[]>([]);

  return {
    subscribe,
    
    // Load all tasks for a filter
    async loadTasks(
      filter: 'today' | 'week' | 'overdue' | 'all' = 'all',
      includeCompleted: boolean = false
    ) {
      try {
        console.log(`[Tasks Store] Loading tasks with filter: ${filter}, includeCompleted: ${includeCompleted}`);
        const tasks = await taskApi.getTasks(filter, includeCompleted);
        console.log(`[Tasks Store] Loaded ${tasks.length} tasks:`, tasks);
        set(tasks);
      } catch (error) {
        console.error('[Tasks Store] Failed to load tasks:', error);
        throw error;
      }
    },

    // Create a new task
    async create(
      title: string,
      description?: string,
      dueDate?: string,
      priority: 'low' | 'medium' | 'high' = 'medium',
      timeEstimate?: number,
      categoryIds?: string[],
      options: { addToStore?: boolean; optimistic?: boolean } = {}
    ) {
      const addToStore = options.addToStore ?? true;
      const optimistic = options.optimistic ?? addToStore;
      const normalizedCategoryIds = categoryIds ? [...new Set(categoryIds.filter(Boolean))] : [];
      const now = new Date().toISOString();
      const optimisticId = `temp-${crypto.randomUUID()}`;
      const optimisticTask: Task | null =
        addToStore && optimistic
          ? {
              id: optimisticId,
              title,
              description,
              dueDate,
              priority,
              timeEstimate,
              categoryId: normalizedCategoryIds[0],
              categoryIds: normalizedCategoryIds,
              status: 'active',
              createdAt: now,
              updatedAt: now,
              subtaskCount: 0,
              subtaskCompletedCount: 0,
            }
          : null;

      try {
        if (optimisticTask) {
          update((tasks) => [...tasks, optimisticTask]);
        }

        const newTask = await taskApi.createTask(
          title,
          description,
          dueDate,
          priority,
          timeEstimate,
          normalizedCategoryIds
        );

        if (addToStore) {
          update((tasks) => {
            if (optimisticTask) {
              return tasks.map((task) => (task.id === optimisticId ? newTask : task));
            }

            return [...tasks, newTask];
          });
        }

        return newTask;
      } catch (error) {
        if (optimisticTask) {
          update((tasks) => tasks.filter((task) => task.id !== optimisticId));
        }

        console.error('Failed to create task:', error);
        throw error;
      }
    },

    // Update a task
    async update(id: string, updates: TaskUpdateInput) {
      try {
        const result = await taskApi.updateTask(id, updates);
        const normalizedUpdates = normalizeTaskUpdateForStore(updates);
        update((tasks) =>
          tasks.map((task) =>
            task.id === id ? { ...task, ...normalizedUpdates, updatedAt: result.updatedAt } : task
          )
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
        const result = await taskApi.toggleTaskComplete(id, completed);
        const completedAt = completed ? result.updatedAt : undefined;
        update((tasks) =>
          tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: completed ? 'completed' : 'active',
                  completedAt,
                  updatedAt: result.updatedAt,
                }
              : task
          )
        );
      } catch (error) {
        console.error('Failed to toggle task completion:', error);
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

    patchLocal(id: string, updates: Partial<Task>) {
      update((tasks) =>
        tasks.map((task) => (task.id === id ? { ...task, ...updates } : task))
      );
    },
  };
}

export const tasks = createTasksStore();

// Import UI state to check showCompleted setting
import { uiState } from './ui';

// Derived stores for common filters
export const visibleTasks = derived(
  [tasks, uiState],
  ([$tasks, $uiState]) => {
    const filtered = $tasks.filter((task) =>
      shouldIncludeTask(task, {
        selectedPriorities: $uiState.selectedPriorities,
        selectedCategoryId: $uiState.selectedCategoryId,
        showCompleted: $uiState.showCompleted,
        completedRetentionDays: $uiState.completedRetentionDays,
      })
    );

    return sortTasksForDeadlineList(filtered);
  }
);

export const todaysTasks = visibleTasks;

export const completedTasks = derived(tasks, ($tasks) =>
  $tasks.filter((t) => t.status === 'completed')
);

// Calculate total time estimate for active visible tasks (for capacity planning)
export const totalTimeEstimate = derived(visibleTasks, ($tasks) => {
  return $tasks
    .filter((t) => t.status === 'active')
    .reduce((sum, t) => sum + (t.timeEstimate || 0), 0);
});

function normalizeTaskUpdateForStore(updates: TaskUpdateInput): Partial<Task> {
  const normalized: Partial<Task> = {};

  if (Object.prototype.hasOwnProperty.call(updates, 'title') && updates.title !== undefined) {
    normalized.title = updates.title;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
    normalized.description = updates.description ?? undefined;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'dueDate')) {
    normalized.dueDate = updates.dueDate ?? undefined;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'priority') && updates.priority !== undefined) {
    normalized.priority = updates.priority;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'timeEstimate')) {
    normalized.timeEstimate = updates.timeEstimate ?? undefined;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'categoryId')) {
    normalized.categoryId = updates.categoryId ?? undefined;
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'categoryIds')) {
    normalized.categoryIds = updates.categoryIds ?? [];
    normalized.categoryId = updates.categoryIds?.[0] ?? undefined;
  }

  return normalized;
}
