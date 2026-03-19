import { describe, expect, it, vi } from 'vitest';
import { parseTaskInput } from './deadline-parser';

describe('parseTaskInput', () => {
  it('parses a task title, estimate, and day-of-month deadline', () => {
    vi.setSystemTime(new Date('2026-03-19T10:00:00+08:00'));

    const result = parseTaskInput('Chem hw ~2h @24 2300');

    expect(result.title).toBe('Chem hw');
    expect(result.timeEstimateMinutes).toBe(120);
    expect(result.priority).toBe('medium');
    expect(result.deadline).toBeTruthy();
  });

  it('parses minute estimates', () => {
    vi.setSystemTime(new Date('2026-03-19T10:00:00+08:00'));

    const result = parseTaskInput('Essay ~30m @24 2300');

    expect(result.title).toBe('Essay');
    expect(result.timeEstimateMinutes).toBe(30);
  });

  it('parses bare numeric estimates as minutes', () => {
    vi.setSystemTime(new Date('2026-03-19T10:00:00+08:00'));

    const result = parseTaskInput('Math hw ~45');

    expect(result.title).toBe('Math hw');
    expect(result.timeEstimateMinutes).toBe(45);
    expect(result.deadline).toBeNull();
  });

  it('leaves plain task titles untouched', () => {
    vi.setSystemTime(new Date('2026-03-19T10:00:00+08:00'));

    const result = parseTaskInput('Read chapter 3');

    expect(result).toEqual({
      title: 'Read chapter 3',
      deadline: null,
      priority: 'medium',
      prioritySpecified: false,
      timeEstimateMinutes: null,
      tags: [],
    });
  });
});
