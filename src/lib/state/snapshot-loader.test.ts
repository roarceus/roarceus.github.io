import { beforeEach, describe, expect, it } from 'vitest';

import { SNAPSHOT } from '@/lib/commands/fixtures';

import { $snapshot, loadSnapshot } from './snapshot-loader';

const respond =
  (body: unknown, status = 200) =>
  () =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  $snapshot.set({ status: 'idle' });
});

describe('loadSnapshot', () => {
  it('stores the snapshot when the fetch succeeds', async () => {
    const urls: string[] = [];
    await loadSnapshot('/pr-preview/pr-9/cluster.abc.json', (input) => {
      urls.push(input instanceof Request ? input.url : input.toString());
      return respond(SNAPSHOT)();
    });
    expect(urls).toEqual(['/pr-preview/pr-9/cluster.abc.json']);
    expect($snapshot.get()).toEqual({ status: 'ready', data: SNAPSHOT });
  });

  it('is loading while the fetch is in flight', () => {
    void loadSnapshot('/cluster.abc.json', () => new Promise<Response>(() => undefined));
    expect($snapshot.get().status).toBe('loading');
  });

  it.each([
    ['a rejected fetch', () => Promise.reject(new Error('offline'))],
    ['a 404', respond({}, 404)],
    ['another version', respond({ ...SNAPSHOT, version: 2 })],
    ['a missing list', respond({ ...SNAPSHOT, projects: undefined })],
    ['invalid JSON', () => Promise.resolve(new Response('<html>'))],
    ['null', respond(null)],
  ])('fails on %s', async (_, fetcher) => {
    await loadSnapshot('/cluster.abc.json', fetcher);
    expect($snapshot.get()).toEqual({ status: 'error' });
  });

  it('retries by being called again', async () => {
    await loadSnapshot('/cluster.abc.json', () => Promise.reject(new Error('offline')));
    expect($snapshot.get().status).toBe('error');
    await loadSnapshot('/cluster.abc.json', respond(SNAPSHOT));
    expect($snapshot.get().status).toBe('ready');
  });
});
