import { describe, expect, it } from 'vitest';

import { externalLinkRel } from './external-links';

describe('externalLinkRel', () => {
  it('returns noopener noreferrer for http and https links', () => {
    expect(externalLinkRel({ href: 'https://leetcode.com/u/x/' })).toEqual(['noopener', 'noreferrer']);
    expect(externalLinkRel({ href: 'HTTP://example.com' })).toEqual(['noopener', 'noreferrer']);
  });

  it('keeps existing rel values without duplicating them', () => {
    expect(externalLinkRel({ href: 'https://a.dev', rel: ['me', 'noopener'] })).toEqual([
      'me',
      'noopener',
      'noreferrer',
    ]);
  });

  it('returns undefined for relative, hash, mailto, and missing hrefs', () => {
    for (const href of ['../../projects/asktrace/', '#contact', 'mailto:a@b.co', undefined]) {
      expect(externalLinkRel({ href })).toBeUndefined();
    }
    expect(externalLinkRel(undefined)).toBeUndefined();
  });
});
