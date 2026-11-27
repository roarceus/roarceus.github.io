import { describe, expect, it, vi } from 'vitest';

import { contactPayload, sendContact, toSubmitResult } from './submit';

describe('contactPayload', () => {
  it('builds the Web3Forms JSON body', () => {
    expect(
      contactPayload({ name: 'Ada', email: 'ada@example.com', message: 'Hello there!' }, 'public-key'),
    ).toEqual({
      access_key: 'public-key',
      subject: 'New message from your portfolio',
      from_name: 'Ada',
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hello there!',
    });
  });
});

describe('toSubmitResult', () => {
  it('is sent on a 2xx response that reports success', () => {
    expect(toSubmitResult({ status: 200, body: { success: true } })).toBe('sent');
  });

  it('is a server error on a 2xx response that reports failure or has no body', () => {
    expect(toSubmitResult({ status: 200, body: { success: false } })).toBe('server-error');
    expect(toSubmitResult({ status: 200, body: null })).toBe('server-error');
  });

  it('is invalid when the service rejects the content (400, 422)', () => {
    expect(toSubmitResult({ status: 400, body: { success: false } })).toBe('invalid');
    expect(toSubmitResult({ status: 422, body: {} })).toBe('invalid');
  });

  it('is a server error for other 4xx and all 5xx responses', () => {
    for (const status of [401, 403, 429, 500, 503]) {
      expect(toSubmitResult({ status, body: {} })).toBe('server-error');
    }
  });

  it('is offline when the request never got a response', () => {
    expect(toSubmitResult({ error: new TypeError('Failed to fetch') })).toBe('offline');
  });
});

describe('sendContact', () => {
  const payload = { access_key: 'k', name: 'Ada' };

  it('posts JSON and returns the status and body', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"success":true}', { status: 200 }));
    expect(await sendContact('https://api.example.com/submit', payload, fetcher)).toEqual({
      status: 200,
      body: { success: true },
    });
    expect(fetcher).toHaveBeenCalledWith('https://api.example.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('keeps the status when the body is not JSON', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('oops', { status: 502 }));
    expect(await sendContact('https://api.example.com/submit', payload, fetcher)).toEqual({
      status: 502,
      body: null,
    });
  });

  it('returns the error when there is no response', async () => {
    const failure = new TypeError('Failed to fetch');
    const fetcher = vi.fn().mockRejectedValue(failure);
    expect(await sendContact('https://api.example.com/submit', payload, fetcher)).toEqual({ error: failure });
  });
});
