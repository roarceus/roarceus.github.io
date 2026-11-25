/**
 * Off-site links in rendered Markdown get rel="noopener noreferrer" (SPEC §10b), the same as links
 * built with the ExternalLink component. The Sätteri plugin that calls this lives in
 * astro.config.mjs, where Sätteri's types apply.
 */

const EXTERNAL = /^https?:\/\//i;
const REQUIRED_REL = ['noopener', 'noreferrer'];

/** The `rel` an external link needs, or undefined when the link is internal or has no href. */
export function externalLinkRel(properties: Record<string, unknown> | undefined): string[] | undefined {
  const href = properties?.href;
  if (typeof href !== 'string' || !EXTERNAL.test(href)) return undefined;
  const current = Array.isArray(properties?.rel)
    ? properties.rel.filter((value): value is string => typeof value === 'string')
    : [];
  return [...current, ...REQUIRED_REL.filter((value) => !current.includes(value))];
}
