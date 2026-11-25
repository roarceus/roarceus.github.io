import { AxeBuilder } from '@axe-core/playwright';

import { expect } from './fixtures';

import type { Locator, Page } from '@playwright/test';

/** SPEC §4: no horizontal page scroll at any width. */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

/** SPEC §10: zero serious or critical axe violations. */
export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const summary = serious.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  );
  expect(summary).toEqual([]);
}

/** SPEC §4 touch targets: a visible link at least 44 by 44 CSS pixels. */
export async function expectTappable(scope: Page | Locator, name: string): Promise<void> {
  const link = scope.getByRole('link', { name, exact: true });
  await expect(link).toBeVisible();
  const box = await link.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
}
