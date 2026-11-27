// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SNAPSHOT } from '@/lib/commands/fixtures';
import { clearTerminal, runCommand, setRunContext } from '@/lib/state/run';
import { $selection } from '@/lib/state/selection';
import { $snapshot } from '@/lib/state/snapshot-loader';
import { $terminal } from '@/lib/state/terminal';

import { startDeepLinks } from './deep-link';

const PATH = '/pr-preview/pr-9/';
let stop: () => void = () => undefined;

/** Lets a run started by the glue (runs are async) settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const entries = () => $terminal.get().entries;
const run = () => new URLSearchParams(location.search).get('run');

function phone(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches && query.includes('max-width'),
    media: query,
  }));
}

function open(url: string) {
  stop();
  history.replaceState(null, '', url);
  stop = startDeepLinks();
}

beforeEach(() => {
  setRunContext({ build: { version: '0.4.0', commit: 'abc1234' }, base: PATH });
  $terminal.set({ entries: [], history: [], announcement: '' });
  $selection.set(undefined);
  $snapshot.set({ status: 'ready', data: SNAPSHOT });
  phone(false);
});

afterEach(() => {
  stop();
  vi.unstubAllGlobals();
  history.replaceState(null, '', PATH);
});

describe('startDeepLinks', () => {
  it('runs a read-only ?run= on load, without adding history', async () => {
    const before = history.length;
    open(`${PATH}?run=kubectl+describe+pod+asktrace`);
    await settle();
    expect(entries().at(-1)).toMatchObject({ input: 'kubectl describe pod asktrace', source: 'deep-link' });
    expect($selection.get()).toEqual({ kind: 'pod', name: 'asktrace' });
    expect(history.length).toBe(before);
    expect(run()).toBe('kubectl describe pod asktrace');
  });

  it('ignores anything that is not on the read-only list', async () => {
    open(`${PATH}?run=apply+-f+contact.yaml`);
    await settle();
    expect(entries()).toEqual([]);
    open(`${PATH}?run=%3Cscript%3E`);
    await settle();
    expect(entries()).toEqual([]);
  });

  it('adds a history entry for each describe, so Back steps through views', async () => {
    open(PATH);
    const before = history.length;
    await runCommand('kubectl describe pod asktrace', 'link');
    await settle();
    expect(run()).toBe('kubectl describe pod asktrace');
    expect(history.length).toBe(before + 1);
  });

  it('replaces the URL for other read-only commands', async () => {
    open(PATH);
    const before = history.length;
    await runCommand('kubectl get nodes', 'chip');
    await settle();
    expect(run()).toBe('kubectl get nodes');
    expect(history.length).toBe(before);
  });

  it('drops ?run= on clear and for commands a link must not run', async () => {
    open(`${PATH}?run=kubectl+get+nodes`);
    await settle();
    clearTerminal();
    await runCommand('clear', 'input');
    await settle();
    expect(run()).toBeNull();
    await runCommand('kubectl get nodes', 'input');
    await runCommand('kubectl port-forward github', 'input');
    await settle();
    expect(run()).toBeNull();
  });

  it('runs the view Back returns to, without adding history', async () => {
    open(PATH);
    await runCommand('kubectl describe pod asktrace', 'link');
    await runCommand('kubectl describe node mastercontrol', 'link');
    await settle();
    const before = history.length;
    history.replaceState(null, '', `${PATH}?run=kubectl+describe+pod+asktrace`);
    window.dispatchEvent(new PopStateEvent('popstate'));
    await settle();
    expect($selection.get()).toEqual({ kind: 'pod', name: 'asktrace' });
    expect(entries().at(-1)?.source).toBe('deep-link');
    expect(history.length).toBe(before);
  });

  it('goes back to the pre-selected role when Back reaches a page without ?run=', async () => {
    open(PATH);
    await runCommand('kubectl describe pod asktrace', 'link');
    await settle();
    history.replaceState(null, '', PATH);
    window.dispatchEvent(new PopStateEvent('popstate'));
    await settle();
    expect($selection.get()).toEqual({ kind: 'node', name: SNAPSHOT.selected });
  });

  it('opens cluster mode on phones, keeping the hash on later URLs', async () => {
    phone(true);
    open(`${PATH}?run=kubectl+describe+pod+asktrace`);
    await settle();
    expect(location.hash).toBe('#cluster');
    await runCommand('kubectl get nodes', 'chip');
    await settle();
    expect(location.hash).toBe('#cluster');
    expect(run()).toBe('kubectl get nodes');
  });

  it('stops following runs once stopped', async () => {
    open(PATH);
    stop();
    await runCommand('kubectl get nodes', 'chip');
    await settle();
    expect(run()).toBeNull();
  });
});
