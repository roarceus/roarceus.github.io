import { atom } from 'nanostores';

/**
 * The skill label selector the scene lights up (design doc stage-4 §5): `get pods -l skill=<name>` sets
 * it, and a command that selects something, or `clear`, clears it. Skills are lowercased.
 */
export const $sceneFilter = atom<{ skill: string } | undefined>(undefined);
