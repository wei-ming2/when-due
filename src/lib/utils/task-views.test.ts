import { describe, expect, it } from 'vitest';
import type { Task } from '../services/api';
import { getTaskFilterMode, matchesTaskFilterMode } from './task-views';

function buildTask(overrides: Partial<Task>): Task {
  return {
    id: 'task-1',
    title: 'Task',
    priority: 'medium',
    status: 'active',
    createdAt: '2026-03-19T08:00:00.000Z',
    updatedAt: '2026-03-19T08:00:00.000Z',
    ...overrides,
  };
}

describe('task view routing', () => {
  const now = new Date('2026-03-19T10:00:00+08:00');

  it('routes tasks into overdue, today, upcoming, and all', () => {
    expect(
      getTaskFilterMode(buildTask({ dueDate: '2026-03-18T23:00:00+08:00' }), now)
    ).toBe('overdue');
    expect(
      getTaskFilterMode(buildTask({ dueDate: '2026-03-19T23:00:00+08:00' }), now)
    ).toBe('today');
    expect(
      getTaskFilterMode(buildTask({ dueDate: '2026-03-23T09:00:00+08:00' }), now)
    ).toBe('week');
    expect(
      getTaskFilterMode(buildTask({ dueDate: '2026-04-05T09:00:00+08:00' }), now)
    ).toBe('all');
    expect(getTaskFilterMode(buildTask({ dueDate: undefined }), now)).toBe('all');
  });

  it('matches all tasks against the all filter', () => {
    const task = buildTask({ dueDate: undefined });
    expect(matchesTaskFilterMode(task, 'all', now)).toBe(true);
    expect(matchesTaskFilterMode(task, 'today', now)).toBe(false);
  });
});
