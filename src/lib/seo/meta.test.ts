import { describe, expect, it } from 'vitest';

import { isPreviewBase, jsonLdScript, personJsonLd } from './meta';

describe('isPreviewBase', () => {
  it.each([
    ['/', false],
    ['', false],
    ['//', false],
    ['/pr-preview/pr-12/', true],
    ['/pr-preview/pr-12', true],
  ])('treats base %j as a preview: %s', (base, expected) => {
    expect(isPreviewBase(base)).toBe(expected);
  });
});

describe('personJsonLd', () => {
  it('describes Sohan as a schema.org Person with profile links', () => {
    expect(
      personJsonLd({
        name: 'Sohan Patil',
        jobTitle: 'Software Engineer',
        url: 'https://roarceus.github.io/',
        address: 'San Francisco Bay Area',
        sameAs: ['https://github.com/roarceus', 'https://www.linkedin.com/in/example/'],
      }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Sohan Patil',
      jobTitle: 'Software Engineer',
      url: 'https://roarceus.github.io/',
      address: { '@type': 'PostalAddress', addressLocality: 'San Francisco Bay Area' },
      sameAs: ['https://github.com/roarceus', 'https://www.linkedin.com/in/example/'],
    });
  });
});

describe('jsonLdScript', () => {
  it('serializes to JSON', () => {
    expect(JSON.parse(jsonLdScript({ name: 'Ada' }))).toEqual({ name: 'Ada' });
  });

  it('cannot close the surrounding script tag', () => {
    const text = jsonLdScript({ name: '</script><script>alert(1)</script>' });
    expect(text).not.toContain('<');
    expect(JSON.parse(text)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});
