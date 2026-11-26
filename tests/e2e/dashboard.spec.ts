import { expectNoHorizontalOverflow, expectNoSeriousA11yViolations } from '../support/checks';
import { expect, test } from '../support/fixtures';

import type { Page } from '@playwright/test';

// The cluster dashboard shell on `/` (design doc §4.6). Runs only against a build with
// PUBLIC_ENABLED_FLAGS=clusterDashboard (CI's dashboard job); the default e2e run skips @dashboard.
const width = (page: Page): number => page.viewportSize()?.width ?? 1280;
const isMobile = (page: Page): boolean => width(page) < 768;

test.describe('cluster dashboard @dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('shows the stage, details, and terminal from 768px', async ({ page }) => {
    test.skip(isMobile(page), 'phones get the plain layout first');
    const stage = page.getByRole('region', { name: 'Cluster map' });
    const details = page.getByRole('region', { name: 'Details' });
    const terminal = page.getByRole('region', { name: 'Terminal' });
    await expect(stage).toBeVisible();
    await expect(details).toBeVisible();
    await expect(terminal).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Sohan Patil' })).toBeVisible();

    const s = await stage.boundingBox();
    const d = await details.boundingBox();
    if (width(page) >= 1024) {
      // Side by side.
      expect(d?.x ?? 0).toBeGreaterThanOrEqual((s?.x ?? 0) + (s?.width ?? 0) - 1);
    } else {
      // Stacked.
      expect(d?.y ?? 0).toBeGreaterThanOrEqual((s?.y ?? 0) + (s?.height ?? 0) - 1);
    }
  });

  test('draws the nodes from content and counts them in the header', async ({ page }) => {
    test.skip(isMobile(page), 'covered by the cluster mode test');
    const stage = page.getByRole('region', { name: 'Cluster map' });
    const count = await stage.locator('[data-node]').count();
    expect(count).toBeGreaterThan(0);
    await expect(stage.getByText(`${String(count)}/${String(count)} nodes ready`)).toBeVisible();
    await expect(stage.locator('[data-node="mastercontrol"]')).toHaveAttribute('aria-current', 'true');
    await expect(stage.getByText('unscheduled', { exact: true })).toBeVisible();
  });

  test('opens the details on the most recent work role', async ({ page }) => {
    test.skip(isMobile(page), 'covered by the cluster mode test');
    const details = page.getByRole('region', { name: 'Details' });
    await expect(details.getByText('describe node/mastercontrol')).toBeVisible();
    await expect(details.getByRole('heading', { name: /MasterControl/ })).toBeVisible();
  });

  test('prints kubectl get experience in the terminal with clickable chips', async ({ page }) => {
    test.skip(isMobile(page), 'phones show only the chips');
    const terminal = page.getByRole('region', { name: 'Terminal' });
    await expect(terminal.getByText('$ kubectl get experience')).toBeVisible();
    const headers = await terminal.getByRole('columnheader').allTextContents();
    expect(headers.map((h) => h.trim().toUpperCase())).toEqual(['NAME', 'ROLE', 'NODE', 'STATUS', 'AGE']);
    const chips = terminal.getByRole('link', { name: /^(get|top|logs|help)/ });
    expect(await chips.count()).toBeGreaterThanOrEqual(4);
    for (const chip of await chips.all()) {
      const box = await chip.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('keeps the stage footprint fixed while the page settles', async ({ page }) => {
    test.skip(isMobile(page), 'the stage is hidden until cluster mode on phones');
    const stage = page.getByRole('region', { name: 'Cluster map' });
    const before = await stage.boundingBox();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    expect(await stage.boundingBox()).toEqual(before);
  });

  test('launches and leaves cluster mode on phones', async ({ page }) => {
    test.skip(!isMobile(page), 'cluster mode is the phone layout');
    await expect(page.getByRole('region', { name: 'Cluster map' })).toBeHidden();
    await page.getByRole('link', { name: 'Launch cluster' }).click();
    await expect(page).toHaveURL(/#cluster$/);
    const stage = page.getByRole('region', { name: 'Cluster map' });
    await expect(stage).toBeVisible();
    await expect(stage.getByRole('heading', { level: 2 })).toBeFocused();
    await expect(page.getByRole('region', { name: 'Details' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.goBack();
    await expect(page.getByRole('region', { name: 'Cluster map' })).toBeHidden();
    await page.getByRole('link', { name: 'Launch cluster' }).click();
    await page.getByRole('link', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Cluster map' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Launch cluster' })).toBeVisible();
  });

  test('lists the roles on the map as cards on phones', async ({ page }) => {
    test.skip(!isMobile(page), 'phone layout only');
    const cards = page.getByRole('list', { name: 'Experience' }).getByRole('listitem');
    expect(await cards.count()).toBeGreaterThan(0);
    await expect(page.getByRole('list', { name: 'Experience' })).toContainText('MasterControl');
    await expect(page.getByRole('link', { name: 'Full portfolio' })).toBeVisible();
  });

  test('switches to the cluster view from the plain view', async ({ page }) => {
    await page.goto('./plain/');
    const link = page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Cluster view' });
    await expect(link).toBeVisible();
    expect(await link.getAttribute('href')).toMatch(/\/$/);
  });

  test('has no horizontal overflow or serious accessibility issues', async ({ page }) => {
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe('cluster dashboard without JavaScript @dashboard', () => {
  test.use({ javaScriptEnabled: false });

  test('opens cluster mode from the link on phones', async ({ page }) => {
    test.skip(!isMobile(page), 'phone layout only');
    await page.goto('./');
    await page.getByRole('link', { name: 'Launch cluster' }).click();
    await expect(page.getByRole('region', { name: 'Cluster map' })).toBeVisible();
  });
});
