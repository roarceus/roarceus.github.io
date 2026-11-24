import { compareEnd } from '@/lib/utils/dates';

/** The part of an Astro collection entry these helpers need. Astro entries satisfy it. */
export interface Entry<T> {
  id: string;
  data: T;
  body?: string;
}

const byId = (a: Entry<unknown>, b: Entry<unknown>) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Roles and degrees, newest first: ongoing first, then later end, later start, then id. */
export function sortByRecency<E extends Entry<{ start: string; end: string }>>(entries: readonly E[]): E[] {
  return [...entries].sort(
    (a, b) => compareEnd(a.data.end, b.data.end) || compareEnd(a.data.start, b.data.start) || byId(a, b),
  );
}

/** Explicit `order` ascending, ties by id. */
export function sortByOrder<E extends Entry<{ order: number }>>(entries: readonly E[]): E[] {
  return [...entries].sort((a, b) => a.data.order - b.data.order || byId(a, b));
}

const dateKey = (date: Date | string | undefined) => (date instanceof Date ? date.toISOString() : date);

/**
 * Newest first by `date` (Date or `YYYY-MM`), ties by id. Undated entries (e.g. in-progress
 * certifications) come first, since they're still happening.
 */
export function sortByDateDesc<E extends Entry<{ date?: Date | string | undefined }>>(
  entries: readonly E[],
): E[] {
  return [...entries].sort((a, b) => {
    const left = dateKey(a.data.date);
    const right = dateKey(b.data.date);
    if (left === right) return byId(a, b);
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    return left < right ? 1 : -1;
  });
}
