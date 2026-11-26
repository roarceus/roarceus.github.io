import { useStore } from '@nanostores/react';

import { $terminal } from '@/lib/state/terminal';

/**
 * What screen readers hear (design doc stage-3 §5.4): a short summary of the newest result only. The
 * output log itself stays silent, and trimming old entries or `clear` never announces anything.
 */
export function LiveRegion() {
  const { announcement } = useStore($terminal, { keys: ['announcement'] });
  return (
    <div role="status" aria-live="polite" className="sr-only">
      {announcement}
    </div>
  );
}
