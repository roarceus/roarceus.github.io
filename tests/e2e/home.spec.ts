import { expectNoHorizontalOverflow, expectNoSeriousA11yViolations, expectTappable } from '../support/checks';
import { expect, test } from '../support/fixtures';

const SECTION_IDS = [
  'experience',
  'projects',
  'skills',
  'education',
  'certifications',
  'awards',
  'updates',
  'contact',
];

test.describe('home', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('shows the hero, the build version, and the main actions', async ({ page }) => {
    await expect(page).toHaveTitle(/Sohan Patil/);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { level: 1, name: 'Sohan Patil' })).toBeVisible();
    await expect(main.getByText('I build backend services')).toBeVisible();
    await expect(page.getByTestId('build-version')).toHaveText(/^v\d+\.\d+\.\d+ \(\w+\)$/);
    const actions = page.getByRole('group', { name: 'Main actions' });
    await expectTappable(actions, 'View portfolio');
    await expectTappable(actions, 'Resume');
    await expectTappable(actions, 'Contact');
  });

  test('opens the plain view from View portfolio', async ({ page }) => {
    await page.getByRole('main').getByRole('link', { name: 'View portfolio' }).click();
    await expect(page).toHaveURL(/\/plain\/$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Experience', exact: true })).toBeVisible();
  });

  test('loads the self-hosted fonts', async ({ page }) => {
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family);
    });
    expect(loaded).toEqual(expect.arrayContaining(['Inter Variable', 'JetBrains Mono Variable']));
  });

  test('keeps the cluster dashboard off in production builds (flag off)', async ({ page }) => {
    await expect(page.getByRole('region', { name: 'Cluster map' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Launch cluster' })).toHaveCount(0);
  });

  test('has no horizontal overflow', async ({ page }) => {
    await expectNoHorizontalOverflow(page);
  });

  test('has no serious or critical accessibility violations', async ({ page }) => {
    await expectNoSeriousA11yViolations(page);
  });

  test('ships a strict Content Security Policy', async ({ page }) => {
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
  });
});

test.describe('home without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('still links to every plain view section', async ({ page }) => {
    await page.goto('./');
    const sections = page.getByRole('navigation', { name: 'Portfolio sections' });
    for (const id of SECTION_IDS) {
      await expect(sections.locator(`a[href$="plain/#${id}"]`)).toHaveCount(1);
    }
  });
});
