// Generated at build time so the sitemap URL is absolute and always on production (plan D6).
import { site } from '@/config/site';
import { productionUrl } from '@/lib/utils/url';

import type { APIRoute } from 'astro';

export const GET: APIRoute = () =>
  new Response(
    ['User-agent: *', 'Allow: /', '', `Sitemap: ${productionUrl(site.url, 'sitemap-index.xml')}`, ''].join(
      '\n',
    ),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
