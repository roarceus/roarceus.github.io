import { AxeBuilder } from '@axe-core/playwright';

import { expect, test } from '../support/fixtures';

test.describe('placeholder page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('shows the name and the build version', async ({ page }) => {
    await expect(page).toHaveTitle(/Sohan Patil/);
    await expect(page.getByRole('heading', { level: 1, name: 'Sohan Patil' })).toBeVisible();
    await expect(page.getByTestId('build-version')).toHaveText(/^v\d+\.\d+\.\d+ \(\w+\)$/);
  });

  test('has no horizontal overflow', async ({ page }) => {
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test('loads the self-hosted fonts', async ({ page }) => {
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family);
    });
    expect(loaded).toEqual(expect.arrayContaining(['Inter Variable', 'JetBrains Mono Variable']));
  });

  test('has no serious or critical accessibility violations', async ({ page }) => {
    const { violations } = await new AxeBuilder({ page }).analyze();
    const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('ships a strict Content Security Policy', async ({ page }) => {
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
  });
});
