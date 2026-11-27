import { useStore } from '@nanostores/react';
import { lazy, Suspense, useRef } from 'react';

import { ResultView } from '@/components/terminal/ResultView';
import { RunLink } from '@/components/terminal/RunLink';
import { focusRing, type Status } from '@/components/ui/recipes';
import { StatusPill } from '@/components/ui/StatusPill';
import { useDesk, useHydrated, usePhone } from '@/components/ui/useDesk';
import { usePager } from '@/components/ui/usePager';
import { panelView, type PanelView } from '@/lib/commands/panel';
import type { PodPhase } from '@/lib/content/cluster';
import { $selection } from '@/lib/state/selection';
import { $snapshot } from '@/lib/state/snapshot-loader';
import { $terminal } from '@/lib/state/terminal';

import { CopyLink } from './CopyLink';

// Its own chunk: only `kubectl apply -f contact.yaml` loads it (ADR 0005, design doc §5.5).
const ContactManifest = lazy(() =>
  import('./ContactManifest').then((module) => ({ default: module.ContactManifest })),
);

/**
 * The detail panel island (design doc stage-3 §5.5). The server renders `initial` (the pre-selected
 * role), so no-JS and first paint are unchanged; after hydration it follows `$selection`: a `describe`,
 * a clicked name, and later the map. On phones it is the bottom sheet's content, so it shows the latest
 * terminal result once a command runs. On the one-screen layout it never scrolls: long details page.
 * `apply -f contact.yaml` swaps the details for the contact manifest form.
 */

interface Props {
  /** The view for the pre-selected role, built on the server by `panelView`. */
  initial: PanelView;
  base: string;
}

const PHASE: Record<PodPhase, Status> = { Running: 'running', Pending: 'pending', Completed: 'completed' };
const eyebrow = 'font-mono text-sm font-normal text-text-muted';
const pagerButton = `inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-text hover:text-accent-soft ${focusRing}`;

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Tags({ items, label }: { items: readonly string[]; label: string }) {
  return (
    <ul role="list" aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className="rounded-full bg-surface-2 px-2.5 py-0.5 font-mono text-xs text-text-muted">
          {item}
        </li>
      ))}
    </ul>
  );
}

/** One block per child, so the pager can break between them. */
function viewBlocks(view: PanelView, base: string) {
  const runLink = `link inline-flex min-h-11 items-center ${focusRing}`;
  if (view.kind === 'node') {
    return [
      <h2 key="head" className={eyebrow}>{`describe node/${view.name}`}</h2>,
      ...view.roles.flatMap((role) => [
        <div key={`${role.title}-head`} className="flex flex-col gap-1">
          <h3 className="text-xl font-semibold text-text">
            {role.title}, <span className="text-text-muted">{role.org}</span>
          </h3>
          <p className="font-mono text-sm text-text-muted">{role.range}</p>
        </div>,
        <p key={`${role.title}-summary`} className="text-text-muted">
          {role.summary}
        </p>,
        ...(role.highlights.length > 0
          ? [
              <ul
                key={`${role.title}-highlights`}
                role="list"
                aria-label={`Highlights at ${role.org}`}
                className="flex list-disc flex-col gap-1 pl-5 text-text-muted"
              >
                {role.highlights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>,
            ]
          : []),
        <Tags key={`${role.title}-tech`} items={role.tech} label={`Tech used at ${role.org}`} />,
      ]),
      ...(view.pods.length > 0
        ? [
            <h3 key="pods" className={eyebrow}>
              pods
            </h3>,
            <ul key="pod-list" role="list" aria-label={`Pods on ${view.name}`} className="flex flex-col">
              {view.pods.map((pod) => (
                <li key={pod.slug} className="flex flex-wrap items-center justify-between gap-x-2">
                  <RunLink
                    run={`kubectl describe pod ${pod.slug}`}
                    base={base}
                    source="link"
                    className={`${runLink} font-mono text-sm`}
                  >
                    {pod.slug}
                  </RunLink>
                  <StatusPill status={PHASE[pod.phase]} />
                </li>
              ))}
            </ul>,
          ]
        : []),
      <p key="all" className="font-mono text-sm">
        <RunLink run="kubectl get experience" base={base} source="link" className={runLink}>
          All experience
        </RunLink>
      </p>,
    ];
  }
  return [
    <h2 key="head" className={eyebrow}>{`describe pod/${view.name}`}</h2>,
    <div key="title" className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <h3 className="text-xl font-semibold text-text">{view.title}</h3>
      <StatusPill status={PHASE[view.phase]} />
    </div>,
    <p key="summary" className="text-text-muted">
      {view.summary}
    </p>,
    <p key="where" className="flex flex-wrap items-center gap-x-3 font-mono text-sm text-text-muted">
      {view.range !== undefined && <span>{view.range}</span>}
      {view.node === undefined ? (
        <span>node: none (unscheduled)</span>
      ) : (
        <RunLink run={`kubectl describe node ${view.node}`} base={base} source="link" className={runLink}>
          {`node/${view.node}`}
        </RunLink>
      )}
    </p>,
    <Tags key="tech" items={view.tech} label={`Tech used in ${view.title}`} />,
    ...(view.links.length > 0
      ? [
          <p key="links" className="flex flex-wrap gap-x-4 font-mono text-sm">
            {view.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={runLink}
              >
                {link.label}
              </a>
            ))}
          </p>,
        ]
      : []),
  ];
}

export function DetailPanel({ initial, base }: Props) {
  const selection = useStore($selection);
  const { data } = useStore($snapshot, { keys: ['data'] });
  const { entries } = useStore($terminal, { keys: ['entries'] });
  const desk = useDesk();
  const phone = usePhone();
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Until hydrated, exactly the server view: a deep link may already have run in the terminal island.
  const hydrated = useHydrated();
  const contact = hydrated && selection?.kind === 'contact';
  const live = hydrated && selection && data ? panelView(data, selection) : undefined;
  const selected = live ?? initial;
  // Phones: the sheet is where output goes, so once a command runs (not the entry shown with the
  // page) it shows that result; a describe shows the details as usual.
  const last = entries.at(-1);
  const result =
    hydrated && phone && last && last.source !== 'page' && last.result.kind !== 'detail' ? last : undefined;
  const key = result ? `run-${String(result.id)}` : contact ? 'contact' : selected.run;
  const pager = usePager(boxRef, contentRef, desk, key);

  return (
    // Paging keys on the focusable panel, the way the arrow keys scroll a scroll box.
    // eslint-disable-next-line jsx-a11y-x/no-noninteractive-element-interactions
    <section
      aria-label="Details"
      // Takes focus so Space and Page Up/Down page it on the one-screen layout (WCAG 2.1.1).
      // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
      tabIndex={0}
      onKeyDown={pager.onKeyDown}
      onFocus={pager.onFocus}
      className={`relative flex flex-col gap-3 rounded-lg border border-border bg-surface-1 p-4 sm:p-5 desk:min-h-0 desk:flex-1 ${focusRing}`}
    >
      <div ref={boxRef} data-testid="panel-pages" className="desk:min-h-0 desk:flex-1 desk:overflow-hidden">
        <div ref={contentRef} className={`flex flex-col gap-3 ${contact ? 'desk:h-full' : ''}`}>
          {result ? (
            <>
              <p className="font-mono text-sm break-all text-text">{`$ ${result.input}`}</p>
              {/* Wide tables scroll sideways inside the sheet, never the page (SPEC §4). */}
              <div
                role="region"
                aria-label="Command output"
                // A scrolling region takes keyboard focus so arrow keys can scroll it (WCAG 2.1.1).
                // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
                tabIndex={0}
                className={`overflow-x-auto rounded-md ${focusRing}`}
              >
                <ResultView result={result.result} base={base} />
              </div>
            </>
          ) : contact ? (
            <Suspense fallback={<p className="font-mono text-sm text-text-muted">Loading contact.yaml...</p>}>
              <ContactManifest email={data?.profile.links.email} />
            </Suspense>
          ) : (
            viewBlocks(selected, base)
          )}
        </div>
      </div>
      {/* The footer never pages away: Copy link for the view on screen, and the pager. It never wraps,
          so the pager showing up can't change the paged box's height (which would re-page it). */}
      {((!result && !contact) || (desk && pager.pages > 1)) && (
        <div className="flex flex-nowrap items-start justify-between gap-2 border-t border-border pt-3">
          {!result && !contact && <CopyLink run={selected.run} />}
          {desk && pager.pages > 1 && (
            <div className="ml-auto flex shrink-0 items-center font-mono text-sm text-text-muted">
              <button
                type="button"
                aria-label="Previous page"
                onClick={pager.previous}
                className={pagerButton}
              >
                <Chevron direction="left" />
              </button>
              <p className="tabular-nums">{`${String(pager.page + 1)} / ${String(pager.pages)}`}</p>
              <button type="button" aria-label="Next page" onClick={pager.next} className={pagerButton}>
                <Chevron direction="right" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
