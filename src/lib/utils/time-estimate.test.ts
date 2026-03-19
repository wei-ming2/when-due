import { describe, expect, it } from 'vitest';
import { formatTimeEstimate, parseTimeEstimateInput } from './time-estimate';

describe('time estimate utilities', () => {
  it('formats minutes into readable text', () => {
    expect(formatTimeEstimate(30)).toBe('30m');
    expect(formatTimeEstimate(120)).toBe('2h');
    expect(formatTimeEstimate(150)).toBe('2h 30m');
  });

  it('parses hours, minutes, and raw minute input', () => {
    expect(parseTimeEstimateInput('2h')).toBe(120);
    expect(parseTimeEstimateInput('30m')).toBe(30);
    expect(parseTimeEstimateInput('2h 15m')).toBe(135);
    expect(parseTimeEstimateInput('45')).toBe(45);
    expect(parseTimeEstimateInput('~1.5h')).toBe(90);
  });

  it('returns null for empty or invalid values', () => {
    expect(parseTimeEstimateInput('')).toBeNull();
    expect(parseTimeEstimateInput('abc')).toBeNull();
    expect(parseTimeEstimateInput('0')).toBeNull();
  });
});
