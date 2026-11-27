import { useStore } from '@nanostores/react';
import { useEffect, useId, useRef, useState } from 'react';

import { startDeepLinks } from '@/components/cluster/deep-link';
import { button, chip } from '@/components/ui/recipes';
import { useDesk, useHydrated } from '@/components/ui/useDesk';
import { usePager } from '@/components/ui/usePager';
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
  // On the one-screen layout nothing scrolls (ADR 0005): the output shows only the latest result and
  // pages it like `less`. Earlier commands come back with Up/Down in the input.
  const desk = useDesk();
  const deskRef = useRef(desk);
  deskRef.current = desk;
  const last = entries.at(-1);
  const pager = usePager(outputRef, contentRef, desk, lastId);

  useEffect(() => {
    if ($snapshot.get().status === 'idle') void loadSnapshot(snapshotHref);
  }, [snapshotHref]);

  // ?run= deep links (design doc stage-3 §5.6). Here, after setRunContext, so runs use the page's base.
  useEffect(() => startDeepLinks(), []);

  const toBottom = () => {
    const box = outputRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  };

  useEffect(() => {
    if (!desk && atBottomRef.current) toBottom();
  }, [lastId, collapsed, desk]);

  // Streamed lines grow the output after the entry lands: keep following while at the bottom.
  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (!deskRef.current && atBottomRef.current) toBottom();
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

  const showJump = !desk && !collapsed && !atBottom && lastId !== seenId;

  return (
    <section
      aria-label="Terminal"
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-2 p-4"
    >
      {/* On phones the bottom sheet (the detail panel island) shows the output instead. */}
      <div className="relative max-md:hidden" hidden={collapsed}>
        {/* On the one-screen layout the command stays in a header row with the pager, so paging never
            shifts the layout and you always see which result you're reading. CSS (`desk:`) switches
            the layout, so the server-rendered page and the hydrated one match. */}
        {last && (
          <div className="hidden min-h-11 flex-wrap items-center justify-between gap-x-3 desk:flex">
            <p className="min-w-0 font-mono text-sm break-all text-text">{`$ ${last.input}`}</p>
            {desk && pager.pages > 1 && (
              <div className="flex shrink-0 items-center gap-2 font-mono text-sm text-text-muted">
                <p>{`-- more (${String(pager.page + 1)}/${String(pager.pages)}) --`}</p>
                <button
                  type="button"
                  aria-label="Previous page"
                  onClick={pager.previous}
                  className={button('ghost')}
                >
                  Previous
                </button>
                <button type="button" aria-label="Next page" onClick={pager.next} className={button('ghost')}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}
        {/* Paging keys on the focusable log, the way the arrow keys scroll a scroll box. */}
        {/* eslint-disable-next-line jsx-a11y-x/no-noninteractive-element-interactions */}
        <div
          id={outputId}
          ref={outputRef}
          role="log"
          aria-live="off"
          aria-label="Terminal output"
          // Takes keyboard focus so the arrow keys scroll it, or, on the one-screen layout, Space and
          // Page Up/Down page it (WCAG 2.1.1).
          // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
          tabIndex={0}
          hidden={collapsed}
          onScroll={onScroll}
          onKeyDown={pager.onKeyDown}
          className="relative flex max-h-[max(var(--terminal-h),40vh)] flex-col overflow-auto rounded-md leading-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft desk:max-h-[round(down,clamp(5rem,calc(25dvh-2.5rem),var(--terminal-h)),1.25rem)] desk:overflow-hidden"
        >
          <div ref={contentRef} className="flex flex-col gap-3">
            {entries.map((entry) => (
              <div key={entry.id} className={`flex flex-col gap-1 ${entry === last ? '' : 'desk:hidden'}`}>
                <p className="font-mono text-sm whitespace-pre text-text desk:hidden">{`$ ${entry.input}`}</p>
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
