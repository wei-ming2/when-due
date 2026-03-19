import type { Task } from '../services/api';
import type { FilterMode } from '../stores/ui';

export function getTaskFilterMode(task: Task, now: Date = new Date()): FilterMode {
  if (task.status !== 'active') return 'all';

  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    return 'all';
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const endOfWeekWindow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 7,
    23,
    59,
    59,
    999
  );

  if (dueDate < startOfToday) {
    return 'overdue';
  }

  if (dueDate <= endOfToday) {
    return 'today';
  }

  if (dueDate <= endOfWeekWindow) {
    return 'week';
  }

  return 'all';
}

export function matchesTaskFilterMode(
  task: Task,
  filterMode: FilterMode,
  now: Date = new Date()
): boolean {
  if (filterMode === 'all') {
    return true;
  }

  return getTaskFilterMode(task, now) === filterMode;
}
