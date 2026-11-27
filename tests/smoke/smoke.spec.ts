import { expect, test } from '../support/fixtures';

/**
 * Runs against a deployed site (playwright.smoke.config.ts). Optional expectations:
 * SMOKE_EXPECT_COMMIT (short or full SHA) and SMOKE_EXPECT_VERSION (e.g. 0.1.0) make the first
 * test wait until GitHub Pages serves that exact build, so we never pass on a stale deploy.
 */
if (!process.env.SMOKE_BASE_URL?.endsWith('/')) {
  throw new Error('Set SMOKE_BASE_URL to the deployed site URL, ending with "/".');
}

const expectCommit = process.env.SMOKE_EXPECT_COMMIT?.slice(0, 7);
const expectVersion = process.env.SMOKE_EXPECT_VERSION?.replace(/^v/, '');

test.describe.configure({ mode: 'serial' });

test('serves the expected build', async ({ page }) => {
  // Fresh query string each try so the Pages CDN cache can't hand us an old copy.
  await expect
    .poll(
      async () => {
        const response = await page.goto(`./?smoke=${Date.now().toString()}`);
        if (!response?.ok()) return `HTTP ${String(response?.status())}`;
        return (await page.getByTestId('build-version').textContent()) ?? '';
      },
      { timeout: 10 * 60_000, intervals: [5_000, 10_000, 15_000] },
    )
    .toMatch(
      new RegExp(
        String.raw`^v${expectVersion ?? String.raw`\d+\.\d+\.\d+`} \(${expectCommit ?? String.raw`\w+`}\)$`,
      ),
    );
});

test('home page renders', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1, name: 'Sohan Patil' })).toBeVisible();
});

// SMOKE_EXPECT_DASHBOARD: 'false' for releases (the flag must stay off in production), 'true' for
// PR previews (built with the flag). Unset: not checked.
const expectDashboard = process.env.SMOKE_EXPECT_DASHBOARD;
test('ships the cluster dashboard only where its flag is on', async ({ page }) => {
  test.skip(expectDashboard === undefined, 'SMOKE_EXPECT_DASHBOARD not set');
  await page.goto('./');
  // Whether it was built, not whether it is on screen: phones keep it hidden until cluster mode.
  await expect(page.getByRole('region', { name: 'Cluster map', includeHidden: true })).toHaveCount(
    expectDashboard === 'true' ? 1 : 0,
  );
});

// ?run= deep links (stage-3 plan, Task 7b): a preview opens the pod (which also proves the cluster
// data loads under the preview base path); production, with the dashboard off, ignores it.
test('opens a ?run= deep link only where the dashboard is on', async ({ page }) => {
  test.skip(expectDashboard === undefined, 'SMOKE_EXPECT_DASHBOARD not set');
  await page.goto('./?run=kubectl+describe+pod+asktrace');
  if (expectDashboard === 'true') {
    await expect(
      page.getByRole('region', { name: 'Details' }).getByText('describe pod/asktrace'),
    ).toBeVisible();
    return;
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Sohan Patil' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Cluster map', includeHidden: true })).toHaveCount(0);
});

test('every asset resolves under the base path', async ({ page, request, baseURL }) => {
  await page.goto('./');
  const base = new URL(baseURL ?? '');
  // The canonical link names the production page on purpose (also on previews), so it isn't an asset.
  const urls = await page
    .locator('link[href]:not([rel="canonical"]), script[src], img[src]')
    .evaluateAll((elements) =>
      elements.map((el) => (el as HTMLLinkElement).href || (el as HTMLScriptElement | HTMLImageElement).src),
    );
  const sameOrigin = urls.map((u) => new URL(u)).filter((u) => u.origin === base.origin);
  expect(sameOrigin.length).toBeGreaterThan(0);

  for (const asset of sameOrigin) {
    expect(asset.pathname, `${asset.href} is outside the base path`).toMatch(new RegExp(`^${base.pathname}`));
    const response = await request.get(asset.href);
    expect(response.status(), asset.href).toBe(200);
  }
});
