import { expectNoHorizontalOverflow, expectNoSeriousA11yViolations, expectTappable } from '../support/checks';
import { expect, test } from '../support/fixtures';

import type { Page } from '@playwright/test';

// SPEC §4: the simple controls never hide behind interaction. Design doc §4.5.
const PAGES = [
  { path: './', view: 'Plain view', viewHref: /\/plain\/$/ },
  { path: 'plain/', view: 'Home', viewHref: /\/$/ },
  { path: 'projects/asktrace/', view: 'Plain view', viewHref: /\/plain\/$/ },
  { path: 'updates/', view: 'Plain view', viewHref: /\/plain\/$/ },
];

const width = (page: Page): number => page.viewportSize()?.width ?? 1280;
const isNarrow = (page: Page): boolean => width(page) < 640;

for (const { path, view, viewHref } of PAGES) {
  test.describe(`top bar on ${path}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('links home with the cluster name', async ({ page }) => {
      const home = page.getByRole('banner').getByRole('link').first();
      await expect(home).toHaveAccessibleName(isNarrow(page) ? 'sohan' : 'sohan-cluster');
      expect(await home.getAttribute('href')).toMatch(/\/$/);
      const box = await home.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    });

    test('keeps the view switch, Resume, and Contact visible and tappable', async ({ page }) => {
      const nav = page.getByRole('banner').getByRole('navigation', { name: 'Site' });
      await expectTappable(nav, view);
      await expectTappable(nav, 'Resume');
      await expectTappable(nav, 'Contact');
      expect(await nav.getByRole('link', { name: view, exact: true }).getAttribute('href')).toMatch(viewHref);
      expect(await nav.getByRole('link', { name: 'Contact', exact: true }).getAttribute('href')).toMatch(
        /\/plain\/#contact$/,
      );
    });

    test('shows cluster status and version from 768px up', async ({ page }) => {
      const banner = page.getByRole('banner');
      const ready = banner.getByText('Ready', { exact: true });
      const version = banner.getByText(/^v\d+\.\d+\.\d+/);
      if (width(page) < 768) {
        await expect(ready).toBeHidden();
        await expect(version).toBeHidden();
      } else {
        await expect(ready).toBeVisible();
        await expect(version).toBeVisible();
      }
    });

    test('fits on one row', async ({ page }) => {
      await page.evaluate(() => document.fonts.ready);
      const nav = await page.getByRole('navigation', { name: 'Site' }).boundingBox();
      const home = await page.getByRole('banner').getByRole('link').first().boundingBox();
      expect(nav?.y ?? 0).toBeLessThan((home?.y ?? 0) + (home?.height ?? 0));
    });

    test('has no horizontal overflow', async ({ page }) => {
      await expectNoHorizontalOverflow(page);
      const banner = await page.getByRole('banner').boundingBox();
      expect((banner?.x ?? 0) + (banner?.width ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.width ?? 0);
    });

    test('is hidden in print', async ({ page }) => {
      await page.emulateMedia({ media: 'print' });
      await expect(page.getByRole('banner')).toBeHidden();
    });
  });
}

test('keeps the skip link first and the top bar accessible', async ({ page }) => {
  await page.goto('./');
  // WebKit skips links on Tab by default (a Safari setting), so check document order instead.
  const first = await page.evaluate(() =>
    document.querySelector('a[href], button, input, select, textarea, summary')?.textContent.trim(),
  );
  expect(first).toBe('Skip to content');
  await expectNoSeriousA11yViolations(page);
});
