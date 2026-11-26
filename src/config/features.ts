import { resolveFlags } from '@/lib/utils/flags';

/**
 * Build-time feature flags (SPEC §10b, design doc §4.8). Unfinished features ship behind a flag that
 * stays `false` in production until approved; remove the flag once the feature is stable.
 * Non-production builds (dev, PR previews, CI's dashboard build) turn flags on with
 * `PUBLIC_ENABLED_FLAGS=clusterDashboard,...`; release builds never set it.
 */
export const defaultFeatures = {
  /** The cluster dashboard on `/` (Stage 2 shell, live from Stage 4). */
  clusterDashboard: false,
  /**
   * Test-only pages under /fixtures/ (a code block for the CSP check, ADR 0004). On in CI's dashboard
   * build only, never in previews or releases.
   */
  fixtures: false,
  bootSequence: false,
  chaosMode: false,
} as const satisfies Record<string, boolean>;

export type FeatureFlag = keyof typeof defaultFeatures;

const features: Readonly<Record<FeatureFlag, boolean>> = resolveFlags(
  defaultFeatures,
  import.meta.env.PUBLIC_ENABLED_FLAGS,
);

export function isEnabled(
  flag: FeatureFlag,
  flags: Readonly<Record<FeatureFlag, boolean>> = features,
): boolean {
  return flags[flag];
}
