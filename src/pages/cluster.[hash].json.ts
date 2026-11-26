// The terminal's content snapshot (stage-3 design §5.1), served as `cluster.<hash>.json` so new HTML
// never pairs with stale data. Built only with the `clusterDashboard` flag on: production ships no JSON.

import { buildInfo } from '@/config/build-info';
import { isEnabled } from '@/config/features';
import { getSnapshot } from '@/lib/content/queries';

import type { APIRoute, GetStaticPaths } from 'astro';

const build = { version: buildInfo.version, commit: buildInfo.shortCommit };

export const getStaticPaths = (async () => {
  if (!isEnabled('clusterDashboard')) return [];
  const { hash } = await getSnapshot(build);
  return [{ params: { hash } }];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async () => {
  const { snapshot } = await getSnapshot(build);
  return new Response(JSON.stringify(snapshot), { headers: { 'content-type': 'application/json' } });
};
