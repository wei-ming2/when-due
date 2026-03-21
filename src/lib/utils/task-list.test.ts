import { describe, expect, it } from 'vitest';
import type { Task } from '../services/api';
import { shouldIncludeTask, sortTasksForDeadlineList, sortTasksForDeadlineListByMode } from './task-list';

function buildTask(overrides: Partial<Task>): Task {
  return {
    id: crypto.randomUUID(),
    title: 'Task',
    priority: 'medium',
    status: 'active',
    createdAt: '2026-03-19T08:00:00.000Z',
    updatedAt: '2026-03-19T08:00:00.000Z',
    ...overrides,
  };
}

describe('task list visibility', () => {
  const options = {
    selectedPriorities: new Set<string>(),
    showCompleted: false,
    completedRetentionDays: 7,
    now: new Date('2026-03-19T10:00:00+08:00'),
  };

  it('hides completed tasks when show completed is off', () => {
    const task = buildTask({
      status: 'completed',
      completedAt: '2026-03-17T09:00:00+08:00',
    });

    expect(shouldIncludeTask(task, options)).toBe(false);
  });

  it('shows completed tasks when explicitly enabled', () => {
    const task = buildTask({
      status: 'completed',
      completedAt: '2026-03-01T09:00:00+08:00',
    });

    expect(shouldIncludeTask(task, { ...options, showCompleted: true })).toBe(true);
  });

  it('matches tasks by any assigned tag', () => {
    const task = buildTask({
      categoryIds: ['chem', 'algorithms'],
    });

    expect(
      shouldIncludeTask(task, {
        ...options,
        selectedCategoryId: 'algorithms',
      })
    ).toBe(true);
  });
});

describe('task list sorting', () => {
  it('sorts active tasks by due date then priority', () => {
    const tasks = sortTasksForDeadlineList([
      buildTask({
        id: 'c',
        title: 'Low today',
        priority: 'low',
        dueDate: '2026-03-19T20:00:00+08:00',
      }),
      buildTask({
        id: 'a',
        title: 'High today',
        priority: 'high',
        dueDate: '2026-03-19T10:00:00+08:00',
      }),
      buildTask({
        id: 'b',
        title: 'Tomorrow',
        priority: 'medium',
        dueDate: '2026-03-20T10:00:00+08:00',
      }),
    ]);

    expect(tasks.map((task) => task.id)).toEqual(['a', 'c', 'b']);
  });

  it('keeps more recently completed tasks above older ones', () => {
    const tasks = sortTasksForDeadlineList([
      buildTask({
        id: 'old',
        status: 'completed',
        completedAt: '2026-03-10T09:00:00+08:00',
      }),
      buildTask({
        id: 'recent',
        status: 'completed',
        completedAt: '2026-03-18T09:00:00+08:00',
      }),
    ]);

    expect(tasks.map((task) => task.id)).toEqual(['recent', 'old']);
  });

  it('can sort active tasks by newest created date', () => {
    const tasks = sortTasksForDeadlineListByMode(
      [
        buildTask({
          id: 'older',
          createdAt: '2026-03-18T08:00:00.000Z',
        }),
        buildTask({
          id: 'newer',
          createdAt: '2026-03-19T09:00:00.000Z',
        }),
      ],
      'date-added'
    );

    expect(tasks.map((task) => task.id)).toEqual(['newer', 'older']);
  });

  it('can sort active tasks by priority first', () => {
    const tasks = sortTasksForDeadlineListByMode(
      [
        buildTask({
          id: 'low',
          priority: 'low',
          dueDate: '2026-03-19T08:00:00.000Z',
        }),
        buildTask({
          id: 'high',
          priority: 'high',
          dueDate: '2026-03-20T08:00:00.000Z',
        }),
      ],
      'priority'
    );

    expect(tasks.map((task) => task.id)).toEqual(['high', 'low']);
  });
});
