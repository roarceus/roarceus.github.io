// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SNAPSHOT } from '@/lib/commands/fixtures';
import type { CommandResult } from '@/lib/commands/types';
import { setRunContext } from '@/lib/state/run';
import { $snapshot } from '@/lib/state/snapshot-loader';
import { $terminal } from '@/lib/state/terminal';

import { LiveRegion } from './LiveRegion';
import { ResultView } from './ResultView';
import { actAsync } from './test-utils';

const BASE = '/pr-preview/pr-9/';

function reducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query }) as MediaQueryList);
}

beforeEach(() => {
  setRunContext({ build: { version: '0.4.0', commit: 'abc1234' }, base: BASE });
  $terminal.set({ entries: [], history: [], announcement: '' });
  $snapshot.set({ status: 'ready', data: SNAPSHOT });
  reducedMotion(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const show = (result: CommandResult) => render(<ResultView result={result} base={BASE} />);
const lastRun = () => $terminal.get().entries.at(-1);

describe('ResultView', () => {
  it('renders a table with kubectl headers, and names that run their command instead of navigating', async () => {
    show({
      kind: 'table',
      caption: 'kubectl get nodes',
      columns: [
        { key: 'name', label: 'NAME' },
        { key: 'status', label: 'STATUS' },
      ],
      rows: [
        { name: { text: 'mastercontrol', run: 'kubectl describe node mastercontrol' }, status: 'Ready' },
      ],
    });
    expect(screen.getByRole('table', { name: 'kubectl get nodes' })).toBeTruthy();
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual(['NAME', 'STATUS']);
    const link = screen.getByRole('link', { name: 'mastercontrol' });
    expect(link.getAttribute('href')).toBe('/pr-preview/pr-9/plain/#experience');
    await actAsync(() => {
      expect(fireEvent.click(link)).toBe(false);
    });
    expect(lastRun()).toMatchObject({ input: 'kubectl describe node mastercontrol', source: 'link' });
  });

  it('lets a modified click open the plain view in a new tab', () => {
    show({ kind: 'lines', lines: [{ text: 'help', run: 'help' }] });
    expect(fireEvent.click(screen.getByRole('link', { name: 'help' }), { ctrlKey: true })).toBe(true);
    expect($terminal.get().entries).toEqual([]);
  });

  it('keeps 120-character values whole', () => {
    const long = 'x'.repeat(120);
    show({ kind: 'table', caption: 'c', columns: [{ key: 'role', label: 'ROLE' }], rows: [{ role: long }] });
    expect(screen.getByRole('cell').textContent).toBe(long);
  });

  it('lets comma lists break after each comma and nowhere else', () => {
    show({
      kind: 'table',
      caption: 'c',
      columns: [{ key: 'tech', label: 'TECH' }],
      rows: [{ tech: 'Go,Python,GKE' }],
    });
    const cell = screen.getByRole('cell');
    expect(cell.textContent).toBe('Go,Python,GKE');
    expect(cell.querySelectorAll('wbr')).toHaveLength(2);
    const parts = [...cell.childNodes].map((node) => (node.nodeName === 'WBR' ? '|' : node.textContent));
    expect(parts.join('')).toBe('Go,|Python,|GKE');
  });

  it('renders links, toned lines, and YAML as text', () => {
    show({
      kind: 'lines',
      lines: [
        { text: 'update/stage-3', href: '/updates/stage-3/' },
        { text: 'boom', tone: 'error' },
      ],
    });
    expect(screen.getByRole('link', { name: 'update/stage-3' }).getAttribute('href')).toBe(
      '/updates/stage-3/',
    );
    expect(screen.getByText('boom').className).toContain('text-status-failed');
    cleanup();
    show({ kind: 'yaml', text: 'kind: List\nitems: []\n' });
    expect(document.querySelector('pre')?.textContent).toBe('kind: List\nitems: []\n');
  });

  it('shows markup as text, never as elements', () => {
    show({ kind: 'lines', lines: [{ text: '<script>alert(1)</script><img src=x onerror=alert(1)>' }] });
    expect(document.querySelector('script, img')).toBeNull();
    expect(screen.getByText(/<script>alert/)).toBeTruthy();
  });

  it('prints errors with a suggestion to click', async () => {
    show({
      kind: 'error',
      message: 'error: unknown command "getx" for "kubectl"',
      suggestion: 'kubectl get nodes',
    });
    expect(screen.getByText('error: unknown command "getx" for "kubectl"')).toBeTruthy();
    expect(screen.getByText('Did you mean this?')).toBeTruthy();
    await actAsync(() => {
      fireEvent.click(screen.getByRole('link', { name: 'kubectl get nodes' }));
    });
    expect(lastRun()).toMatchObject({ input: 'kubectl get nodes', source: 'link' });
  });

  it('renders the lines of detail and action results', () => {
    show({ kind: 'detail', target: { kind: 'pod', name: 'asktrace' }, lines: [{ text: 'Name: asktrace' }] });
    expect(screen.getByText('Name: asktrace')).toBeTruthy();
    cleanup();
    show({
      kind: 'action',
      action: 'navigate',
      href: '/plain/',
      lines: [{ text: 'Switched to context "plain".' }],
    });
    expect(screen.getByText('Switched to context "plain".')).toBeTruthy();
  });

  it('reveals a stream line by line', () => {
    vi.useFakeTimers();
    show({ kind: 'lines', stream: true, lines: [{ text: 'one' }, { text: 'two' }, { text: 'three' }] });
    expect(screen.queryByText('one')).toBeTruthy();
    expect(screen.queryByText('three')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.queryByText('two')).toBeTruthy();
    expect(screen.queryByText('three')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.queryByText('three')).toBeTruthy();
  });

  it('shows a stream at once under reduced motion', () => {
    reducedMotion(true);
    show({ kind: 'lines', stream: true, lines: [{ text: 'one' }, { text: 'two' }] });
    expect(screen.queryByText('two')).toBeTruthy();
  });
});

describe('LiveRegion', () => {
  it('holds the announcement in a polite live region and follows it', () => {
    render(<LiveRegion />);
    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-live')).toBe('polite');
    act(() => {
      $terminal.setKey('announcement', 'kubectl get nodes: 2 rows');
    });
    expect(region.textContent).toBe('kubectl get nodes: 2 rows');
    act(() => {
      $terminal.setKey('entries', []);
    });
    expect(region.textContent).toBe('kubectl get nodes: 2 rows');
  });
});
