import { readRunParam } from '@/lib/state/deep-link';
import { runCommand } from '@/lib/state/run';
import { $selection } from '@/lib/state/selection';
import { $snapshot } from '@/lib/state/snapshot-loader';
import { $terminal } from '@/lib/state/terminal';

/**
 * `?run=` deep links in the browser (design doc stage-3 §5.6, SPEC §4 "One playground"):
 * - On load, a read-only `?run=` runs (anything else is ignored); on phones it opens cluster mode.
 * - Every run updates the URL: a `describe` adds a history entry (so Back steps through views),
 *   other read-only commands replace it, and `clear` or anything a link must not run drops `run`.
 * - Back and Forward run the command in the URL without adding history; a URL without `run` goes
 *   back to the pre-selected role.
 * Returns a function that stops all of it.
 */

/** Phones: cluster mode is the `#cluster` target there (index.astro). */
const PHONE = '(max-width: 47.9375rem)';

/** The current URL with `run` set (or removed), keeping other parameters and the hash. */
function urlWith(run: string | undefined): string {
  const params = new URLSearchParams(window.location.search);
  if (run === undefined) params.delete('run');
  else params.set('run', run);
  const query = params.toString();
  return `${window.location.pathname}${query === '' ? '' : `?${query}`}${window.location.hash}`;
}

const linkable = (input: string): string | undefined =>
  readRunParam(`?${new URLSearchParams({ run: input }).toString()}`);

export function startDeepLinks(): () => void {
  let seen = $terminal.get().entries.at(-1)?.id;

  const unlisten = $terminal.listen(({ entries }) => {
    const last = entries.at(-1);
    if (last?.id === seen) return;
    seen = last?.id;
    // Cleared (Ctrl+L or `clear`): nothing on screen to link to.
    if (!last) {
      if (new URLSearchParams(window.location.search).has('run'))
        window.history.replaceState(window.history.state, '', urlWith(undefined));
      return;
    }
    // A deep link or Back/Forward ran it, so the URL already says this; the page's own entry isn't a run.
    if (last.source === 'deep-link' || last.source === 'page') return;
    const run = linkable(last.input);
    if (run === undefined) window.history.replaceState(window.history.state, '', urlWith(undefined));
    else if (last.result.kind === 'detail') window.history.pushState(null, '', urlWith(run));
    else window.history.replaceState(window.history.state, '', urlWith(run));
  });

  const onPopState = () => {
    const run = readRunParam(window.location.search);
    if (run !== undefined) {
      void runCommand(run, 'deep-link');
      return;
    }
    const selected = $snapshot.get().data?.selected;
    $selection.set(selected === undefined ? undefined : { kind: 'node', name: selected });
  };
  window.addEventListener('popstate', onPopState);

  const initial = readRunParam(window.location.search);
  if (initial !== undefined) {
    // Cluster mode on phones is CSS `:target`, which only a fragment navigation updates; replace()
    // adds no history entry.
    if (window.matchMedia(PHONE).matches && window.location.hash !== '#cluster')
      window.location.replace('#cluster');
    void runCommand(initial, 'deep-link');
  }

  return () => {
    unlisten();
    window.removeEventListener('popstate', onPopState);
  };
}
