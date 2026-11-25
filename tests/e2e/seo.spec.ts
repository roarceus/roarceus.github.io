import { expectNoHorizontalOverflow, expectNoSeriousA11yViolations, expectTappable } from '../support/checks';
import { expect, test } from '../support/fixtures';

import type { Page } from '@playwright/test';

const ORIGIN = 'https://roarceus.github.io';
const PAGES = ['', 'plain/', 'updates/', 'projects/asktrace/', 'contact/thanks/'];
// Only reached after sending a message, so it stays out of search (noindex, no canonical).
const NOINDEX = new Set(['contact/thanks/']);

async function meta(page: Page, selector: string): Promise<string | null> {
  return page.locator(selector).first().getAttribute('content');
}

test.describe('page metadata', () => {
  test('every page has its own title and description, a production canonical, and share tags', async ({
    page,
  }) => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const path of PAGES) {
      await page.goto(`./${path}`);
      const title = await page.title();
      const description = await meta(page, 'meta[name="description"]');
      titles.add(title);
      descriptions.add(description ?? '');

      if (NOINDEX.has(path)) {
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
        await expect(page.locator('meta[property="og:url"]')).toHaveCount(0);
      } else {
        const canonical = `${ORIGIN}/${path}`;
        await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
        expect(await meta(page, 'meta[property="og:url"]')).toBe(canonical);
      }
      expect(await meta(page, 'meta[property="og:title"]')).toBe(title);
      expect(await meta(page, 'meta[property="og:description"]')).toBe(description);
      expect(await meta(page, 'meta[property="og:site_name"]')).toBe('Sohan Patil');
      expect(await meta(page, 'meta[property="og:image"]')).toBe(`${ORIGIN}/og-image.png`);
      expect(await meta(page, 'meta[property="og:image:alt"]')).toBeTruthy();
      expect(await meta(page, 'meta[name="twitter:card"]')).toBe('summary_large_image');
    }
    expect(titles.size).toBe(PAGES.length);
    expect(descriptions.size).toBe(PAGES.length);
  });

  test('project and update pages are articles, the rest are websites', async ({ page }) => {
    await page.goto('./projects/asktrace/');
    expect(await meta(page, 'meta[property="og:type"]')).toBe('article');
    await page.goto('./plain/');
    expect(await meta(page, 'meta[property="og:type"]')).toBe('website');
  });

  test('the share image is served', async ({ request }) => {
    const response = await request.get('./og-image.png');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/png');
  });

  for (const path of ['', 'plain/']) {
    test(`describes Sohan as a Person in JSON-LD on /${path}`, async ({ page }) => {
      await page.goto(`./${path}`);
      const raw = await page.locator('script[type="application/ld+json"]').textContent();
      const data = JSON.parse(raw ?? '{}') as Record<string, unknown>;
      expect(data).toMatchObject({ '@type': 'Person', name: 'Sohan Patil', url: `${ORIGIN}/` });
      expect(data.sameAs).toContain('https://github.com/roarceus');
    });
  }

  test('pages without a profile have no JSON-LD', async ({ page }) => {
    await page.goto('./updates/');
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  });
});

test.describe('sitemap and robots.txt', () => {
  test('the sitemap lists every page on production and nothing else', async ({ request }) => {
    const index = await (await request.get('./sitemap-index.xml')).text();
    expect(index).toContain(`${ORIGIN}/sitemap-0.xml`);
    const sitemap = await (await request.get('./sitemap-0.xml')).text();
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    for (const path of ['', 'plain/', 'updates/', 'projects/asktrace/']) {
      expect(locs).toContain(`${ORIGIN}/${path}`);
    }
    expect(locs.length).toBeGreaterThan(20);
    for (const loc of locs) {
      expect(loc?.startsWith(`${ORIGIN}/`)).toBe(true);
      expect(loc).not.toContain('pr-preview');
      expect(loc).not.toContain('contact/thanks');
      expect(loc).not.toContain('404');
    }
  });

  test('robots.txt allows crawling and points at the sitemap', async ({ request }) => {
    const robots = await (await request.get('./robots.txt')).text();
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain(`Sitemap: ${ORIGIN}/sitemap-index.xml`);
  });
});

test.describe('404 page', () => {
  // The browser logs the 404 response for the missing page itself.
  test.use({ expectedConsoleError: /^Failed to load resource: the server responded with a status of 404/ });

  test('shows a kubectl NotFound error for the missing path, with links home', async ({ page }) => {
    const response = await page.goto('./no/such/page/');
    expect(response?.status()).toBe(404);
    await expect(page).toHaveTitle(/Page not found/);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    await expect(main.getByText('$ kubectl get page /no/such/page/')).toBeVisible();
    await expect(
      main.getByText('Error from server (NotFound): page "/no/such/page/" not found'),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    // A canonical here would name /404/, which doesn't exist.
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expectTappable(main, 'Home');
    await expectTappable(main, 'Plain view');
    await expectTappable(main, 'Updates');
  });

  test('wraps a long path without sideways scroll and has no serious a11y issues', async ({ page }) => {
    await page.goto(`./${'a-very-long-missing-segment/'.repeat(8)}`);
    await expect(page.getByText(/Error from server \(NotFound\)/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousA11yViolations(page);
  });

  test('home link goes to the home page', async ({ page }) => {
    await page.goto('./missing/');
    await page.getByRole('main').getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Sohan Patil' })).toBeVisible();
  });
});

test.describe('404 page without JavaScript', () => {
  test.use({
    javaScriptEnabled: false,
    expectedConsoleError: /^Failed to load resource: the server responded with a status of 404/,
  });

  test('still explains the page was not found', async ({ page }) => {
    await page.goto('./missing/');
    await expect(page.getByText('Error from server (NotFound): page "this page" not found')).toBeVisible();
  });
});
