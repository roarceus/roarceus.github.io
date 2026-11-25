import { describe, expect, it } from 'vitest';

import { resolveFlags } from './flags';

const DEFAULTS = { clusterDashboard: false, bootSequence: false } as const;

describe('resolveFlags', () => {
  it.each([undefined, '', '  ', ','])('keeps the defaults for %j', (enabled) => {
    expect(resolveFlags(DEFAULTS, enabled)).toEqual(DEFAULTS);
  });

  it('turns on the listed flags, ignoring spaces and empty entries', () => {
    expect(resolveFlags(DEFAULTS, ' clusterDashboard , ')).toEqual({
      clusterDashboard: true,
      bootSequence: false,
    });
    expect(resolveFlags(DEFAULTS, 'bootSequence,clusterDashboard')).toEqual({
      clusterDashboard: true,
      bootSequence: true,
    });
  });

  it('fails loudly on a mistyped flag, naming it', () => {
    expect(() => resolveFlags(DEFAULTS, 'clusterDashbord')).toThrow('Unknown feature flag "clusterDashbord"');
  });

  it('does not change the defaults object', () => {
    const defaults = { clusterDashboard: false };
    resolveFlags(defaults, 'clusterDashboard');
    expect(defaults.clusterDashboard).toBe(false);
  });
});
