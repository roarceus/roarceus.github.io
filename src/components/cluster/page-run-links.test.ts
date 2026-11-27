// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SNAPSHOT } from '@/lib/commands/fixtures';
import { setRunContext } from '@/lib/state/run';
import { $selection } from '@/lib/state/selection';
import { $snapshot } from '@/lib/state/snapshot-loader';
import { $terminal } from '@/lib/state/terminal';

import { startPageRunLinks } from './page-run-links';

let stop: () => void = () => undefined;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function phone(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: matches && query.includes('max-width'),
    media: query,
  }));
}

function contactLink(): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = '/plain/#contact';
  link.dataset.run = 'kubectl apply -f contact.yaml';
  link.append(document.createElement('span'));
  document.body.append(link);
  return link;
}

function click(target: Element, init: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
  target.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  setRunContext({ build: { version: '0.4.0', commit: 'abc1234' }, base: '/' });
  $terminal.set({ entries: [], history: [], announcement: '' });
  $selection.set(undefined);
  $snapshot.set({ status: 'ready', data: SNAPSHOT });
  phone(false);
  stop = startPageRunLinks();
});

afterEach(() => {
  stop();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('startPageRunLinks', () => {
  it('runs a data-run link in place on a plain click, even from inside it', async () => {
    const event = click(contactLink().firstElementChild ?? document.body);
    await settle();
    expect(event.defaultPrevented).toBe(true);
    expect($terminal.get().entries.at(-1)?.source).toBe('link');
    expect($selection.get()).toEqual({ kind: 'contact', name: 'sohan' });
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }])(
    'keeps the link for a modified click (%o)',
    (init) => {
      expect(click(contactLink(), init).defaultPrevented).toBe(false);
    },
  );

  it('keeps the link on phones, where the plain view is the page', () => {
    phone(true);
    expect(click(contactLink()).defaultPrevented).toBe(false);
  });

  it('ignores links without data-run, and stops when asked', () => {
    const plain = document.createElement('a');
    plain.href = '/plain/';
    document.body.append(plain);
    expect(click(plain).defaultPrevented).toBe(false);
    stop();
    expect(click(contactLink()).defaultPrevented).toBe(false);
  });
});
