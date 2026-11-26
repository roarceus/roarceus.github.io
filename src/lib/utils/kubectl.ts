/**
 * kubectl-style formatting (SPEC §5 "Accuracy matters"), shared by the static placeholders now and
 * the terminal in Stage 3.
 */

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365;

/**
 * Age since a `YYYY-MM-DD` day or the first day of a `YYYY-MM` month, the way kubectl prints the AGE column (the day and
 * year branches of Kubernetes' `duration.HumanDuration`): days under two years (`542d`), years plus
 * leftover days under eight years (`5y209d`, or `2y` with none left over), whole years after that.
 */
export function kubectlAge(start: string, now: Date): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.exec(start);
  if (!match) throw new Error(`Expected YYYY-MM or YYYY-MM-DD, got "${start}"`);
  const from = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3] ?? 1));
  const days = Math.floor((now.getTime() - from) / DAY_MS);
  if (days < 0) throw new Error(`Start ${start} is after ${now.toISOString()}`);

  if (days < 2 * YEAR_DAYS) return `${String(days)}d`;
  const years = Math.floor(days / YEAR_DAYS);
  if (years >= 8) return `${String(years)}y`;
  const rest = days % YEAR_DAYS;
  return rest === 0 ? `${String(years)}y` : `${String(years)}y${String(rest)}d`;
}

/**
 * `kubectlAge`, but `0d` for a start after `now` instead of an error. For ages computed in the
 * browser, where a visitor's clock can be behind the content.
 */
export function kubectlAgeClamped(start: string, now: Date): string {
  const day = start.length === 7 ? `${start}-01` : start;
  return Date.parse(`${day}T00:00:00Z`) > now.getTime() ? '0d' : kubectlAge(start, now);
}

/** A Kubernetes-style name: lowercase, runs of anything else become one hyphen, trimmed. */
export function toKubeName(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * A short ROLE value for tables: the title before its first `,` or `(` as a Kubernetes name
 * (`Teaching Assistant, ...` → `teaching-assistant`). `describe` keeps the full title.
 */
export function kubeRole(title: string): string {
  const head = title.split(/[,(]/, 1)[0] ?? '';
  return toKubeName(head) || toKubeName(title);
}
