/**
 * kubectl-style formatting (SPEC §5 "Accuracy matters"), shared by the static placeholders now and
 * the terminal in Stage 3.
 */

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365;

/**
 * Age since the first day of a `YYYY-MM` month, the way kubectl prints the AGE column (the day and
 * year branches of Kubernetes' `duration.HumanDuration`): days under two years (`542d`), years plus
 * leftover days under eight years (`5y209d`, or `2y` with none left over), whole years after that.
 */
export function kubectlAge(start: string, now: Date): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(start);
  if (!match) throw new Error(`Expected YYYY-MM, got "${start}"`);
  const from = Date.UTC(Number(match[1]), Number(match[2]) - 1, 1);
  const days = Math.floor((now.getTime() - from) / DAY_MS);
  if (days < 0) throw new Error(`Start ${start} is after ${now.toISOString()}`);

  if (days < 2 * YEAR_DAYS) return `${String(days)}d`;
  const years = Math.floor(days / YEAR_DAYS);
  if (years >= 8) return `${String(years)}y`;
  const rest = days % YEAR_DAYS;
  return rest === 0 ? `${String(years)}y` : `${String(years)}y${String(rest)}d`;
}

/** A Kubernetes-style name: lowercase, runs of anything else become one hyphen, trimmed. */
export function toKubeName(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
