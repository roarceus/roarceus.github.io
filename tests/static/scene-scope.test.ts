import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

// ADR 0002: "the UI is the tool, the cluster is the game". Scene tokens and glow effects belong to the
// cluster scene only, so the chrome keeps the crisp SPEC §5 look.
const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const ALLOWED = ['src/components/cluster/', 'src/components/game/', 'src/styles/tokens.css'];

const RULES: [RegExp, string][] = [
  [/--scene-/, 'scene token'],
  [/text-shadow/, 'text-shadow glow'],
  [/drop-shadow/, 'drop-shadow glow'],
  // A box-shadow that paints a color (none/0 resets are fine).
  [
    /box-shadow\s*:\s*(?!none\b|0\s*(?:;|$)|inherit|initial|unset)[^;]*(?:#|rgb|hsl|var\(--)/,
    'colored box-shadow',
  ],
  // Tailwind utilities for the same effects.
  [/\b(?:text-shadow|drop-shadow|shadow-\[)[\w-]*/, 'glow utility'],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(astro|tsx?|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** `file:line: rule` for every flair effect in `text`, unless `file` lives in the scene folders. */
function findSceneLeaks(file: string, text: string): string[] {
  if (ALLOWED.some((allowed) => file.startsWith(allowed))) return [];
  return text
    .split('\n')
    .flatMap((line, index) =>
      RULES.filter(([pattern]) => pattern.test(line)).map(
        ([, rule]) => `${file}:${String(index + 1)}: ${rule}`,
      ),
    );
}

describe('scene scope (ADR 0002)', () => {
  it('flags flair effects outside the scene folders', () => {
    const sample = [
      'color: var(--scene-packet);',
      'text-shadow: 0 0 8px var(--accent);',
      'filter: drop-shadow(0 0 4px red);',
      'box-shadow: 0 0 12px rgb(63 185 80 / 35%);',
      '<div class="drop-shadow-lg">',
    ].join('\n');
    expect(findSceneLeaks('src/components/ui/Bad.astro', sample)).toEqual([
      'src/components/ui/Bad.astro:1: scene token',
      'src/components/ui/Bad.astro:2: text-shadow glow',
      'src/components/ui/Bad.astro:2: glow utility',
      'src/components/ui/Bad.astro:3: drop-shadow glow',
      'src/components/ui/Bad.astro:3: glow utility',
      'src/components/ui/Bad.astro:4: colored box-shadow',
      'src/components/ui/Bad.astro:5: drop-shadow glow',
      'src/components/ui/Bad.astro:5: glow utility',
    ]);
  });

  it('allows resets and the scene folders', () => {
    expect(findSceneLeaks('src/styles/global.css', 'box-shadow: none !important;')).toEqual([]);
    expect(findSceneLeaks('src/components/cluster/Pod.tsx', 'var(--scene-glow-running)')).toEqual([]);
    expect(findSceneLeaks('src/components/game/Chaos.tsx', 'text-shadow: 0 0 4px red;')).toEqual([]);
  });

  it('finds no flair effects in the chrome', () => {
    const leaks = sourceFiles(SRC).flatMap((path) =>
      findSceneLeaks(relative(ROOT, path).split(sep).join('/'), readFileSync(path, 'utf8')),
    );
    expect(leaks).toEqual([]);
  });
});
