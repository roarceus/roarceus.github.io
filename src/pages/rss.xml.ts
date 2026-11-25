import rss from '@astrojs/rss';

import { site } from '@/config/site';
import { getProfile, getUpdates } from '@/lib/content/queries';
import { productionUrl } from '@/lib/utils/url';

import type { APIRoute } from 'astro';

// Links always point at production, even in a PR preview build (feed readers keep them forever).
export const GET: APIRoute = async () => {
  const [profile, updates] = await Promise.all([getProfile(), getUpdates()]);
  return rss({
    title: `${profile.data.name}: updates`,
    description: `News and milestones from ${profile.data.name}.`,
    site: productionUrl(site.url),
    items: updates.map(({ id, data }) => ({
      title: data.title,
      description: data.summary,
      pubDate: data.date,
      link: productionUrl(site.url, `updates/${id}/`),
      categories: data.tags,
    })),
  });
};
