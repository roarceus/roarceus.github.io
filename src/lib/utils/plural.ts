/** Expander summary for hidden items: "Show 1 more highlight", "Show 13 more projects". */
export function moreLabel(count: number, singular: string, plural: string): string {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`Expected a positive whole number of hidden items, got ${String(count)}`);
  }
  return `Show ${String(count)} more ${count === 1 ? singular : plural}`;
}
