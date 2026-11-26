import { plainHref } from '@/lib/commands/fallback';
import { runCommand } from '@/lib/state/run';
import type { RunSource } from '@/lib/state/terminal';

import type { MouseEvent, ReactNode } from 'react';

interface Props {
  /** The whole command line to run. */
  run: string;
  base: string;
  source: RunSource;
  className?: string;
  children: ReactNode;
}

/**
 * A command that looks and works like a link (design doc stage-3 §5.4): without JavaScript it opens the
 * matching plain-view section; with it, a plain click runs the command in place. Modified clicks
 * (new tab, new window) keep the link.
 */
export function RunLink({ run, base, source, className = 'link', children }: Props) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void runCommand(run, source);
  };
  return (
    <a href={plainHref(run, base)} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
