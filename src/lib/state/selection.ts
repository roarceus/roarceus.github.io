import { atom } from 'nanostores';

import type { Selection } from '@/lib/commands/types';

/**
 * What the detail panel shows (design doc stage-3 §5.3). `describe` and clicked names set it; Stage 4's
 * map reads and writes the same atom.
 */
export const $selection = atom<Selection | undefined>(undefined);
