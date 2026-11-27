import { useEffect, useId, useRef, useState } from 'react';

import { button } from '@/components/ui/recipes';
import { runHref } from '@/lib/state/deep-link';

/**
 * Copies a `?run=` link that reopens this view (design doc stage-3 §5.5). When the clipboard refuses
 * (no permission, an old browser), the link appears in a read-only field, already selected, so it can
 * be copied by hand.
 */
export function CopyLink({ run }: { run: string }) {
  const id = useId();
  const [message, setMessage] = useState('');
  const [fallback, setFallback] = useState<string | undefined>(undefined);
  const fieldRef = useRef<HTMLInputElement>(null);

  // Once the fallback field shows, select the link so Ctrl+C copies it.
  useEffect(() => {
    if (fallback === undefined) return;
    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, [fallback]);

  const copy = () => {
    const href = new URL(runHref(run, window.location), window.location.href).href;
    setFallback(undefined);
    navigator.clipboard.writeText(href).then(
      () => {
        setMessage('Link copied');
      },
      () => {
        setMessage('');
        setFallback(href);
      },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className={button('secondary')}>
          Copy link
        </button>
        <p role="status" className="font-mono text-sm text-text-muted">
          {message}
        </p>
      </div>
      {fallback !== undefined && (
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="font-mono text-sm text-text-muted">
            Link to this view
          </label>
          <input
            id={id}
            ref={fieldRef}
            readOnly
            value={fallback}
            className="min-h-11 rounded-md border border-border-strong bg-surface-1 px-2 font-mono text-sm text-text"
          />
        </div>
      )}
    </div>
  );
}
