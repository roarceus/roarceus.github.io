import { expectNoHorizontalOverflow, expectNoSeriousA11yViolations, MIN_TARGET } from '../support/checks';
import { expect, test } from '../support/fixtures';

import type { Locator, Page } from '@playwright/test';

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

  test('shows the open to work status next to the name from 768px', async ({ page }) => {
    test.skip(isMobile(page), 'the phone layout shows it in its own header');
    const heading = page.getByRole('heading', { level: 1, name: 'Sohan Patil' });
    await expect(heading).toBeVisible();
    const status = page.locator('.cluster-view').getByText('Open to work', { exact: true });
    await expect(status).toBeVisible();
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
    await expect(terminal.getByText('$ kubectl get experience').filter({ visible: true })).toBeVisible();
    const headers = await terminal.getByRole('columnheader').allTextContents();
    expect(headers.map((h) => h.trim().toUpperCase())).toEqual(['NAME', 'ROLE', 'NODE', 'STATUS', 'AGE']);
    const chips = terminal.getByRole('link', { name: /^(get|top|logs|help)/ });
    expect(await chips.count()).toBeGreaterThanOrEqual(4);
    for (const chip of await chips.all()) {
      const box = await chip.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(MIN_TARGET);
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

// The dashboard is a playground, not a page of text: it uses wide screens up to 120rem (1920px),
// keeps the detail panel a readable fixed column, and lines up with the top bar and status line.
// The terminal's content snapshot (stage-3 design §5.1): content-hashed, preloaded, under the base path.
test('preloads the hashed cluster snapshot @dashboard', async ({ page, request }) => {
  await page.goto('./');
  const link = page.locator('link[rel="preload"][as="fetch"]');
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('crossorigin', 'anonymous');
  const href = await link.evaluate((el) => (el as HTMLLinkElement).href);
  expect(new URL(href).pathname).toMatch(/\/cluster\.[0-9a-f]{10}\.json$/);
  const response = await request.get(href);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/json');
  const snapshot = (await response.json()) as { version: number; nodes: unknown[] };
  expect(snapshot.version).toBe(1);
  expect(snapshot.nodes.length).toBeGreaterThan(0);
});

test.describe('cluster dashboard width @dashboard', () => {
  const box = async (page: Page, selector: string) => {
    const b = await page.locator(selector).first().boundingBox();
    if (!b) throw new Error(`${selector} has no box`);
    return b;
  };

  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ]) {
    test(`fills the screen and lines up with the top bar at ${String(viewport.width)}px`, async ({
      page,
    }) => {
      // Sets its own viewport, so one desktop project per engine is enough.
      test.skip(!test.info().project.name.endsWith('-1280'), 'runs in the 1280px project');
      await page.setViewportSize(viewport);
      await page.goto('./');

      const main = await box(page, 'main#main');
      const inner = Math.min(viewport.width, 1920);
      expect(main.width).toBeGreaterThanOrEqual(inner - 20);
      expect(main.width).toBeLessThanOrEqual(1920);

      const header = await box(page, 'header > div');
      expect(Math.abs(header.x - main.x), 'top bar left edge').toBeLessThanOrEqual(1);
      expect(Math.abs(header.width - main.width), 'top bar width').toBeLessThanOrEqual(1);
      // The footer's content is the dashboard's status line on a one-screen desktop, lined up with
      // the map.
      const status = await box(page, '[data-status-line]');
      const map = await box(page, '[aria-label="Cluster map"]');
      expect(Math.abs(status.x - map.x), 'status line left edge').toBeLessThanOrEqual(1);

      const details = await page.getByRole('region', { name: 'Details' }).boundingBox();
      expect(details?.width ?? 0).toBeLessThanOrEqual(viewport.width >= 1280 ? 26 * 16 + 1 : 20 * 16 + 1);
      await expectNoHorizontalOverflow(page);
    });
  }
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

// The terminal island (stage-3 design §5.4): every run happens in place, through one run path.
test.describe('terminal @dashboard', () => {
  /**
   * Opens the dashboard (cluster mode on phones) and waits for the input to hydrate. `output` is where
   * results show: the terminal, or on phones the bottom sheet (the detail panel island).
   */
  async function open(page: Page) {
    await page.goto(isMobile(page) ? './#cluster' : './');
    const input = page.getByRole('textbox', { name: 'Command' });
    await expect(input).toBeVisible();
    const terminal = page.getByRole('region', { name: 'Terminal' });
    const output = isMobile(page) ? page.getByRole('region', { name: 'Details' }) : terminal;
    return { input, terminal, output };
  }

  async function run(page: Page, command: string) {
    const { input } = await open(page);
    await input.fill(command);
    await input.press('Enter');
  }

  /** Records every navigation of the main frame after the first load. */
  function navigations(page: Page): string[] {
    const urls: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) urls.push(frame.url());
    });
    return urls;
  }

  test('runs typed commands and prints real kubectl output', async ({ page }) => {
    const { input, output } = await open(page);
    await input.fill('kubectl get nodes');
    await input.press('Enter');
    await expect(output.getByRole('table', { name: 'kubectl get nodes' })).toBeVisible();
    await expect(input).toHaveValue('');

    await input.fill('k get pods -n projects');
    await input.press('Enter');
    await expect(output.getByRole('table', { name: 'k get pods -n projects' })).toBeVisible();

    await input.fill('kubectl top skills');
    await input.press('Enter');
    await expect(output.getByRole('table', { name: 'kubectl top skills' })).toBeVisible();

    await input.fill('help');
    await input.press('Enter');
    await expect(output.getByText('$ help').filter({ visible: true })).toBeVisible();
    await expect(output.getByRole('link', { name: 'kubectl get nodes' }).first()).toBeVisible();
  });

  test('runs chips and table names in place without navigating', async ({ page }) => {
    const { input, terminal, output } = await open(page);
    const urls = navigations(page);
    // Phones start with the role in the sheet; the table shows there once a command runs.
    if (isMobile(page)) {
      await input.fill('kubectl get experience');
      await input.press('Enter');
    }
    // A table name first: on the one-screen layout only the latest result stays on screen.
    await output.getByRole('table', { name: 'kubectl get experience' }).getByRole('link').first().click();
    await expect(page.getByRole('region', { name: 'Details' }).getByText(/^describe node\//)).toBeVisible();
    await terminal.getByRole('link', { name: 'top skills' }).click();
    await expect(output.getByText('$ kubectl top skills').filter({ visible: true })).toBeVisible();
    for (const chip of await terminal.getByRole('navigation', { name: 'Commands' }).getByRole('link').all()) {
      await chip.click();
    }
    expect(urls).toEqual([]);
    expect(new URL(page.url()).pathname).toMatch(/\/$/);
  });

  test('suggests the closest command for a typo', async ({ page }) => {
    const { input, output } = await open(page);
    await input.fill('kubectl getx nodes');
    await input.press('Enter');
    await expect(
      output.getByText('Did you mean this?', { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await output.getByRole('link', { name: 'kubectl get nodes' }).filter({ visible: true }).click();
    await expect(output.getByRole('table', { name: 'kubectl get nodes' })).toBeVisible();
  });

  test('clear empties the output', async ({ page }) => {
    await run(page, 'clear');
    const log = page.getByRole('log', { name: 'Terminal output' });
    await expect(log.locator('p')).toHaveCount(0);
  });

  test('has no overflow or serious accessibility issues after running commands', async ({ page }) => {
    const { input, output } = await open(page);
    await input.fill('kubectl get pods -n projects -o wide');
    await input.press('Enter');
    await expect(output.getByRole('table', { name: 'kubectl get pods -n projects -o wide' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousA11yViolations(page);
  });

  test.describe('when the data fails to load', () => {
    // The browser logs the blocked fetch (and the unused preload) itself.
    test.use({ expectedConsoleError: /Failed to load resource|net::ERR_FAILED|NetworkError|preload/i });

    test('shows the error, keeps offline commands working, and recovers with Retry', async ({ page }) => {
      await page.route('**/cluster.*.json', (route) => route.abort());
      const { input, terminal, output } = await open(page);
      await expect(
        terminal.getByText('Unable to connect to the server: failed to load cluster data'),
      ).toBeVisible();
      await input.fill('kubectl version');
      await input.press('Enter');
      await expect(output.getByText(/^Client Version: v[\d.]+$/).filter({ visible: true })).toBeVisible();

      await page.unroute('**/cluster.*.json');
      await terminal.getByRole('button', { name: 'Retry' }).click();
      await expect(terminal.getByRole('button', { name: 'Retry' })).toBeHidden();
      await input.fill('kubectl get nodes');
      await input.press('Enter');
      await expect(output.getByRole('table', { name: 'kubectl get nodes' })).toBeVisible();
    });
  });
});

// The one-screen desktop layout (stage-3 plan, Task 6b): from 1024x700 the dashboard fills the window
// and each part scrolls in its own box; smaller, zoomed, or printed, the page flows as usual.
test.describe('one-screen desktop @dashboard', () => {
  // Sets its own viewports, so one desktop project per engine is enough.
  test.beforeEach(() => {
    test.skip(!test.info().project.name.endsWith('-1280'), 'runs in the 1280px project');
  });

  async function open(page: Page, viewport: { width: number; height: number }) {
    await page.setViewportSize(viewport);
    await page.goto('./');
    const input = page.getByRole('textbox', { name: 'Command' });
    await expect(input).toBeVisible();
    return input;
  }

  const pageScrolls = (page: Page) =>
    page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight);

  /**
   * Tabs from the top of the page and collects the accessible names of the focused elements. Starts
   * on the skip link: Firefox ignores body.focus(), which would leave focus where it was.
   */
  async function tabStops(page: Page): Promise<string[]> {
    const names: string[] = [];
    await page.getByRole('link', { name: 'Skip to content' }).focus();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press('Tab');
      names.push(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? ''));
    }
    return names;
  }

  async function fillOutput(page: Page, input: Locator) {
    for (const command of ['kubectl top skills', 'kubectl get pods -n projects -o wide', 'help']) {
      await input.fill(command);
      await input.press('Enter');
    }
    const log = page.getByRole('log', { name: 'Terminal output' });
    await expect.poll(() => log.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    return log;
  }

  for (const viewport of [
    { width: 1024, height: 700 },
    { width: 1280, height: 800 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ]) {
    test(`fits one screen at ${String(viewport.width)}x${String(viewport.height)}`, async ({ page }) => {
      const input = await open(page, viewport);
      expect(await pageScrolls(page)).toBe(false);
      await expect(page.getByRole('region', { name: 'Cluster map' })).toBeInViewport({ ratio: 1 });
      await expect(input).toBeInViewport({ ratio: 1 });
      await expect(page.locator('[data-status-line]')).toBeInViewport({ ratio: 1 });
      await expect(page.locator('body > footer')).toBeHidden();
      await expectNoHorizontalOverflow(page);
      await expectNoSeriousA11yViolations(page);
    });
  }

  test('reaches every scroll box with Tab and scrolls it with the arrow keys', async ({ page }) => {
    const input = await open(page, { width: 1024, height: 700 });
    await fillOutput(page, input);
    const stops = await tabStops(page);
    // The terminal output and the detail panel page instead; the map scrolls until Stage 4 draws it to fit.
    for (const name of ['Terminal output', 'Details']) expect(stops, `${name} takes focus`).toContain(name);
    for (const name of ['Cluster map']) {
      expect(stops, `${name} takes focus`).toContain(name);
      const box = page.getByRole('region', { name });
      await box.evaluate((el) => {
        el.scrollTop = 0;
      });
      await box.focus();
      await page.keyboard.press('ArrowDown');
      await expect.poll(() => box.evaluate((el) => el.scrollTop), `${name} scrolls`).toBeGreaterThan(0);
    }
    expect(await pageScrolls(page)).toBe(false);
  });

  test('keeps Up and Down in the input for history, never scrolling', async ({ page }) => {
    const input = await open(page, { width: 1280, height: 800 });
    const log = await fillOutput(page, input);
    await log.evaluate((el) => {
      el.scrollTop = 0;
    });
    await input.press('ArrowUp');
    await expect(input).toHaveValue('help');
    await input.press('ArrowDown');
    expect(await log.evaluate((el) => el.scrollTop)).toBe(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  for (const viewport of [
    { width: 1024, height: 700 },
    { width: 1280, height: 800 },
  ]) {
    test(`pages long output instead of scrolling at ${String(viewport.width)}x${String(viewport.height)}`, async ({
      page,
    }) => {
      const input = await open(page, viewport);
      await input.fill('kubectl get experience -o yaml');
      await input.press('Enter');
      const log = page.getByRole('log', { name: 'Terminal output' });
      // Only the latest result, in a box that clips instead of scrolling (ADR 0005).
      const terminal = page.getByRole('region', { name: 'Terminal' });
      await expect(terminal.getByText(/^\$ /).filter({ visible: true })).toHaveCount(1);
      expect(await log.evaluate((el) => getComputedStyle(el).overflowY)).toBe('hidden');
      const more = page.getByText(/^-- more \(1\/\d+\) --$/);
      await expect(more).toBeVisible();
      const pages = Number((/\/(\d+)\)/.exec(await more.innerText()) ?? [])[1]);
      expect(pages).toBeGreaterThan(1);

      await log.hover();
      await page.mouse.wheel(0, 400);
      expect(await log.evaluate((el) => el.scrollTop), 'the wheel never scrolls it').toBe(0);

      await log.focus();
      for (let i = 1; i < pages; i++) await page.keyboard.press('Space');
      await expect(page.getByText(`-- more (${String(pages)}/${String(pages)}) --`)).toBeVisible();
      await terminal.getByRole('button', { name: 'Previous page' }).click();
      await expect(page.getByText(`-- more (${String(pages - 1)}/${String(pages)}) --`)).toBeVisible();
      expect(await pageScrolls(page)).toBe(false);
    });
  }

  test('never cuts a line off: long lines and wide tables wrap', async ({ page }) => {
    const input = await open(page, { width: 1024, height: 700 });
    const log = page.getByRole('log', { name: 'Terminal output' });
    for (const command of ['kubectl get experience -o yaml', 'kubectl get pods -n projects -o wide']) {
      await input.fill(command);
      await input.press('Enter');
      await expect(
        page.getByRole('region', { name: 'Terminal' }).getByText(`$ ${command}`).filter({ visible: true }),
      ).toBeVisible();
      expect(await log.evaluate((el) => el.scrollWidth - el.clientWidth), command).toBeLessThanOrEqual(0);
    }
  });

  // Below the one-screen layout the output is a scroll box that follows new results.
  test('follows new output at the bottom and offers a jump when scrolled up', async ({ page }) => {
    const input = await open(page, { width: 1280, height: 650 });
    const log = await fillOutput(page, input);
    const atBottom = () => log.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight <= 8);
    await expect.poll(atBottom).toBe(true);

    await log.evaluate((el) => {
      el.scrollTop = 0;
    });
    await input.fill('kubectl get nodes');
    await input.press('Enter');
    const jump = page.getByRole('button', { name: 'Jump to latest' });
    await expect(jump).toBeVisible();
    expect(await log.evaluate((el) => el.scrollTop)).toBe(0);
    await jump.click();
    await expect.poll(atBottom).toBe(true);
    await expect(jump).toBeHidden();
  });

  test('collapses the terminal to give the map room, and expands for new output', async ({ page }) => {
    await open(page, { width: 1280, height: 800 });
    const map = page.getByRole('region', { name: 'Cluster map' });
    const before = (await map.boundingBox())?.height ?? 0;
    const terminal = page.getByRole('region', { name: 'Terminal' });
    await terminal.getByRole('button', { name: 'Collapse' }).click();
    await expect(page.getByRole('log', { name: 'Terminal output' })).toBeHidden();
    expect((await map.boundingBox())?.height ?? 0).toBeGreaterThan(before);

    await terminal.getByRole('link', { name: 'top skills' }).click();
    await expect(page.getByRole('log', { name: 'Terminal output' })).toBeVisible();
    await expect(terminal.getByRole('button', { name: 'Collapse' })).toHaveAttribute('aria-expanded', 'true');
  });

  test('sizes terminal tables to their content, not the full width', async ({ page }) => {
    await open(page, { width: 1920, height: 1080 });
    const table = page.getByRole('table', { name: 'kubectl get experience' });
    const log = page.getByRole('log', { name: 'Terminal output' });
    const t = (await table.boundingBox())?.width ?? 0;
    const l = (await log.boundingBox())?.width ?? 0;
    expect(t).toBeLessThan(l * 0.75);
  });

  for (const [label, viewport] of [
    ['below 700px tall', { width: 1280, height: 650 }],
    // 1280x800 at 200% browser zoom has a 640x400 CSS viewport.
    ['at 200% zoom', { width: 640, height: 400 }],
  ] as const) {
    test(`scrolls the page normally ${label}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(viewport.width < 768 ? './#cluster' : './');
      expect(await pageScrolls(page)).toBe(true);
      await expect(page.locator('body > footer')).toBeVisible();
      for (const name of ['Cluster map', 'Details']) {
        const clipped = await page
          .getByRole('region', { name })
          .evaluate((el) => el.scrollHeight > el.clientHeight + 1);
        expect(clipped, `${name} is not clipped`).toBe(false);
      }
      await expectNoHorizontalOverflow(page);
    });
  }

  test('prints in normal flow with the footer', async ({ page }) => {
    await open(page, { width: 1280, height: 800 });
    await page.emulateMedia({ media: 'print' });
    expect(await pageScrolls(page)).toBe(true);
    await expect(page.locator('body > footer')).toBeVisible();
    await expect(page.locator('[data-status-line]')).toBeHidden();
    for (const name of ['Cluster map', 'Details']) {
      const overflow = await page
        .getByRole('region', { name })
        .evaluate((el) => getComputedStyle(el).overflowY);
      expect(overflow, `${name} prints in full`).toBe('visible');
    }
  });
});

// The detail panel island (stage-3 plan, Task 7): it follows describe runs in place, copies links that
// reopen a view, pages instead of scrolling on the one-screen layout, and is the output on phones.
test.describe('detail panel @dashboard', () => {
  async function open(page: Page) {
    await page.goto(isMobile(page) ? './#cluster' : './');
    await expect(page.getByRole('textbox', { name: 'Command' })).toBeVisible();
    return page.getByRole('region', { name: 'Details' });
  }

  test('runs a pod from the panel in place and opens outside links in a new tab', async ({ page }) => {
    test.skip(isMobile(page), 'phones show the role until a command runs (next tests)');
    const details = await open(page);
    const urls: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) urls.push(frame.url());
    });
    const pod = details
      .getByRole('list', { name: /^Pods on / })
      .getByRole('link')
      .first();
    const slug = await pod.innerText();
    // On the one-screen layout the pods may be on a later page: page forward until it can be clicked.
    for (let i = 0; i < 12; i++) {
      try {
        await pod.click({ trial: true, timeout: 500 });
        break;
      } catch {
        await details.getByRole('button', { name: 'Next page' }).click();
      }
    }
    await pod.click();
    await expect(details.getByText(`describe pod/${slug}`)).toBeVisible();
    await expect(
      page
        .getByRole('region', { name: 'Terminal' })
        .getByText(`$ kubectl describe pod ${slug}`)
        .filter({ visible: true }),
    ).toBeVisible();
    for (const link of await details.locator('a[target="_blank"]').all()) {
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(await link.getAttribute('href')).toMatch(/^https:\/\//);
    }
    expect(urls).toEqual([]);
  });

  test('copies a link that reopens the view', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium' || isMobile(page), 'clipboard permissions are Chromium-only');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const details = await open(page);
    await details.getByRole('button', { name: 'Copy link' }).click();
    await expect(details.getByRole('status')).toHaveText('Link copied');
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    const link = new URL(copied);
    expect(link.origin + link.pathname).toBe(new URL(page.url()).origin + new URL(page.url()).pathname);
    expect(link.searchParams.get('run')).toMatch(/^kubectl describe node /);
  });

  test('never scrolls on the one-screen layout: long details page', async ({ page }) => {
    test.skip(!test.info().project.name.endsWith('-1280'), 'runs in the 1280px project');
    await page.setViewportSize({ width: 1024, height: 700 });
    const details = await open(page);
    const box = page.getByTestId('panel-pages');
    expect(await box.evaluate((el) => getComputedStyle(el).overflowY)).toBe('hidden');
    expect(await box.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    await box.hover();
    await page.mouse.wheel(0, 400);
    expect(await box.evaluate((el) => el.scrollTop), 'the wheel never scrolls it').toBe(0);
    const count = details.getByText(/^\d+ \/ \d+$/);
    if ((await count.count()) > 0) {
      const pages = Number((/\/ (\d+)$/.exec(await count.innerText()) ?? [])[1]);
      for (let i = 1; i < pages; i++) await details.getByRole('button', { name: 'Next page' }).click();
      await expect(count).toHaveText(`${String(pages)} / ${String(pages)}`);
    }
    expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(false);
  });

  test('is where output shows on phones', async ({ page }) => {
    test.skip(!isMobile(page), 'phone layout only');
    const details = await open(page);
    await expect(page.getByRole('log', { name: 'Terminal output' })).toBeHidden();
    await expect(details.getByText(/^describe node\//)).toBeVisible();
    await page.getByRole('region', { name: 'Terminal' }).getByRole('link', { name: 'top skills' }).click();
    await expect(details.getByRole('table', { name: 'kubectl top skills' })).toBeVisible();
    // A wide table scrolls inside its own box; the panel itself never overflows sideways.
    expect(await details.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    await expectNoHorizontalOverflow(page);
  });
});
