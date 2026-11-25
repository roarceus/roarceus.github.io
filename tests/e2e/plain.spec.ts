import { expectNoHorizontalOverflow, expectNoSeriousA11yViolations, expectTappable } from '../support/checks';
import { expect, test } from '../support/fixtures';

const SECTIONS = [
  'Experience',
  'Projects',
  'Skills',
  'Education',
  'Certifications',
  'Awards',
  'Updates',
  'Contact',
] as const;

test.describe('plain view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./plain/');
  });

  test('introduces Sohan with title, location, and links', async ({ page }) => {
    await expect(page).toHaveTitle(/Sohan Patil/);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Sohan Patil' })).toBeVisible();
    await expect(main.getByText('San Francisco Bay Area', { exact: true })).toBeVisible();
    await expect(main.getByText('Open to work')).toBeVisible();
    await expect(main.getByRole('link', { name: 'GitHub', exact: true }).first()).toHaveAttribute(
      'href',
      'https://github.com/roarceus',
    );
  });

  test('has a section and an on-this-page link for every part of the portfolio', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'On this page' });
    for (const name of SECTIONS) {
      const id = name.toLowerCase();
      await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeAttached();
      await expect(page.locator(`section#${id}`)).toHaveCount(1);
      await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('href', `#${id}`);
    }
  });

  test('jumps to a section from the on-this-page links', async ({ page }) => {
    await page
      .getByRole('navigation', { name: 'On this page' })
      .getByRole('link', { name: 'Projects', exact: true })
      .click();
    await expect(page).toHaveURL(/#projects$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Projects', exact: true })).toBeInViewport();
  });

  test('lists roles newest first with plain date ranges and metrics', async ({ page }) => {
    const roles = page.locator('#experience article');
    await expect(roles.first()).toContainText('Northeastern University');
    const mastercontrol = roles.filter({ hasText: 'MasterControl' });
    await expect(mastercontrol).toContainText('Jun 2025 - Dec 2025');
    await expect(mastercontrol).toContainText('60+ repos');
  });

  test('shows featured projects with their status as text', async ({ page }) => {
    const featured = page.getByRole('list', { name: 'Featured projects' }).locator(':scope > li');
    await expect(featured).toHaveCount(3);
    await expect(featured.first()).toContainText('askTRACE');
    await expect(featured.first()).toContainText('Completed');
    expect(
      await page.getByRole('list', { name: 'More projects' }).locator(':scope > li').count(),
    ).toBeGreaterThan(0);
  });

  test('shows both certifications as in progress', async ({ page }) => {
    await expect(page.locator('#certifications').getByText('In progress')).toHaveCount(2);
  });

  test('marks external links noopener noreferrer', async ({ page }) => {
    const rels = await page
      .locator('a[href^="https://"]')
      .evaluateAll((links) => links.map((a) => a.getAttribute('rel') ?? ''));
    expect(rels.length).toBeGreaterThan(0);
    for (const rel of rels) {
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
    }
  });

  test('links a resume that serves a PDF', async ({ page }) => {
    const href = await page
      .getByRole('banner')
      .getByRole('link', { name: 'Resume', exact: true })
      .getAttribute('href');
    expect(href).toBeTruthy();
    const response = await page.request.get(new URL(href ?? '', page.url()).toString());
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
  });

  test('keeps header controls visible and tappable', async ({ page }) => {
    const header = page.getByRole('banner');
    await expectTappable(header, 'Resume');
    await expectTappable(header, 'Contact');
  });

  test('never shows a content placeholder', async ({ page }) => {
    await expect(page.getByText('TODO(sohan)')).toHaveCount(0);
  });

  test('renders copy without AI-style punctuation', async ({ page }) => {
    // Markdown "smart" typography would turn ' and -- into curly quotes and dashes.
    const text = await page.locator('body').innerText();
    expect(text.match(/[–—·‘’“”…→]/gu) ?? []).toEqual([]);
  });

  test('has no horizontal overflow', async ({ page }) => {
    await expectNoHorizontalOverflow(page);
  });

  test('has no serious or critical accessibility violations', async ({ page }) => {
    await expectNoSeriousA11yViolations(page);
  });

  test('prints without the header and on-this-page navigation', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('banner')).toBeHidden();
    await expect(page.getByRole('navigation', { name: 'On this page' })).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'Sohan Patil' })).toBeVisible();
  });
});
