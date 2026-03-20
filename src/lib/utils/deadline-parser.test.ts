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

  it('parses day/month slash dates using local ordering', () => {
    vi.setSystemTime(new Date('2026-03-19T10:00:00+08:00'));

    const result = parseTaskInput('hw @1/5 2300');

    expect(result.title).toBe('hw');
    expect(result.deadline).toBeTruthy();
    expect(new Date(result.deadline as string).getUTCMonth()).toBe(4);
    expect(new Date(result.deadline as string).getUTCDate()).toBe(1);
  });

  it('rolls day/month slash dates into the following year when needed', () => {
    vi.setSystemTime(new Date('2026-12-20T10:00:00+08:00'));

    const result = parseTaskInput('renew @1/5 2300');

    expect(result.deadline).toBeTruthy();
    expect(new Date(result.deadline as string).getUTCFullYear()).toBe(2027);
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

  it('does not confuse email addresses with deadline markers', () => {
    vi.setSystemTime(new Date('2026-03-19T10:00:00+08:00'));

    const result = parseTaskInput('Email john@example.com @tomorrow 5pm');

    expect(result.title).toBe('Email john@example.com');
    expect(result.deadline).toBeTruthy();
  });

  it('supports next week phrasing', () => {
    vi.setSystemTime(new Date('2026-03-19T10:00:00+08:00'));

    const result = parseTaskInput('Plan slides @next week 9am');

    expect(result.title).toBe('Plan slides');
    expect(result.deadline).toBeTruthy();
  });

  it('supports end of month shorthand', () => {
    vi.setSystemTime(new Date('2026-03-19T10:00:00+08:00'));

    const result = parseTaskInput('Pay rent @eom');

    expect(result.title).toBe('Pay rent');
    expect(result.deadline).toBeTruthy();
  });
});
