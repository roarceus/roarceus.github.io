import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { findRootPaths } from './root-paths';

describe('findRootPaths', () => {
  it.each([
    ['<a href="/plain/">Plain</a>'],
    ["<a href='/plain/'>Plain</a>"],
    ["<a href={'/plain/'}>Plain</a>"],
    ['<a href={`/projects/${slug}/`}>x</a>'],
    ['<img src="/avatar.png" alt="" />'],
    ['<form action="/contact/">'],
    ["const res = await fetch('/data.json');"],
    ['src: url("/fonts/inter.woff2");'],
    ["background: url('/bg.png');"],
    ['background: url(/bg.png);'],
    ["return Astro.redirect('/plain/');"],
  ])('flags %s', (source) => {
    expect(findRootPaths(source)).toHaveLength(1);
  });

  it.each([
    ["<a href={url('plain/')}>Plain</a>"],
    ['<a href="https://github.com/roarceus">GitHub</a>'],
    ['<script src="//cdn.example.com/x.js"></script>'],
    ['<a href="#about">About</a>'],
    ['<a href="mailto:hi@example.com">Mail</a>'],
    ['<img src={avatar.src} alt="" />'],
    ['background: url(./bg.png);'],
    ['const re = /^\\/+/;'],
  ])('allows %s', (source) => {
    expect(findRootPaths(source)).toEqual([]);
  });

  it('reports 1-based line numbers', () => {
    expect(findRootPaths('<p>ok</p>\n<a href="/x/">x</a>')).toEqual([{ line: 2, text: 'href="/' }]);
  });
});

describe('src/', () => {
  const SRC = join(import.meta.dirname, '..', '..', 'src');
  // url.ts is the one place allowed to build root-relative paths.
  const ALLOWED = new Set(['lib/utils/url.ts']);

  const files = readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .map((file) => file.replaceAll('\\', '/'))
    .filter(
      (file) => /\.(astro|ts|tsx|css)$/.test(file) && !/\.test\.tsx?$/.test(file) && !ALLOWED.has(file),
    );

  it('scans at least one file', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s has no hardcoded root paths (use url() from @/lib/utils/url)', (file) => {
    const hits = findRootPaths(readFileSync(join(SRC, file), 'utf8'));
    expect(hits, relative(process.cwd(), join(SRC, file))).toEqual([]);
  });
});
