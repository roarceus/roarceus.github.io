import { describe, expect, it } from 'vitest';

import { features, isEnabled } from './features';

describe('features', () => {
  it('ships every flag off by default (SPEC §10b: unfinished features stay off in production)', () => {
    expect(Object.values(features).every((enabled) => !enabled)).toBe(true);
  });

  it('reads a flag from the default set', () => {
    expect(isEnabled('chaosMode')).toBe(false);
  });

  it('reads a flag from an explicit set', () => {
    expect(isEnabled('bootSequence', { bootSequence: true, chaosMode: false })).toBe(true);
  });
});
