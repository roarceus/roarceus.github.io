import { describe, expect, it } from 'vitest';

import { moreLabel } from './plural';

describe('moreLabel', () => {
  it('uses the singular for one hidden item', () => {
    expect(moreLabel(1, 'highlight', 'highlights')).toBe('Show 1 more highlight');
  });

  it('uses the plural for several', () => {
    expect(moreLabel(3, 'highlight', 'highlights')).toBe('Show 3 more highlights');
    expect(moreLabel(13, 'project', 'projects')).toBe('Show 13 more projects');
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects %s, since there is nothing to show', (count) => {
    expect(() => moreLabel(count, 'item', 'items')).toThrow(/positive whole number/);
  });
});
