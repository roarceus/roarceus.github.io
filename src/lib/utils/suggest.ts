/** "Did you mean" support for terminal errors (SPEC §7): edit distance against known names. */

/** Levenshtein edit distance (insertions, deletions, substitutions). */
export function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + cost);
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}

const MAX_DISTANCE = 2;

/** The closest candidate within two edits (case-insensitive), or undefined; ties go to the first. */
export function suggest(word: string, candidates: readonly string[]): string | undefined {
  const target = word.toLowerCase();
  if (target === '') return undefined;
  let best: string | undefined;
  let bestDistance = MAX_DISTANCE + 1;
  for (const candidate of candidates) {
    const distance = levenshtein(target, candidate.toLowerCase());
    if (distance === 0) return undefined;
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}
