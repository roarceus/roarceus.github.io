/**
 * Build-time feature flags (SPEC §10b). Unfinished features ship behind a flag that stays `false`
 * in production until approved; remove the flag once the feature is stable.
 */
export const features = {
  bootSequence: false,
  chaosMode: false,
} as const satisfies Record<string, boolean>;

export type FeatureFlag = keyof typeof features;

/**
 * @public Used by later stages (boot sequence, chaos mode).
 */
export function isEnabled(flag: FeatureFlag, flags: Readonly<Record<FeatureFlag, boolean>> = features): boolean {
  return flags[flag];
}
