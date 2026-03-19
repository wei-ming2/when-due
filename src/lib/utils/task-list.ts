import type { Task } from '../services/api';

interface VisibilityOptions {
  selectedPriorities: Set<string>;
  selectedCategoryId?: string;
  showCompleted: boolean;
  completedRetentionDays: number;
  now?: Date;
}

export function shouldIncludeTask(task: Task, options: VisibilityOptions): boolean {
  const {
    selectedPriorities,
    selectedCategoryId,
    showCompleted,
  } = options;

  const matchesPriority =
    selectedPriorities.size === 0 || selectedPriorities.has(task.priority);
  const categoryIds =
    task.categoryIds && task.categoryIds.length > 0
      ? task.categoryIds
      : task.categoryId
        ? [task.categoryId]
        : [];
  const matchesCategory =
    !selectedCategoryId || categoryIds.includes(selectedCategoryId);

  if (!matchesPriority || !matchesCategory) {
    return false;
  }

  if (task.status === 'active') {
    return true;
  }

  if (task.status === 'completed') {
    return showCompleted;
  }

  return false;
}

export function sortTasksForDeadlineList(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;

    if (a.status === 'completed' && b.status === 'completed') {
      const aCompleted = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bCompleted = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bCompleted - aCompleted;
    }

    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
