import { useEffect, useState } from 'react';

import type { CommandResult, Line } from '@/lib/commands/types';

import { ResultTable } from './ResultTable';
import { RunLink } from './RunLink';

/**
 * Renders a command result as React elements (design doc stage-3 §5.2): text stays text, so nothing a
 * visitor types or links can become markup. Shared by the terminal and, in Task 7, the phone sheet.
 */

const TONE: Record<NonNullable<Line['tone']>, string> = {
  muted: 'text-text-muted',
  error: 'text-status-failed',
  ok: 'text-status-running',
};

/** Delay between streamed lines (`logs -f`). */
const STREAM_STEP_MS = 120;

function LineView({ line, base }: { line: Line; base: string }) {
  const content =
    line.run !== undefined ? (
      <RunLink run={line.run} base={base} source="link">
        {line.text}
      </RunLink>
    ) : line.href !== undefined ? (
      <a href={line.href} className="link">
        {line.text}
      </a>
    ) : (
      line.text
    );
  return <p className={`whitespace-pre ${line.tone ? TONE[line.tone] : 'text-text'}`}>{content}</p>;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Lines({
  lines,
  stream = false,
  base,
}: {
  lines: Line[];
  stream?: boolean | undefined;
  base: string;
}) {
  const [shown, setShown] = useState(() => (stream && !prefersReducedMotion() ? 1 : lines.length));
  useEffect(() => {
    if (shown >= lines.length) return;
    const timer = setTimeout(() => {
      setShown((count) => count + 1);
    }, STREAM_STEP_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [shown, lines.length]);
  return (
    <div className="font-mono text-sm">
      {lines.slice(0, shown).map((line, i) => (
        <LineView key={i} line={line} base={base} />
      ))}
    </div>
  );
}

export function ResultView({ result, base }: { result: CommandResult; base: string }) {
  switch (result.kind) {
    case 'table':
      return <ResultTable result={result} base={base} />;
    case 'yaml':
      return <pre className="font-mono text-sm text-text">{result.text}</pre>;
    case 'lines':
      return <Lines lines={result.lines} stream={result.stream} base={base} />;
    case 'detail':
      return <Lines lines={result.lines} base={base} />;
    case 'action':
      return <Lines lines={result.lines ?? []} base={base} />;
    case 'error':
      return (
        <div className="font-mono text-sm">
          <p className="whitespace-pre-wrap text-status-failed">{result.message}</p>
          {result.suggestion !== undefined && (
            <>
              <p className="text-text-muted">Did you mean this?</p>
              <p className="pl-[2ch]">
                <RunLink run={result.suggestion} base={base} source="link">
                  {result.suggestion}
                </RunLink>
              </p>
            </>
          )}
        </div>
      );
  }
}
