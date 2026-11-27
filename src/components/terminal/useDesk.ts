import { useSyncExternalStore } from 'react';

/**
 * The one-screen desktop layout (ADR 0005). Must match the `desk` variant in src/styles/global.css:
 * a screen at least 1024px wide and 700px tall.
 */
const DESK_QUERY = 'screen and (min-width: 64rem) and (min-height: 43.75rem)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESK_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

/** True on the one-screen desktop layout; false on the server and below it. */
export const useDesk = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESK_QUERY).matches,
    () => false,
  );
