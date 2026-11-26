import { execute } from '@/lib/commands/run';
import type { CommandContext, CommandResult } from '@/lib/commands/types';
import { parse } from '@/lib/parser/parse';

import { $selection } from './selection';
import { $snapshot, snapshotSettled } from './snapshot-loader';
import { $terminal, MAX_ENTRIES, summarize, type Entry, type RunSource } from './terminal';

/**
 * The one path for running a command (design doc stage-3 §5.3): typing, chips, table names, and `?run=`
 * all call `runCommand`, and nothing else runs commands.
 */

let context: Pick<CommandContext, 'build' | 'base'> = { build: { version: '', commit: '' }, base: '/' };

/** Set once by the page: the build info and base path every run uses. */
export function setRunContext(next: Pick<CommandContext, 'build' | 'base'>): void {
  context = next;
}

let nextId = 1;

/** Empties the output (history stays, as in a shell) and selects the pre-selected role again. */
export function clearTerminal(): void {
  $terminal.setKey('entries', []);
  $terminal.setKey('announcement', '');
  const { data } = $snapshot.get();
  $selection.set(data?.selected === undefined ? undefined : { kind: 'node', name: data.selected });
}

function pushHistory(input: string): void {
  const { history } = $terminal.get();
  if (input !== '' && history.at(-1) !== input) $terminal.setKey('history', [...history, input]);
}

async function resultFor(input: string): Promise<CommandResult> {
  if (input === '') return { kind: 'lines', lines: [] };
  const parsed = parse(input);
  if (!parsed.ok) return { kind: 'error', message: parsed.error };
  if ($snapshot.get().status === 'loading') await snapshotSettled();
  return execute(parsed.command, { ...context, snapshot: $snapshot.get().data, now: new Date() });
}

export async function runCommand(input: string, source: RunSource): Promise<void> {
  const trimmed = input.trim();
  pushHistory(trimmed);
  const result = await resultFor(trimmed);
  // Stage 6 analytics hook: every run passes here once, with its source.
  if (result.kind === 'action' && result.action === 'clear') {
    clearTerminal();
    return;
  }
  if (result.kind === 'detail') $selection.set(result.target);

  const entry: Entry = { id: nextId++, input: trimmed, source, result };
  $terminal.setKey('entries', [...$terminal.get().entries, entry].slice(-MAX_ENTRIES));
  $terminal.setKey('announcement', summarize(entry));
}
