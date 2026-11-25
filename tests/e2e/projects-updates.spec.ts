import { expectNoHorizontalOverflow, expectNoSeriousA11yViolations } from '../support/checks';
import { expect, test } from '../support/fixtures';

import type { Page } from '@playwright/test';

const AI_PUNCTUATION = /[–—·‘’“”…→←]/gu;

async function expectHumanPunctuation(page: Page): Promise<void> {
  const text = await page.locator('body').innerText();
  expect(text.match(AI_PUNCTUATION) ?? []).toEqual([]);
}

async function expectSafeExternalLinks(page: Page): Promise<void> {
  const rels = await page
    .locator('a[href^="https://"]')
    .evaluateAll((links) => links.map((a) => a.getAttribute('rel') ?? ''));
  for (const rel of rels) {
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  }
}

test.describe('project pages', () => {
  test('every project on the plain view links to a working detail page', async ({ page }) => {
    await page.goto('./plain/');
    const details = page.locator('#projects').getByRole('link', { name: /^Details/ });
    const hrefs = await details.evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    expect(hrefs.length).toBe(16);
    for (const href of hrefs) {
      const response = await page.request.get(new URL(href ?? '', page.url()).toString());
      expect(response.status(), href ?? '').toBe(200);
    }
  });

  test('shows status, dates, node, tech, links, and the description', async ({ page }) => {
    await page.goto('./projects/asktrace/');
    await expect(page).toHaveTitle(/askTRACE/);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'askTRACE' })).toBeVisible();
    await expect(main.getByText('Completed')).toBeVisible();
    await expect(main.getByText('Jan 2025 - Apr 2025')).toBeVisible();
    await expect(main.getByText('Built at Northeastern University')).toBeVisible();
    await expect(main.getByRole('list', { name: 'Tech used in askTRACE' })).toContainText('Kafka');
    await expect(main.getByRole('link', { name: /^Demo/ })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=VntctukuTwA',
    );
    await expect(main.getByText('Jenkins CI for the whole system')).toBeVisible();
    await expectSafeExternalLinks(page);
    await expectHumanPunctuation(page);
  });

  test('hides the built-at line for unscheduled projects', async ({ page }) => {
    await page.goto('./projects/roarceus-github-io/');
    await expect(page.getByRole('main').getByText(/^Built at/)).toHaveCount(0);
  });

  test('links back to the projects section', async ({ page }) => {
    await page.goto('./projects/safehaven/');
    await page.getByRole('link', { name: 'All projects' }).click();
    await expect(page).toHaveURL(/\/plain\/#projects$/);
  });

  test('has no horizontal overflow or serious accessibility violations', async ({ page }) => {
    await page.goto('./projects/deployment-gating-bot/');
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe('updates', () => {
  test('lists every update newest first, each linking to its page', async ({ page }) => {
    await page.goto('./updates/');
    await expect(page.getByRole('heading', { level: 1, name: 'Updates' })).toBeVisible();
    const items = page.getByRole('list', { name: 'All updates' }).locator(':scope > li');
    await expect(items).toHaveCount(9);
    const dates = await items
      .locator('time')
      .evaluateAll((times) => times.map((t) => t.getAttribute('datetime') ?? ''));
    expect(dates).toEqual([...dates].sort().reverse());
    await items.first().getByRole('link').click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/updates\/[a-z0-9-]+\/$/);
  });

  test('renders a post with its date, tags, and safe external links', async ({ page }) => {
    await page.goto('./updates/started-leetcode/');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Started my LeetCode practice' })).toBeVisible();
    await expect(main.locator('time')).toHaveAttribute('datetime', '2024-05-01');
    await expect(main.getByRole('link', { name: 'LeetCode' })).toHaveAttribute('rel', 'noopener noreferrer');
    await expectHumanPunctuation(page);
  });

  test('is reachable from the plain view', async ({ page }) => {
    await page.goto('./plain/');
    await page.getByRole('link', { name: 'All updates' }).click();
    await expect(page).toHaveURL(/\/updates\/$/);
  });

  test('has no horizontal overflow or serious accessibility violations', async ({ page }) => {
    await page.goto('./updates/');
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousA11yViolations(page);
  });
});

test.describe('rss feed', () => {
  test('is valid RSS with one item per update and production links only', async ({ page }) => {
    const response = await page.request.get('./rss.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/xml/);
    const xml = await response.text();
    expect(xml).toMatch(/^<\?xml/);
    expect(xml).toContain('<rss');
    expect(xml.match(/<item>/g) ?? []).toHaveLength(9);
    const links = [...xml.matchAll(/<link>([^<]+)<\/link>/g)].map((match) => match[1] ?? '');
    for (const link of links) expect(link).toMatch(/^https:\/\/roarceus\.github\.io\//);
    expect(xml).not.toContain('pr-preview');
  });

  test('is advertised to feed readers on every page', async ({ page }) => {
    await page.goto('./updates/');
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveCount(1);
  });
});
