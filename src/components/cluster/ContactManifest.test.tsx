// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { site } from '@/config/site';

import { ContactManifest } from './ContactManifest';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const field = (name: string) => screen.getByLabelText(`${name}:`, { exact: false });

function fill({ name = 'Ada', email = 'ada@example.com', message = 'Hello there, nice cluster!' } = {}) {
  fireEvent.change(field('name'), { target: { value: name } });
  fireEvent.change(field('email'), { target: { value: email } });
  fireEvent.change(field('message'), { target: { value: message } });
}

async function apply() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Stubs `fetch` with one response (or a network failure) and returns the mock. */
function respond(outcome: { status: number; body: unknown } | 'offline') {
  const fetcher = vi.fn(() =>
    outcome === 'offline'
      ? Promise.reject(new TypeError('Failed to fetch'))
      : Promise.resolve(new Response(JSON.stringify(outcome.body), { status: outcome.status })),
  );
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}

const status = () => screen.getByRole('status');

describe('ContactManifest', () => {
  it('shows the manifest with a labeled input for each spec field', () => {
    render(<ContactManifest email="hello@example.com" />);
    expect(screen.getByRole('form', { name: 'Contact manifest' })).toBeTruthy();
    expect(screen.getByRole('form').textContent).toContain('kind: ContactMessage');
    expect(field('name').tagName).toBe('INPUT');
    expect(field('email').getAttribute('type')).toBe('email');
    expect(field('message').tagName).toBe('TEXTAREA');
  });

  it('shows kubectl validation errors next to the fields and focuses the first', async () => {
    const fetcher = respond({ status: 200, body: { success: true } });
    render(<ContactManifest email="hello@example.com" />);
    fill({ name: '', email: 'not-an-email' });
    await apply();

    expect(screen.getByText('error: validation failed: spec.name: Required value')).toBeTruthy();
    expect(screen.getByText('error: validation failed: spec.email: Invalid value')).toBeTruthy();
    expect(screen.getByText('Please enter a valid email address, like name@example.com.')).toBeTruthy();
    expect(field('email').getAttribute('aria-invalid')).toBe('true');
    expect(field('message').hasAttribute('aria-invalid')).toBe(false);
    expect(document.activeElement).toBe(field('name'));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('sends the Web3Forms payload and reports the message as created', async () => {
    const fetcher = respond({ status: 200, body: { success: true } });
    render(<ContactManifest email="hello@example.com" />);
    fill();
    await apply();

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [endpoint, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe(site.contact.endpoint);
    expect(JSON.parse(init.body as string)).toMatchObject({
      access_key: site.contact.accessKey,
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hello there, nice cluster!',
    });
    expect(status().textContent).toContain('contactmessage/sohan created');
    expect((field('name') as HTMLInputElement).value).toBe('');
  });

  it('keeps the message and offers a retry when offline', async () => {
    respond('offline');
    render(<ContactManifest email="hello@example.com" />);
    fill();
    await apply();

    expect(status().textContent).toContain('Unable to connect to the server');
    expect((field('message') as HTMLTextAreaElement).value).toBe('Hello there, nice cluster!');
    expect(screen.getByRole('button', { name: 'Apply' }).hasAttribute('disabled')).toBe(false);
  });

  it('points to email when the server fails', async () => {
    respond({ status: 500, body: null });
    render(<ContactManifest email="hello@example.com" />);
    fill();
    await apply();

    expect(status().textContent).toContain('Error from server (InternalError)');
    expect(screen.getByRole('link', { name: 'hello@example.com' }).getAttribute('href')).toBe(
      'mailto:hello@example.com',
    );
  });

  it('says when the server rejects the message', async () => {
    respond({ status: 422, body: { success: false } });
    render(<ContactManifest email="hello@example.com" />);
    fill();
    await apply();

    expect(status().textContent).toContain('Error from server (Invalid)');
  });

  it('drops a filled honeypot quietly, without sending', async () => {
    const fetcher = respond({ status: 200, body: { success: true } });
    const { container } = render(<ContactManifest email="hello@example.com" />);
    fill();
    const honeypot = container.querySelector<HTMLInputElement>('input[name="botcheck"]');
    if (!honeypot) throw new Error('no honeypot');
    fireEvent.click(honeypot);
    await apply();

    expect(fetcher).not.toHaveBeenCalled();
    expect(status().textContent).toContain('contactmessage/sohan created');
  });

  it('disables Apply while sending', async () => {
    let finish: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    render(<ContactManifest email="hello@example.com" />);
    fill();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: 'Applying...' }).hasAttribute('disabled')).toBe(true);
    await act(async () => {
      finish(new Response('{"success":true}', { status: 200 }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByRole('button', { name: 'Apply' })).toBeTruthy();
  });
});
