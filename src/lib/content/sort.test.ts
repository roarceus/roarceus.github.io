import { describe, expect, it } from 'vitest';

import { sortByDateDesc, sortByOrder, sortByRecency } from './sort';

const ids = (entries: { id: string }[]) => entries.map((entry) => entry.id);

describe('sortByRecency', () => {
  it('puts ongoing roles first, then later ends, then later starts, then id', () => {
    const entries = [
      { id: 'old', data: { start: '2021-05', end: '2023-10' } },
      { id: 'b-current', data: { start: '2024-01', end: 'present' } },
      { id: 'a-current', data: { start: '2024-01', end: 'present' } },
      { id: 'recent', data: { start: '2025-06', end: '2025-12' } },
      { id: 'newer-start', data: { start: '2025-09', end: '2025-12' } },
    ];
    expect(ids(sortByRecency(entries))).toEqual(['a-current', 'b-current', 'newer-start', 'recent', 'old']);
  });

  it('does not mutate its input', () => {
    const entries = [
      { id: 'a', data: { start: '2020-01', end: '2020-02' } },
      { id: 'b', data: { start: '2021-01', end: '2021-02' } },
    ];
    sortByRecency(entries);
    expect(ids(entries)).toEqual(['a', 'b']);
  });
});

describe('sortByOrder', () => {
  it('sorts by order ascending, ties by id', () => {
    const entries = [
      { id: 'c', data: { order: 2 } },
      { id: 'b', data: { order: 1 } },
      { id: 'a', data: { order: 2 } },
    ];
    expect(ids(sortByOrder(entries))).toEqual(['b', 'a', 'c']);
  });
});

describe('sortByDateDesc', () => {
  it('sorts Date values newest first, ties by id', () => {
    const entries = [
      { id: 'older', data: { date: new Date('2024-05-01') } },
      { id: 'b-new', data: { date: new Date('2025-01-22') } },
      { id: 'a-new', data: { date: new Date('2025-01-22') } },
    ];
    expect(ids(sortByDateDesc(entries))).toEqual(['a-new', 'b-new', 'older']);
  });

  it('sorts YYYY-MM strings newest first and undated entries first', () => {
    const entries = [
      { id: 'issued-2020', data: { date: '2020-07' } },
      { id: 'in-progress', data: {} },
      { id: 'issued-2022', data: { date: '2022-05' } },
    ];
    expect(ids(sortByDateDesc(entries))).toEqual(['in-progress', 'issued-2022', 'issued-2020']);
  });
});

describe('comparator edge cases', () => {
  it('breaks ties by id in both directions and keeps equal ids stable', () => {
    const entries = [
      { id: 'b', data: { order: 1 }, tag: 'first-b' },
      { id: 'a', data: { order: 1 }, tag: 'a' },
      { id: 'b', data: { order: 1 }, tag: 'second-b' },
    ];
    expect(sortByOrder(entries).map((entry) => entry.tag)).toEqual(['a', 'first-b', 'second-b']);
  });

  it('keeps undated entries ahead of dated ones whichever side they start on', () => {
    expect(
      ids(
        sortByDateDesc([
          { id: 'dated', data: { date: '2020-07' } },
          { id: 'undated', data: {} },
        ]),
      ),
    ).toEqual(['undated', 'dated']);
    expect(
      ids(
        sortByDateDesc([
          { id: 'undated', data: {} },
          { id: 'dated', data: { date: '2020-07' } },
        ]),
      ),
    ).toEqual(['undated', 'dated']);
  });
});
