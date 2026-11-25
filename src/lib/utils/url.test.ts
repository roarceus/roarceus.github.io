import { describe, expect, it } from 'vitest';

import { joinBase, productionUrl, url } from './url';

describe('joinBase', () => {
  it.each([
    ['/', '', '/'],
    ['/', undefined, '/'],
    ['/', 'plain/', '/plain/'],
    ['/', '/plain/', '/plain/'],
    ['/', '#about', '/#about'],
    ['/', '?q=1', '/?q=1'],
    ['/pr-preview/pr-12/', '', '/pr-preview/pr-12/'],
    ['/pr-preview/pr-12', '', '/pr-preview/pr-12/'],
    ['/pr-preview/pr-12/', 'resume.pdf', '/pr-preview/pr-12/resume.pdf'],
    ['/pr-preview/pr-12', '/plain/', '/pr-preview/pr-12/plain/'],
    ['/pr-preview/pr-12/', '/plain//docs/', '/pr-preview/pr-12/plain/docs/'],
    ['/', 'plain/?next=a//b#x//y', '/plain/?next=a//b#x//y'],
    ['/pr-preview/pr-12/', '?q=1', '/pr-preview/pr-12/?q=1'],
    ['/pr-preview/pr-12/', '#about', '/pr-preview/pr-12/#about'],
    ['pr-preview/pr-12', 'plain/', '/pr-preview/pr-12/plain/'],
    ['', 'plain/', '/plain/'],
  ])('joinBase(%j, %j) === %j', (base, path, expected) => {
    expect(joinBase(base, path)).toBe(expected);
  });

  it.each([
    'https://example.com/',
    'http://example.com',
    '//cdn.example.com/app.js',
    'mailto:a@b.c',
    'tel:+15550100',
    'javascript:alert(1)',
  ])('rejects absolute URL %j', (path) => {
    expect(() => joinBase('/', path)).toThrow(TypeError);
  });
});

describe('url', () => {
  it('prefixes paths with the configured base', () => {
    const base = import.meta.env.BASE_URL;
    expect(url('plain/')).toBe(joinBase(base, 'plain/'));
    expect(url()).toBe(joinBase(base, ''));
  });
});

describe('productionUrl', () => {
  it('builds an absolute URL at the production root, ignoring any preview base path', () => {
    expect(productionUrl('https://roarceus.github.io', 'updates/launched-asktrace/')).toBe(
      'https://roarceus.github.io/updates/launched-asktrace/',
    );
  });

  it('tolerates a trailing slash on the origin and a leading slash on the path', () => {
    expect(productionUrl('https://roarceus.github.io/', '/rss.xml')).toBe(
      'https://roarceus.github.io/rss.xml',
    );
    expect(productionUrl('https://roarceus.github.io')).toBe('https://roarceus.github.io/');
  });

  it('rejects absolute paths like url() does', () => {
    expect(() => productionUrl('https://roarceus.github.io', 'https://evil.example/')).toThrow(TypeError);
  });
});
