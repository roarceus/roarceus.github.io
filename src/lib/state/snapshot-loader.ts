import { map } from 'nanostores';

import type { ClusterSnapshot } from '@/lib/content/snapshot';

/**
 * Loads `cluster.<hash>.json` in the browser (design doc stage-3 §5.1). No runtime Zod (too heavy): the
 * build validated the content, so this checks the version and the shape commands rely on. A failure
 * leaves `status: 'error'`; calling again is the retry.
 */

type SnapshotState =
  { status: 'idle' | 'loading' | 'error'; data?: undefined } | { status: 'ready'; data: ClusterSnapshot };

export const $snapshot = map<SnapshotState>({ status: 'idle' });

/** Typed against the snapshot, so bumping SNAPSHOT_VERSION fails typecheck here until this follows. */
const VERSION: ClusterSnapshot['version'] = 1;
const LISTS = [
  'nodes',
  'unscheduled',
  'experience',
  'projects',
  'skills',
  'certifications',
  'achievements',
  'updates',
] as const satisfies readonly (keyof ClusterSnapshot)[];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function isSnapshot(value: unknown): value is ClusterSnapshot {
  return (
    isObject(value) &&
    value.version === VERSION &&
    isObject(value.build) &&
    isObject(value.profile) &&
    LISTS.every((key) => Array.isArray(value[key]))
  );
}

let pending: Promise<void> | undefined;

/** Resolves once a load in progress has finished (at once when none is). */
export const snapshotSettled = (): Promise<void> => pending ?? Promise.resolve();

async function load(href: string, fetcher: typeof fetch): Promise<void> {
  try {
    const response = await fetcher(href);
    const data: unknown = response.ok ? await response.json() : undefined;
    $snapshot.set(isSnapshot(data) ? { status: 'ready', data } : { status: 'error' });
  } catch {
    $snapshot.set({ status: 'error' });
  }
}

export function loadSnapshot(href: string, fetcher: typeof fetch = fetch): Promise<void> {
  $snapshot.set({ status: 'loading' });
  const current = load(href, fetcher).finally(() => {
    if (pending === current) pending = undefined;
  });
  pending = current;
  return current;
}
