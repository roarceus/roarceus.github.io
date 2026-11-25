import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { contrastRatio } from '@/lib/utils/contrast';

const STYLES = join(process.cwd(), 'src', 'styles');
const tokensCss = readFileSync(join(STYLES, 'tokens.css'), 'utf8');
const globalCss = readFileSync(join(STYLES, 'global.css'), 'utf8');

/** Custom properties declared in a stylesheet, by name without the leading dashes. */
function readTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name = '', value = ''] of css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(name, value.trim());
  }
  return tokens;
}

const tokens = readTokens(tokensCss);

function color(name: string): string {
  const value = tokens.get(name);
  if (value === undefined) throw new Error(`Missing token --${name}`);
  return value;
}

const STATUSES = ['running', 'pending', 'failed', 'completed'] as const;
const SURFACES = ['bg', 'surface-1', 'surface-2'] as const;
const SOFT_FILLS = STATUSES.map((status) => `status-${status}-soft`);

// WCAG 2.2 AA: 4.5:1 for normal text (1.4.3), 3:1 for UI component boundaries (1.4.11).
const TEXT_PAIRS: [string, string][] = [
  ...['text', 'text-muted'].flatMap((fg) =>
    [...SURFACES, ...SOFT_FILLS, 'accent-fill'].map((bg): [string, string] => [fg, bg]),
  ),
  ...[...SURFACES, 'accent-fill'].map((bg): [string, string] => ['accent-soft', bg]),
  ...STATUSES.map((status): [string, string] => [`status-${status}`, `status-${status}-soft`]),
  ...STATUSES.flatMap((status) => SURFACES.map((bg): [string, string] => [`status-${status}`, bg])),
  ['on-accent', 'accent'],
];

const UI_PAIRS: [string, string][] = [
  ...[...SURFACES].map((bg): [string, string] => ['border-strong', bg]),
  ...[...SURFACES].map((bg): [string, string] => ['accent-soft', bg]),
];

describe('design tokens', () => {
  it.each(TEXT_PAIRS)('--%s on --%s meets 4.5:1 for text', (fg, bg) => {
    expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('--%s on --%s meets 3:1 for UI parts', (fg, bg) => {
    expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(3);
  });

  it.each([
    'radius-sm',
    'radius-md',
    'radius-lg',
    'duration-fast',
    'duration-ui',
    'duration-slow',
    'ease-out',
    'ease-in',
    'ease-standard',
    'z-sticky',
    'z-dock',
    'z-sheet',
    'z-overlay',
    'z-skip',
    'topbar-h',
    'jumpbar-h',
    'terminal-h',
    'text-xs-fluid',
    'text-h2-fluid',
    'leading-tight',
    'leading-body',
    'scene-bg',
    'scene-platform',
    'scene-platform-edge',
    'scene-platform-selected',
    'scene-link',
    'scene-packet',
    'scene-glow-running',
    'scene-glow-pending',
    'scene-glow-failed',
    'scene-duration-packet',
  ])('defines --%s', (name) => {
    expect(tokens.has(name)).toBe(true);
  });

  it('keeps z-index layers in order', () => {
    const layers = ['z-sticky', 'z-dock', 'z-sheet', 'z-overlay', 'z-skip'].map((name) =>
      Number(tokens.get(name)),
    );
    expect(layers).toEqual([...layers].sort((a, b) => a - b));
    expect(new Set(layers).size).toBe(layers.length);
  });

  it('only maps Tailwind theme names to tokens that exist', () => {
    const theme = /@theme inline\s*\{([^}]*)\}/.exec(globalCss)?.[1] ?? '';
    const referenced = [...theme.matchAll(/var\(--([\w-]+)\)/g)].map(([, name = '']) => name);
    expect(referenced.length).toBeGreaterThan(0);
    expect(referenced.filter((name) => !tokens.has(name))).toEqual([]);
  });

  it('keeps scene tokens out of the Tailwind theme (ADR 0002)', () => {
    const theme = /@theme inline\s*\{([^}]*)\}/.exec(globalCss)?.[1] ?? '';
    expect(theme).not.toContain('--scene-');
  });
});
