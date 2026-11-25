import { describe, expect, it } from 'vitest';

import { compareEnd, formatRange, formatYearMonth } from './dates';

describe('formatYearMonth', () => {
  it.each([
    ['2025-06', 'Jun 2025'],
    ['2021-01', 'Jan 2021'],
    ['2026-12', 'Dec 2026'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatYearMonth(input)).toBe(expected);
  });

  it.each(['2025-13', '2025', 'June 2025', ''])('throws on %j', (input) => {
    expect(() => formatYearMonth(input)).toThrow(RangeError);
  });
});

describe('formatRange', () => {
  it('joins start and end with an en dash', () => {
    expect(formatRange('2025-06', '2025-12')).toBe('Jun 2025 – Dec 2025');
  });

  it('shows Present for open-ended ranges', () => {
    expect(formatRange('2021-05', 'present')).toBe('May 2021 – Present');
  });

  it('collapses a single-month range', () => {
    expect(formatRange('2024-03', '2024-03')).toBe('Mar 2024');
  });

  it('shows only the start when there is no end', () => {
    expect(formatRange('2024-03')).toBe('Mar 2024');
  });
});

describe('compareEnd', () => {
  it('orders later ends first, with present before any month', () => {
    const ends = ['2023-10', 'present', '2025-12', '2021-01'];
    expect([...ends].sort(compareEnd)).toEqual(['present', '2025-12', '2023-10', '2021-01']);
  });

  it('treats equal ends as equal', () => {
    expect(compareEnd('present', 'present')).toBe(0);
    expect(compareEnd('2024-01', '2024-01')).toBe(0);
  });
});
