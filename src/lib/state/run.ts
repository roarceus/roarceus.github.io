import { execute } from '@/lib/commands/run';
import type { CommandContext, CommandResult } from '@/lib/commands/types';
import { parse } from '@/lib/parser/parse';

import { $sceneFilter } from './scene';
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
  $sceneFilter.set(undefined);
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

const append = (entry: Entry) => {
  $terminal.setKey('entries', [...$terminal.get().entries, entry].slice(-MAX_ENTRIES));
};

/**
 * Shows the server-rendered first result (today's `kubectl get experience`) as the first entry, so the
 * hydrated island matches the HTML. Only before anything has run, so a cleared terminal stays clear.
 */
export function seedTerminal(input: string, result: CommandResult): void {
  const { entries, history } = $terminal.get();
  if (entries.length > 0 || history.length > 0) return;
  append({ id: nextId++, input, source: 'page', result });
}

/** Ctrl+C: echoes the line with `^C` and runs nothing (no history, no announcement). */
export function echoCancel(input: string): void {
  append({ id: nextId++, input: `${input}^C`, source: 'input', result: { kind: 'lines', lines: [] } });
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
  if (result.kind === 'detail') {
    $selection.set(result.target);
    $sceneFilter.set(undefined);
  }
  if (result.kind === 'table' && result.filter) $sceneFilter.set(result.filter);

  const entry: Entry = { id: nextId++, input: trimmed, source, result };
  append(entry);
  $terminal.setKey('announcement', summarize(entry));
}
