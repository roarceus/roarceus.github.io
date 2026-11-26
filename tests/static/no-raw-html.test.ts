import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Command output is plain data rendered as elements (design doc stage-3 §5.2), so nothing a visitor
 * types or links can become markup or code. This keeps the escape hatches out of `src/`.
 */

const SET_HTML = /\bset:html\b/;
const FORBIDDEN = [
  /\binnerHTML\b/,
  /\bouterHTML\b/,
  /dangerouslySetInnerHTML/,
  /\beval\(/,
  /\bnew Function\b/,
  SET_HTML,
];

/** The one exception: JSON-LD, serialized by `lib/seo/meta.ts` with every `<` escaped. */
const ALLOWED: Record<string, RegExp[]> = { 'src/components/layout/SeoHead.astro': [SET_HTML] };

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : /\.(ts|tsx|astro|js|mjs)$/.test(entry.name) ? [path] : [];
  });

describe('no raw HTML or code evaluation in src/', () => {
  it.each(files('src').map((path) => [relative('.', path).replaceAll('\\', '/'), path]))(
    '%s',
    (name, path) => {
      const source = readFileSync(path, 'utf8');
      const allowed = ALLOWED[name] ?? [];
      const found = FORBIDDEN.filter((pattern) => !allowed.includes(pattern) && pattern.test(source));
      expect(found.map(String)).toEqual([]);
    },
  );
});
