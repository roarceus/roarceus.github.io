import { describe, expect, it } from 'vitest';

import { defaultFeatures, isEnabled } from './features';

describe('features', () => {
  it('ships every flag off by default (SPEC §10b: unfinished features stay off in production)', () => {
    expect(Object.values(defaultFeatures)).not.toContain(true);
  });

  it('has the Stage 2 dashboard flag', () => {
    expect(defaultFeatures).toHaveProperty('clusterDashboard', false);
  });

  it('reads a flag from the build set (no PUBLIC_ENABLED_FLAGS in unit tests)', () => {
    expect(isEnabled('chaosMode')).toBe(false);
    expect(isEnabled('clusterDashboard')).toBe(false);
  });

  it('reads a flag from an explicit set', () => {
    expect(isEnabled('clusterDashboard', { ...defaultFeatures, clusterDashboard: true })).toBe(true);
  });
});
