import { STATUS_LABELS, STATUS_LOOK, STATUS_PILL, type Status } from './recipes';

/**
 * The React twin of StatusPill.astro (same recipes): the status is spelled out and a shape repeats it,
 * so color only reinforces it (SPEC §5, WCAG 1.4.1).
 */
export function StatusPill({ status, label = STATUS_LABELS[status] }: { status: Status; label?: string }) {
  const { shape, color, fill } = STATUS_LOOK[status];
  return (
    <span className={`${STATUS_PILL} ${fill}`}>
      <svg
        aria-hidden="true"
        data-shape={shape}
        viewBox="0 0 10 10"
        className={`size-2.5 shrink-0 ${color}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        {shape === 'filled' && <circle cx="5" cy="5" r="4" fill="currentColor" />}
        {shape === 'half' && (
          <>
            <circle cx="5" cy="5" r="4" />
            <path d="M5 1a4 4 0 0 1 0 8z" fill="currentColor" stroke="none" />
          </>
        )}
        {shape === 'cross' && <path d="m2 2 6 6M8 2 2 8" strokeLinecap="round" />}
        {shape === 'ring' && <circle cx="5" cy="5" r="4" />}
      </svg>
      {label}
    </span>
  );
}
