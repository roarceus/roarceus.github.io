import { beforeEach, describe, expect, it } from 'vitest';

import { SNAPSHOT } from '@/lib/commands/fixtures';
import type { CommandResult } from '@/lib/commands/types';

import { clearTerminal, echoCancel, runCommand, seedTerminal, setRunContext } from './run';
import { $selection } from './selection';
import { $snapshot, loadSnapshot } from './snapshot-loader';
import { $terminal, MAX_ENTRIES, summarize } from './terminal';

const OFFLINE_ERROR = 'Unable to connect to the server: failed to load cluster data';

beforeEach(() => {
  setRunContext({ build: { version: '0.4.0', commit: 'abc1234' }, base: '/' });
  $terminal.set({ entries: [], history: [], announcement: '' });
  $selection.set(undefined);
  $snapshot.set({ status: 'ready', data: SNAPSHOT });
});

const entries = () => $terminal.get().entries;

describe('runCommand', () => {
  it('appends one entry, records the source, pushes history, and announces the result', async () => {
    await runCommand('kubectl get nodes', 'input');
    const [entry] = entries();
    expect(entries()).toHaveLength(1);
    expect(entry).toMatchObject({ input: 'kubectl get nodes', source: 'input' });
    expect(entry?.result.kind).toBe('table');
    expect($terminal.get().history).toEqual(['kubectl get nodes']);
    if (!entry) throw new Error('entry');
    expect($terminal.get().announcement).toBe(summarize(entry));
  });

  it(`keeps the last ${String(MAX_ENTRIES)} entries and announces only the newest`, async () => {
    for (let i = 0; i <= MAX_ENTRIES; i++)
      await runCommand(i === MAX_ENTRIES ? 'kubectl version' : 'help', 'chip');
    expect(entries()).toHaveLength(MAX_ENTRIES);
    const newest = entries().at(-1);
    if (!newest) throw new Error('entry');
    expect(newest.input).toBe('kubectl version');
    expect($terminal.get().announcement).toBe(summarize(newest));
    expect(new Set(entries().map((entry) => entry.id)).size).toBe(MAX_ENTRIES);
  });

  it('prints a bare prompt for blank input and announces nothing', async () => {
    await runCommand('kubectl version', 'input');
    await runCommand('   ', 'input');
    expect(entries()).toHaveLength(2);
    expect(entries()[1]).toMatchObject({ input: '', result: { kind: 'lines', lines: [] } });
    expect($terminal.get().announcement).toBe('');
  });

  it('skips blanks and consecutive duplicates in history', async () => {
    for (const input of ['help', 'help', '', 'kubectl version', 'help']) await runCommand(input, 'input');
    expect($terminal.get().history).toEqual(['help', 'kubectl version', 'help']);
  });

  it('prints parse errors as error results', async () => {
    await runCommand('ls -la', 'input');
    expect(entries()[0]?.result).toEqual({ kind: 'error', message: 'command not found: ls' });
  });

  it('sets the selection from a detail result', async () => {
    await runCommand('kubectl describe pod asktrace', 'link');
    expect($selection.get()).toEqual({ kind: 'pod', name: 'asktrace' });
  });

  it('clear empties the output, keeps history, and resets the selection to the pre-selected node', async () => {
    await runCommand('kubectl describe pod asktrace', 'input');
    await runCommand('clear', 'input');
    expect(entries()).toEqual([]);
    expect($terminal.get().history).toEqual(['kubectl describe pod asktrace', 'clear']);
    expect($selection.get()).toEqual({ kind: 'node', name: 'mastercontrol' });
    expect($terminal.get().announcement).toBe('');
  });

  it('clearTerminal with no data leaves nothing selected', () => {
    $snapshot.set({ status: 'error' });
    $selection.set({ kind: 'pod', name: 'asktrace' });
    clearTerminal();
    expect($selection.get()).toBeUndefined();
  });
});

describe('runCommand and the snapshot', () => {
  it('waits for a load in progress', async () => {
    $snapshot.set({ status: 'idle' });
    let respond: (response: Response) => void = () => undefined;
    const fetcher = () => new Promise<Response>((resolve) => (respond = resolve));
    const loading = loadSnapshot('/cluster.abc.json', fetcher);
    const running = runCommand('kubectl get nodes', 'deep-link');
    expect(entries()).toHaveLength(0);
    respond(new Response(JSON.stringify(SNAPSHOT)));
    await Promise.all([loading, running]);
    expect(entries()[0]?.result.kind).toBe('table');
  });

  it('fails data commands after an error but still runs help, clear, and version', async () => {
    $snapshot.set({ status: 'error' });
    await runCommand('kubectl get nodes', 'input');
    expect(entries()[0]?.result).toEqual({ kind: 'error', message: OFFLINE_ERROR });
    await runCommand('help', 'input');
    expect(entries()[1]?.result.kind).toBe('lines');
    await runCommand('kubectl version', 'input');
    expect(entries()[2]?.result.kind).toBe('lines');
    await runCommand('clear', 'input');
    expect(entries()).toEqual([]);
  });
});

describe('summarize', () => {
  const entry = (result: Parameters<typeof summarize>[0]['result']) =>
    summarize({ id: 1, input: 'x', source: 'input', result });

  it('describes each result kind in one short sentence', () => {
    expect(
      entry({
        kind: 'table',
        caption: 'kubectl get nodes',
        columns: [],
        rows: [{ name: 'a' }, { name: 'b' }],
      }),
    ).toBe('kubectl get nodes: 2 rows');
    expect(entry({ kind: 'table', caption: 'kubectl get nodes', columns: [], rows: [{ name: 'a' }] })).toBe(
      'kubectl get nodes: 1 row',
    );
    expect(entry({ kind: 'detail', target: { kind: 'pod', name: 'asktrace' }, lines: [] })).toBe(
      'Showing pod asktrace',
    );
    expect(entry({ kind: 'yaml', text: 'a: 1\nb: 2\n' })).toBe('YAML output, 2 lines');
    expect(entry({ kind: 'lines', lines: [{ text: 'one' }] })).toBe('one');
    expect(entry({ kind: 'lines', lines: [{ text: 'one' }, { text: 'two' }, { text: 'three' }] })).toBe(
      'one, and 2 more lines',
    );
    expect(entry({ kind: 'lines', lines: [] })).toBe('');
    expect(entry({ kind: 'error', message: 'error: nope' })).toBe('error: nope');
    expect(entry({ kind: 'error', message: 'error: nope', suggestion: 'kubectl get nodes' })).toBe(
      'error: nope Did you mean this? kubectl get nodes',
    );
    expect(entry({ kind: 'action', action: 'open', lines: [{ text: 'Opening github' }] })).toBe(
      'Opening github',
    );
    expect(entry({ kind: 'action', action: 'clear' })).toBe('');
  });
});

describe('seedTerminal', () => {
  it('shows the server-rendered entry once, before anything has run', async () => {
    const result: CommandResult = { kind: 'lines', lines: [{ text: 'seed' }] };
    seedTerminal('kubectl get experience', result);
    seedTerminal('kubectl get experience', result);
    expect(entries()).toHaveLength(1);
    expect(entries()[0]).toMatchObject({ input: 'kubectl get experience', source: 'page', result });
    expect($terminal.get().history).toEqual([]);
    expect($terminal.get().announcement).toBe('');
    await runCommand('clear', 'input');
    seedTerminal('kubectl get experience', result);
    expect(entries()).toEqual([]);
  });
});

describe('echoCancel', () => {
  it('prints the line with ^C, skipping history and the announcement', async () => {
    await runCommand('kubectl version', 'input');
    const announcement = $terminal.get().announcement;
    echoCancel('kubectl get no');
    expect(entries().at(-1)).toMatchObject({
      input: 'kubectl get no^C',
      result: { kind: 'lines', lines: [] },
    });
    expect($terminal.get().history).toEqual(['kubectl version']);
    expect($terminal.get().announcement).toBe(announcement);
  });
});
