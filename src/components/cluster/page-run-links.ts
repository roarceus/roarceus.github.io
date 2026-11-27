import { runCommand } from '@/lib/state/run';

/**
 * Page links that run a command in place on the dashboard (ADR 0005): the top bar's Contact button
 * carries `data-run` there. They stay real links without JavaScript, on phones (where the plain view is
 * the page), and for modified clicks (new tab, new window). Returns a function that stops it.
 */

/** Phones: the same breakpoint as deep-link.ts. */
const PHONE = '(max-width: 47.9375rem)';

export function startPageRunLinks(): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>('a[data-run]');
    const run = link?.dataset.run;
    if (run === undefined || window.matchMedia(PHONE).matches) return;
    event.preventDefault();
    void runCommand(run, 'link');
  };
  document.addEventListener('click', onClick);
  return () => {
    document.removeEventListener('click', onClick);
  };
}
