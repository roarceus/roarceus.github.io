import type { Entry } from './sort';

/**
 * Display name for each cluster node: the org of its experience entries, falling back to the
 * school of an education entry. Used for "Built at ..." on project pages.
 */
export function nodeLabels(
  experience: readonly Entry<{ node: string; org: string }>[],
  education: readonly Entry<{ node?: string | undefined; school: string }>[],
): Map<string, string> {
  const labels = new Map<string, string>();
  for (const { data } of experience) {
    if (!labels.has(data.node)) labels.set(data.node, data.org);
  }
  for (const { data } of education) {
    if (data.node !== undefined && !labels.has(data.node)) labels.set(data.node, data.school);
  }
  return labels;
}
