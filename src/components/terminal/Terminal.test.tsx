// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SNAPSHOT } from '@/lib/commands/fixtures';
import type { CommandResult } from '@/lib/commands/types';
import { $selection } from '@/lib/state/selection';
import { $snapshot } from '@/lib/state/snapshot-loader';
import { $terminal } from '@/lib/state/terminal';

import { Terminal } from './Terminal';
import { actAsync } from './test-utils';

const BASE = '/pr-preview/pr-9/';
const INITIAL: CommandResult = {
  kind: 'table',
  caption: 'kubectl get experience',
  columns: [{ key: 'name', label: 'NAME' }],
  rows: [{ name: { text: 'mastercontrol', run: 'kubectl describe node mastercontrol' } }],
};

beforeEach(() => {
  $terminal.set({ entries: [], history: [], announcement: '' });
  $selection.set(undefined);
  $snapshot.set({ status: 'ready', data: SNAPSHOT });
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query }) as MediaQueryList);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup() {
  render(
    <Terminal
      snapshotHref={`${BASE}cluster.abc.json`}
      build={{ version: '0.4.0', commit: 'abc1234' }}
      base={BASE}
      initial={{ input: 'kubectl get experience', result: INITIAL }}
      chips={['kubectl get pods -n projects', 'kubectl top skills', 'help']}
    />,
  );
  return screen.getByRole<HTMLInputElement>('textbox', { name: 'Command' });
}

const entries = () => $terminal.get().entries;
const inputs = () => entries().map((entry) => entry.input);

async function type(input: HTMLInputElement, value: string, key = 'Enter', init: KeyboardEventInit = {}) {
  fireEvent.change(input, { target: { value } });
  await actAsync(() => {
    fireEvent.keyDown(input, { key, ...init });
  });
}

describe('Terminal', () => {
  it('starts with the server-rendered table in a log that does not announce itself', () => {
    setup();
    const log = screen.getByRole('log', { name: 'Terminal output' });
    expect(log.getAttribute('aria-live')).toBe('off');
    expect(screen.getByText('$ kubectl get experience')).toBeTruthy();
    expect(screen.getByRole('table', { name: 'kubectl get experience' })).toBeTruthy();
  });

  it('runs a command on Enter and empties the line', async () => {
    const input = setup();
    await type(input, 'kubectl get nodes');
    expect(entries().at(-1)).toMatchObject({ input: 'kubectl get nodes', source: 'input' });
    expect(input.value).toBe('');
    expect(screen.getByRole('table', { name: 'kubectl get nodes' })).toBeTruthy();
  });

  it('walks history with Up and Down', async () => {
    const input = setup();
    await type(input, 'help');
    await type(input, 'kubectl version');
    await type(input, '', 'ArrowUp');
    expect(input.value).toBe('kubectl version');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('help');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.value).toBe('help');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.value).toBe('kubectl version');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.value).toBe('');
  });

  it('completes one match on Tab and lists several on the second Tab', async () => {
    const input = setup();
    await type(input, 'kubectl get no', 'Tab');
    expect(input.value).toBe('kubectl get nodes ');
    await type(input, 'kubectl get p', 'Tab');
    expect(input.value).toBe('kubectl get p');
    expect(screen.queryByText('pods projects')).toBeNull();
    await actAsync(() => {
      fireEvent.keyDown(input, { key: 'Tab' });
    });
    expect(screen.getByText('pods projects')).toBeTruthy();
  });

  it('leaves Tab alone on an empty line or with nothing to complete, so focus can move on', () => {
    const input = setup();
    expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true);
    fireEvent.change(input, { target: { value: 'kubectl get zzz' } });
    expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true);
    expect(fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })).toBe(true);
  });

  it('clears on Ctrl+L and cancels the line on Ctrl+C', async () => {
    const input = setup();
    await type(input, 'kubectl get no', 'c', { ctrlKey: true });
    expect(inputs().at(-1)).toBe('kubectl get no^C');
    expect(input.value).toBe('');
    await type(input, '', 'l', { ctrlKey: true });
    expect(entries()).toEqual([]);
  });

  it('lets Ctrl+C copy when text is selected', () => {
    const input = setup();
    fireEvent.change(input, { target: { value: 'kubectl' } });
    input.setSelectionRange(0, 7);
    expect(fireEvent.keyDown(input, { key: 'c', ctrlKey: true })).toBe(true);
    expect(input.value).toBe('kubectl');
  });

  it('runs a chip instead of following its plain-view link', async () => {
    setup();
    const chip = screen.getByRole('link', { name: 'top skills' });
    expect(chip.getAttribute('href')).toBe('/pr-preview/pr-9/plain/#skills');
    await actAsync(() => {
      expect(fireEvent.click(chip)).toBe(false);
    });
    expect(entries().at(-1)).toMatchObject({ input: 'kubectl top skills', source: 'chip' });
  });

  it('runs a table name and selects it', async () => {
    setup();
    await actAsync(() => {
      fireEvent.click(screen.getByRole('link', { name: 'mastercontrol' }));
    });
    expect(entries().at(-1)).toMatchObject({ input: 'kubectl describe node mastercontrol', source: 'link' });
    expect($selection.get()).toEqual({ kind: 'node', name: 'mastercontrol' });
  });

  it('shows the load error with a Retry that loads the data again', async () => {
    $snapshot.set({ status: 'error' });
    const fetcher = vi.fn(() => Promise.resolve(new Response(JSON.stringify(SNAPSHOT))));
    vi.stubGlobal('fetch', fetcher);
    setup();
    expect(screen.getByText('Unable to connect to the server: failed to load cluster data')).toBeTruthy();
    await actAsync(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    });
    expect(fetcher).toHaveBeenCalledWith(`${BASE}cluster.abc.json`);
    expect($snapshot.get().status).toBe('ready');
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('loads the data on mount', async () => {
    $snapshot.set({ status: 'idle' });
    const fetcher = vi.fn(() => Promise.resolve(new Response(JSON.stringify(SNAPSHOT))));
    vi.stubGlobal('fetch', fetcher);
    setup();
    await actAsync(() => undefined);
    expect(fetcher).toHaveBeenCalledOnce();
    expect($snapshot.get().status).toBe('ready');
  });

  it('collapses and expands the output', () => {
    setup();
    const button = screen.getByRole('button', { name: 'Collapse' });
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.textContent).toBe('Expand');
    expect(screen.getByRole('log', { hidden: true }).hidden).toBe(true);
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('opens port-forward targets in a new tab', async () => {
    const open = vi.fn();
    vi.stubGlobal('open', open);
    const input = setup();
    await type(input, 'kubectl port-forward github');
    expect(open).toHaveBeenCalledWith('https://github.com/roarceus', '_blank', 'noopener,noreferrer');
  });
});
