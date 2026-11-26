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
  // On a contrast failure, say what axe measured and what the browser computed for each node, so a
  // CI-only failure can be diagnosed from the log alone.
  const details: string[] = [];
  for (const node of serious.filter((v) => v.id === 'color-contrast').flatMap((v) => v.nodes)) {
    const selector = node.target.join(' ');
    const computed = await page.evaluate((target) => {
      const element = document.querySelector(target);
      if (!element) return 'not found';
      const style = getComputedStyle(element);
      return `color=${style.color} fill=${style.getPropertyValue('-webkit-text-fill-color')}`;
    }, selector);
    details.push(`${selector}: ${node.failureSummary ?? ''} [computed now: ${computed}]`);
  }
  expect(summary, details.join(' | ')).toEqual([]);
}

/**
 * SPEC §4 touch targets are 44 CSS pixels. Browsers report boxes as floats, and Firefox can measure a
 * 2.75rem box as 43.99994px, so the check allows 0.01px of rounding (never a real shortfall).
 */
export const MIN_TARGET = 44 - 0.01;

/** SPEC §4 touch targets: a visible link at least 44 by 44 CSS pixels. */
export async function expectTappable(scope: Page | Locator, name: string): Promise<void> {
  const link = scope.getByRole('link', { name, exact: true });
  await expect(link).toBeVisible();
  const box = await link.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TARGET);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_TARGET);
}
