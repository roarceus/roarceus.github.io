import { map } from 'nanostores';

import type { CommandResult } from '@/lib/commands/types';

/** Terminal output and history (design doc stage-3 §5.3). History lasts for the session only. */

/** Where a run came from, for Stage 6 analytics. Stage 4 adds `'map'`. */
export type RunSource = 'input' | 'chip' | 'link' | 'deep-link';

export interface Entry {
  id: number;
  /** The trimmed input, echoed after the prompt; empty for a bare prompt. */
  input: string;
  source: RunSource;
  result: CommandResult;
}

/** Output keeps the last 50 entries, so the DOM stays small. */
export const MAX_ENTRIES = 50;

export const $terminal = map<{ entries: Entry[]; history: string[]; announcement: string }>({
  entries: [],
  history: [],
  /** The `aria-live` text: a short summary of the newest result only. */
  announcement: '',
});

const plural = (count: number, word: string) => `${String(count)} ${word}${count === 1 ? '' : 's'}`;

function linesSummary(lines: readonly { text: string }[] = []): string {
  const [first, ...rest] = lines;
  if (!first) return '';
  return rest.length === 0 ? first.text : `${first.text}, and ${plural(rest.length, 'more line')}`;
}

/** The live-region text for an entry: one short sentence, never the whole output. */
export function summarize({ result }: Entry): string {
  switch (result.kind) {
    case 'table':
      return `${result.caption}: ${plural(result.rows.length, 'row')}`;
    case 'detail':
      return `Showing ${result.target.kind} ${result.target.name}`;
    case 'yaml':
      return `YAML output, ${plural(result.text.trimEnd().split('\n').length, 'line')}`;
    case 'lines':
      return linesSummary(result.lines);
    case 'error':
      return result.suggestion === undefined
        ? result.message
        : `${result.message} Did you mean this? ${result.suggestion}`;
    case 'action':
      return linesSummary(result.lines);
  }
}
