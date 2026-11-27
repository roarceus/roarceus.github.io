import { useSyncExternalStore } from 'react';

/**
 * The one-screen desktop layout (ADR 0005). Must match the `desk` variant in src/styles/global.css:
 * a screen at least 1024px wide and 700px tall.
 */
const DESK_QUERY = 'screen and (min-width: 64rem) and (min-height: 43.75rem)';
/** Phones: below Tailwind's `md` (768px), where cluster mode shows the bottom sheet. */
const PHONE_QUERY = '(max-width: 47.9375rem)';

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => {
        list.removeEventListener('change', onChange);
      };
    },
    () => window.matchMedia(query).matches,
    // False on the server, so the HTML is the wide layout until hydration.
    () => false,
  );
}

const subscribeNever = () => () => undefined;

/**
 * False on the server and during hydration, true after. An island renders exactly its server HTML
 * until this is true, so state that changed before it hydrated (another island already ran a
 * command) can't cause a hydration mismatch.
 */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

/** True on the one-screen desktop layout. */
export const useDesk = (): boolean => useMediaQuery(DESK_QUERY);

/** True on phones (below 768px). */
export const usePhone = (): boolean => useMediaQuery(PHONE_QUERY);
