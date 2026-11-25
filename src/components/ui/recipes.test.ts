import { describe, expect, it } from 'vitest';

import { button, chip, focusRing, panel, target } from './recipes';

const classes = (recipe: string): string[] => recipe.split(/\s+/).filter(Boolean);

describe('ui recipes', () => {
  it('makes primary buttons an accent fill with on-accent text', () => {
    expect(classes(button('primary'))).toEqual(expect.arrayContaining(['bg-accent', 'text-on-accent']));
  });

  it('keeps the accent fill on hover so the white label stays at AA', () => {
    const primary = classes(button('primary'));
    expect(primary.filter((c) => c.startsWith('hover:bg-'))).toEqual([]);
    expect(primary).toContain('hover:underline');
  });

  it('outlines secondary buttons with the control border (3:1)', () => {
    expect(classes(button('secondary'))).toContain('border-border-strong');
  });

  it('keeps ghost buttons unfilled', () => {
    expect(classes(button('ghost')).some((c) => c.startsWith('bg-'))).toBe(false);
  });

  it.each([
    ['primary button', button('primary')],
    ['secondary button', button('secondary')],
    ['ghost button', button('ghost')],
    ['chip', chip()],
  ])('gives every %s a 44px target and the focus ring', (_name, recipe) => {
    expect(classes(recipe)).toEqual(expect.arrayContaining([...classes(target), ...classes(focusRing)]));
    expect(classes(target)).toEqual(expect.arrayContaining(['min-h-11', 'min-w-11']));
  });

  it('sets chips in the system font with the control border', () => {
    expect(classes(chip())).toEqual(expect.arrayContaining(['font-mono', 'border-border-strong']));
  });

  it('draws panels on surface-1 with a hairline and large radius', () => {
    expect(classes(panel())).toEqual(
      expect.arrayContaining(['bg-surface-1', 'border', 'border-border', 'rounded-lg']),
    );
  });

  it('animates only colors, within the UI duration', () => {
    for (const recipe of [button('primary'), chip()]) {
      expect(classes(recipe)).toEqual(expect.arrayContaining(['transition-colors', 'duration-ui']));
    }
  });
});
