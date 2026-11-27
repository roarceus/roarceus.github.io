/** Search and share metadata helpers (SPEC §2 SEO). Pure functions, so the layout stays thin. */

/** True when the site is built under a PR preview path instead of the production root. */
export function isPreviewBase(base: string): boolean {
  return base.replace(/\/+/g, '') !== '';
}

interface PersonInput {
  name: string;
  jobTitle: string;
  url: string;
  address: string;
  sameAs: string[];
}

/** schema.org Person for the pages that introduce me (home and the plain view). */
export function personJsonLd(person: PersonInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    jobTitle: person.jobTitle,
    url: person.url,
    address: { '@type': 'PostalAddress', addressLocality: person.address },
    sameAs: person.sameAs,
  };
}

/**
 * JSON for an inline `<script type="application/ld+json">`. Escapes `<` so content can never close
 * the script tag early.
 */
export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}
