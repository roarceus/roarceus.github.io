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
    // The other projects sit in a closed expander, so they are in the page but not on screen.
    expect(
      await page
        .getByRole('list', { name: 'More projects', includeHidden: true })
        .locator(':scope > li')
        .count(),
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

// Stage 2: a shorter plain view (design doc §4.7) that keeps every word in the HTML and in print.
test.describe('plain view, shortened', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./plain/');
  });

  test('keeps the section links in view while scrolling', async ({ page }) => {
    await page.evaluate(() => {
      window.scrollTo(0, 2000);
    });
    await expect(page.getByRole('navigation', { name: 'On this page' })).toBeInViewport();
  });

  test('lands a jumped-to heading below the sticky links and marks the link current', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'On this page' });
    const link = nav.getByRole('link', { name: 'Projects', exact: true });
    await link.click();
    await expect(link).toHaveAttribute('aria-current', 'location');
    const heading = await page
      .getByRole('heading', { level: 2, name: 'Projects', exact: true })
      .boundingBox();
    const bar = await nav.boundingBox();
    if ((page.viewportSize()?.width ?? 1280) < 1024) {
      expect(heading?.y ?? 0).toBeGreaterThanOrEqual((bar?.y ?? 0) + (bar?.height ?? 0) - 1);
    } else {
      expect(heading?.y ?? -1).toBeGreaterThanOrEqual(0);
    }
  });

  test('marks the section a direct link lands on', async ({ page }) => {
    await page.goto('./plain/#projects');
    await expect(
      page
        .getByRole('navigation', { name: 'On this page' })
        .getByRole('link', { name: 'Projects', exact: true }),
    ).toHaveAttribute('aria-current', 'location');
  });

  test('moves the current-section mark as the page scrolls', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'On this page' });
    for (const name of ['Skills', 'Updates', 'Projects'] as const) {
      await page.evaluate((id) => {
        const top = document.getElementById(id)?.getBoundingClientRect().top ?? 0;
        window.scrollTo(0, window.scrollY + top);
      }, name.toLowerCase());
      await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'location');
      await expect(nav.locator('[aria-current="location"]')).toHaveCount(1);
    }
  });

  test('shows two highlights per role and folds the rest behind a counted expander', async ({ page }) => {
    const roles = page.locator('#experience article');
    const count = await roles.count();
    expect(count).toBeGreaterThan(0);
    let folded = 0;
    for (let i = 0; i < count; i += 1) {
      const role = roles.nth(i);
      const shown = await role
        .getByRole('list', { name: /^Highlights at / })
        .locator(':scope > li')
        .count();
      const hidden = await role
        .getByRole('list', { name: /^More highlights at /, includeHidden: true })
        .locator(':scope > li')
        .count();
      expect(shown).toBeLessThanOrEqual(2);
      if (hidden === 0) {
        await expect(role.locator('details')).toHaveCount(0);
      } else {
        folded += 1;
        expect(shown).toBe(2);
        await expect(role.locator('summary')).toHaveText(
          `Show ${String(hidden)} more ${hidden === 1 ? 'highlight' : 'highlights'}`,
        );
      }
    }
    expect(folded).toBeGreaterThan(0);
  });

  test('folds the other projects into one counted expander', async ({ page }) => {
    const more = page.locator('#projects details');
    await expect(more).toHaveCount(1);
    const items = await more
      .getByRole('list', { name: 'More projects', includeHidden: true })
      .locator(':scope > li')
      .count();
    expect(items).toBeGreaterThan(0);
    await expect(more.locator('summary')).toHaveText(`Show ${String(items)} more projects`);
  });

  test('opens an expander from the keyboard', async ({ page }) => {
    const more = page.locator('#projects details');
    await more.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(more).toHaveAttribute('open', '');
    await expect(more.getByRole('list', { name: 'More projects' })).toBeVisible();
  });

  test('shows the latest three updates and a link to all of them', async ({ page }) => {
    await expect(page.locator('#updates ol > li')).toHaveCount(3);
    await expect(page.locator('#updates').getByRole('link', { name: 'All updates' })).toBeVisible();
  });

  test('prints every folded item open', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'print rendering of ::details-content is checked in Chromium');
    await page.emulateMedia({ media: 'print' });
    await expect(
      page.locator('#projects details').getByRole('list', { name: 'More projects' }),
    ).toBeVisible();
    await expect(page.locator('#experience details li').first()).toBeVisible();
    await expect(page.locator('#projects details summary')).toBeHidden();
  });
});
