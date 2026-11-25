/**
 * Resolves build-time feature flags (SPEC §10b, design doc §4.8). Every flag starts from its default
 * (off in production); a non-production build turns flags on with a comma-separated list such as
 * `PUBLIC_ENABLED_FLAGS=clusterDashboard`. A name that isn't a flag fails the build, so a typo can't
 * silently ship the wrong thing.
 */
export function resolveFlags<F extends string>(
  defaults: Readonly<Record<F, boolean>>,
  enabled: string | undefined,
): Record<F, boolean> {
  const flags: Record<F, boolean> = { ...defaults };
  const names = (enabled ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
  for (const name of names) {
    if (!Object.hasOwn(defaults, name)) throw new Error(`Unknown feature flag "${name}"`);
    flags[name as F] = true;
  }
  return flags;
}
