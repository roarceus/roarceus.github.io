// Fixed English month names: output must not depend on the build machine's locale.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEAR_MONTH = /^(\d{4})-(\d{2})$/;

/** `'2025-06'` → `'Jun 2025'`. Throws a RangeError on anything that isn't a valid `YYYY-MM`. */
export function formatYearMonth(value: string): string {
  const [, year, monthNumber] = YEAR_MONTH.exec(value) ?? [];
  const month = MONTHS[Number(monthNumber) - 1];
  if (year === undefined || month === undefined) {
    throw new RangeError(`Expected YYYY-MM, got "${value}"`);
  }
  return `${month} ${year}`;
}

/** `'2021-05', 'present'` gives `'May 2021 - Present'`; a missing or equal end shows one month. */
export function formatRange(start: string, end?: string): string {
  const from = formatYearMonth(start);
  if (end === undefined || end === start) return from;
  return `${from} - ${end === 'present' ? 'Present' : formatYearMonth(end)}`;
}

/** Sort comparator for range ends, newest first; `present` is newer than any month. */
export function compareEnd(a: string, b: string): number {
  if (a === b) return 0;
  if (a === 'present') return -1;
  if (b === 'present') return 1;
  return a < b ? 1 : -1;
}
