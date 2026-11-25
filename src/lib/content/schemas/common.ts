import { z } from 'astro/zod';

/** Lowercase kebab-case identifier, e.g. `aws-iaas`. Used for slugs, tags, and node names. */
export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be lowercase kebab-case');

/** A cluster node name. Kubernetes caps label values at 63 characters, so we do too. */
export const nodeName = slug.max(63);

/** Month precision date, `YYYY-MM`. */
export const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'must be YYYY-MM');

/** End of a date range: a `YYYY-MM` or the literal `present`. */
export const endDate = z.union([yearMonth, z.literal('present')]);

/** External link that must use https. */
export const httpsUrl = z.url({ protocol: /^https$/ });

/** Contact-style link: https, or `mailto:` with an address. */
export const linkUrl = z.union([httpsUrl, z.string().regex(/^mailto:[^@\s]+@[^@\s]+$/)]);
