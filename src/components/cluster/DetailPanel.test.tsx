// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { actAsync } from '@/components/terminal/test-utils';
import { SNAPSHOT } from '@/lib/commands/fixtures';
import { panelView, type PanelView } from '@/lib/commands/panel';
import { runCommand, seedTerminal, setRunContext } from '@/lib/state/run';
import { $selection } from '@/lib/state/selection';
import { $snapshot } from '@/lib/state/snapshot-loader';
import { $terminal } from '@/lib/state/terminal';

import { DetailPanel } from './DetailPanel';

const BASE = '/pr-preview/pr-9/';
const view = panelView(SNAPSHOT, { kind: 'node', name: 'mastercontrol' });
if (!view) throw new Error('the fixture has no mastercontrol node');
const INITIAL: PanelView = view;

/** Which media queries match: the one-screen layout (`desk`) and phones (below 768px). */
function media({ desk = false, phone = false }: { desk?: boolean; phone?: boolean }) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('43.75rem') ? desk : query.includes('max-width') ? phone : false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

/** happy-dom does no layout: give the paged box a fixed size and a content height. */
function size(box: HTMLElement, scrollHeight: number) {
  Object.defineProperty(box, 'clientHeight', { configurable: true, value: 100 });
  Object.defineProperty(box, 'scrollHeight', { configurable: true, value: scrollHeight });
}

beforeEach(() => {
  setRunContext({ build: { version: '0.4.0', commit: 'abc1234' }, base: BASE });
  $terminal.set({ entries: [], history: [], announcement: '' });
  $selection.set(undefined);
  $snapshot.set({ status: 'ready', data: SNAPSHOT });
  media({});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const setup = () => render(<DetailPanel initial={INITIAL} base={BASE} />);
const select = (kind: 'node' | 'pod', name: string) => {
  act(() => {
    $selection.set({ kind, name });
  });
};

describe('DetailPanel', () => {
  it('shows the server-rendered role until something is selected', () => {
    setup();
    expect(screen.getByText('describe node/mastercontrol')).toBeTruthy();
    expect(screen.getByRole('heading', { name: /DevOps Engineer \(Co-op\)/ })).toBeTruthy();
    expect(screen.getByText('Shipped a bot.')).toBeTruthy();
  });

  it('hydrates with the server view even when a deep link selected something first', async () => {
    const html = renderToString(<DetailPanel initial={INITIAL} base={BASE} />);
    const container = document.createElement('div');
    container.append(document.createRange().createContextualFragment(html));
    document.body.append(container);
    // The terminal island hydrated first and ran `?run=kubectl describe pod asktrace`.
    $selection.set({ kind: 'pod', name: 'asktrace' });
    const errors: unknown[] = [];
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      await act(async () => {
        root = hydrateRoot(container, <DetailPanel initial={INITIAL} base={BASE} />, {
          onRecoverableError: (error) => errors.push(error),
        });
        await Promise.resolve();
      });
      expect(errors).toEqual([]);
      // Right after hydration it shows what was selected.
      expect(container.textContent).toContain('describe pod/asktrace');
    } finally {
      act(() => {
        root?.unmount();
      });
      container.remove();
    }
  });

  it('describes the selected pod with its status, tech, and outside links in a new tab', () => {
    setup();
    select('pod', 'asktrace');
    expect(screen.getByText('describe pod/asktrace')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'askTRACE' })).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByRole('list', { name: 'Tech used in askTRACE' }).textContent).toBe('GoKafka');
    const source = screen.getByRole('link', { name: 'Source on GitHub' });
    expect(source.getAttribute('href')).toBe('https://github.com/trace-survey-analysis');
    expect(source.getAttribute('target')).toBe('_blank');
    expect(source.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('runs a pod of the selected node in place', async () => {
    setup();
    select('node', 'mastercontrol');
    const pod = screen.getByRole('link', { name: 'deployment-gating-bot' });
    await actAsync(() => {
      fireEvent.click(pod);
    });
    expect($terminal.get().entries.at(-1)?.input).toBe('kubectl describe pod deployment-gating-bot');
    expect(screen.getByText('describe pod/deployment-gating-bot')).toBeTruthy();
  });

  it('loads the contact manifest on demand, with no copy link', async () => {
    setup();
    await actAsync(() => {
      void runCommand('kubectl apply -f contact.yaml', 'chip');
    });
    expect(await screen.findByRole('form', { name: 'Contact manifest' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /copy link/i })).toBeNull();
  });

  it('copies a link that reopens this view and says so', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    setup();
    select('pod', 'asktrace');
    await actAsync(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });
    const expected = new URL(
      `?run=${encodeURIComponent('kubectl describe pod asktrace').replaceAll('%20', '+')}`,
      location.href,
    );
    expect(writeText).toHaveBeenCalledWith(expected.href);
    expect(screen.getByRole('status').textContent).toBe('Link copied');
  });

  it('selects the link in a read-only field when the clipboard refuses', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.reject(new Error('denied')) } });
    setup();
    await actAsync(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    });
    const field = screen.getByRole<HTMLInputElement>('textbox', { name: 'Link to this view' });
    expect(field.readOnly).toBe(true);
    expect(field.value).toContain('?run=kubectl+describe+node+mastercontrol');
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, field.value.length]);
  });

  describe('on the one-screen desktop layout', () => {
    beforeEach(() => {
      media({ desk: true });
    });

    it('pages long details instead of scrolling, and a new item opens on page 1', () => {
      setup();
      const box = screen.getByTestId('panel-pages');
      size(box, 250);
      select('pod', 'asktrace');
      expect(screen.getByText('1 / 3')).toBeTruthy();
      // Focus on the pager itself (outside the paged content) never turns the page.
      const next = screen.getByRole('button', { name: 'Next page' });
      next.getBoundingClientRect = () => ({ top: 300, bottom: 344 }) as DOMRect;
      fireEvent.focus(next);
      expect(screen.getByText('1 / 3')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      expect(screen.getByText('2 / 3')).toBeTruthy();
      expect(box.scrollTop).toBeGreaterThan(0);
      select('node', 'northeastern');
      expect(screen.getByText('1 / 3')).toBeTruthy();
      expect(box.scrollTop).toBe(0);
    });

    it('lets Space type in a paged form, and turns to the page of a focused field', async () => {
      setup();
      const box = screen.getByTestId('panel-pages');
      size(box, 250);
      await actAsync(() => {
        void runCommand('kubectl apply -f contact.yaml', 'chip');
      });
      const message = await screen.findByLabelText('message:');
      expect(screen.getByText('1 / 3')).toBeTruthy();
      expect(fireEvent.keyDown(message, { key: ' ' })).toBe(true);
      expect(screen.getByText('1 / 3')).toBeTruthy();

      message.getBoundingClientRect = () => ({ top: 150, bottom: 222 }) as DOMRect;
      fireEvent.focus(message);
      expect(screen.getByText('2 / 3')).toBeTruthy();
    });

    it('shows no pager when the details fit', () => {
      setup();
      size(screen.getByTestId('panel-pages'), 100);
      select('pod', 'asktrace');
      expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
    });
  });

  describe('on phones, in the bottom sheet', () => {
    beforeEach(() => {
      media({ phone: true });
    });

    it('keeps the role until a command runs, then shows the latest result', async () => {
      seedTerminal('kubectl get experience', { kind: 'lines', lines: [{ text: 'seeded' }] });
      setup();
      expect(screen.getByText('describe node/mastercontrol')).toBeTruthy();
      await actAsync(() => {
        void runCommand('kubectl get nodes', 'chip');
      });
      expect(screen.getByText('$ kubectl get nodes')).toBeTruthy();
      expect(screen.getByRole('table', { name: 'kubectl get nodes' })).toBeTruthy();
    });

    it('shows a describe result as the usual details', async () => {
      setup();
      await actAsync(() => {
        void runCommand('kubectl describe pod asktrace', 'chip');
      });
      expect(screen.getByRole('heading', { name: 'askTRACE' })).toBeTruthy();
    });

    it('shows the contact manifest in the sheet, not the terminal echo', async () => {
      setup();
      await actAsync(() => {
        void runCommand('kubectl apply -f contact.yaml', 'chip');
      });
      expect(await screen.findByRole('form', { name: 'Contact manifest' })).toBeTruthy();
      expect(screen.queryByText(/is open in the details panel/)).toBeNull();
    });
  });
});
