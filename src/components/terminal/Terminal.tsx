import { useStore } from '@nanostores/react';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';

import { button, chip } from '@/components/ui/recipes';
import type { CommandContext, CommandResult } from '@/lib/commands/types';
import { seedTerminal, setRunContext } from '@/lib/state/run';
import { $snapshot, loadSnapshot } from '@/lib/state/snapshot-loader';
import { $terminal } from '@/lib/state/terminal';

import { LiveRegion } from './LiveRegion';
import { ResultView } from './ResultView';
import { RunLink } from './RunLink';
import { TerminalInput } from './TerminalInput';

/**
 * The docked terminal island (design doc stage-3 §5.4). The server renders today's
 * `kubectl get experience` and the chips as plain-view links, so no-JS and first paint match Stage 2;
 * hydration adds the input and turns chips and names into commands. Every run goes through
 * `runCommand`.
 */

interface Props {
  /** `url('cluster.<hash>.json')`. */
  snapshotHref: string;
  build: CommandContext['build'];
  base: string;
  /** The server-rendered first entry. */
  initial: { input: string; result: CommandResult };
  /** Whole command lines; the chip drops the leading `kubectl`. */
  chips: string[];
}

const subscribeNever = () => () => undefined;
/** False on the server and during hydration, true after: the input exists only once it can work. */
const useHydrated = () =>
  useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

/** Opens `port-forward` targets and follows `config use-context plain`, once per entry. */
function useActions() {
  const { entries } = useStore($terminal, { keys: ['entries'] });
  const handledRef = useRef(entries.at(-1)?.id);
  const last = entries.at(-1);
  useEffect(() => {
    if (!last || last.id === handledRef.current) return;
    handledRef.current = last.id;
    const { result } = last;
    if (result.kind !== 'action' || result.href === undefined) return;
    if (result.action === 'open') window.open(result.href, '_blank', 'noopener,noreferrer');
    if (result.action === 'navigate') window.location.assign(result.href);
  }, [last]);
  return entries;
}

export function Terminal({ snapshotHref, build, base, initial, chips }: Props) {
  // Once, before the first read of the store, so the hydrated output matches the server's. Not on
  // later renders: after Ctrl+L the output must stay empty.
  // eslint-disable-next-line @eslint-react/use-state -- a one-time initializer, not state
  useState(() => {
    setRunContext({ build, base });
    seedTerminal(initial.input, initial.result);
  });
  const entries = useActions();
  const { status } = useStore($snapshot, { keys: ['status'] });
  const hydrated = useHydrated();
  // Collapse remembers the newest entry it hid; any new output expands the terminal again, so a chip,
  // name or command never prints out of sight.
  const lastId = entries.at(-1)?.id;
  const [collapsedAt, setCollapsedAt] = useState<number | undefined | null>(null);
  const collapsed = collapsedAt !== null && collapsedAt === lastId;
  // Follow the output only while the reader is at the bottom; scrolled up, new output waits behind
  // "Jump to latest". `seenId` is the newest entry they were at the bottom for.
  const [atBottom, setAtBottom] = useState(true);
  const [seenId, setSeenId] = useState(lastId);
  const atBottomRef = useRef(true);
  const outputId = useId();
  const outputRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ($snapshot.get().status === 'idle') void loadSnapshot(snapshotHref);
  }, [snapshotHref]);

  const toBottom = () => {
    const box = outputRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  };

  useEffect(() => {
    if (atBottomRef.current) toBottom();
  }, [lastId, collapsed]);

  // Streamed lines grow the output after the entry lands: keep following while at the bottom.
  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (atBottomRef.current) toBottom();
    });
    observer.observe(content);
    return () => {
      observer.disconnect();
    };
  }, []);

  const onScroll = () => {
    const box = outputRef.current;
    if (!box) return;
    const bottom = box.scrollHeight - box.scrollTop - box.clientHeight <= 8;
    atBottomRef.current = bottom;
    setAtBottom(bottom);
    if (bottom) setSeenId(lastId);
  };

  const showJump = !collapsed && !atBottom && lastId !== seenId;

  return (
    <section
      aria-label="Terminal"
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4"
    >
      <div className="relative" hidden={collapsed}>
        <div
          id={outputId}
          ref={outputRef}
          role="log"
          aria-live="off"
          aria-label="Terminal output"
          // A scrolling region takes keyboard focus so arrow keys can scroll it (WCAG 2.1.1).
          // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
          tabIndex={0}
          hidden={collapsed}
          onScroll={onScroll}
          className="relative flex max-h-[max(var(--terminal-h),40vh)] flex-col overflow-auto rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft desk:max-h-[clamp(6rem,25dvh,var(--terminal-h))]"
        >
          <div ref={contentRef} className="flex flex-col gap-3">
            {entries.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-1">
                <p className="font-mono text-sm whitespace-pre text-text">{`$ ${entry.input}`}</p>
                <ResultView result={entry.result} base={base} />
              </div>
            ))}
          </div>
        </div>
        {showJump && (
          <button
            type="button"
            onClick={() => {
              toBottom();
              outputRef.current?.focus();
            }}
            className={`${button('secondary')} absolute right-2 bottom-2`}
          >
            Jump to latest
          </button>
        )}
      </div>
      {status === 'error' && (
        <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
          <p className="text-status-failed">Unable to connect to the server: failed to load cluster data</p>
          <button
            type="button"
            onClick={() => {
              void loadSnapshot(snapshotHref);
            }}
            className={button('secondary')}
          >
            Retry
          </button>
        </div>
      )}
      <div className="min-h-11">{hydrated && <TerminalInput build={build} base={base} />}</div>
      <div className="flex items-start gap-3">
        <nav aria-label="Commands" className="min-w-0 flex-1">
          <ul
            role="list"
            className="flex [scrollbar-width:none] gap-2 overflow-x-auto md:flex-wrap md:overflow-visible"
          >
            {chips.map((run) => (
              <li key={run} className="shrink-0">
                <RunLink run={run} base={base} source="chip" className={chip()}>
                  {run.replace(/^kubectl /, '')}
                </RunLink>
              </li>
            ))}
          </ul>
        </nav>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls={outputId}
          onClick={() => {
            setCollapsedAt(collapsed ? null : lastId);
          }}
          className={`${button('ghost')} shrink-0 max-md:hidden`}
        >
          {collapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>
      <LiveRegion />
    </section>
  );
}
