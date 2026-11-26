import { expect, test } from '../support/fixtures';

// The CSP (ADR 0004). Every e2e test already fails on a violation (tests/support/fixtures.ts); these
// prove the guard works and that highlighted code renders under the policy.

test.describe('content security policy', () => {
  // Expected to fail: the fixture must turn a blocked inline script into a test failure.
  test.fail('a blocked inline script fails the test', async ({ page }) => {
    await page.goto('plain/');
    await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = 'window.injected = true;';
      document.body.append(script);
    });
    await expect.poll(() => page.evaluate(() => 'injected' in window)).toBe(false);
  });

  test('the policy is the first thing after the charset', async ({ page }) => {
    await page.goto('');
    const [first, second] = await page
      .locator('head > *')
      .evaluateAll((nodes) => nodes.slice(0, 2).map((node) => node.outerHTML));
    expect(first).toBe('<meta charset="utf-8">');
    expect(second).toMatch(/^<meta http-equiv="content-security-policy" content="default-src 'self';/);
    expect(second).not.toContain('unsafe-inline');
  });
});

test.describe('highlighted code under the CSP @dashboard', () => {
  test('colors tokens with classes and no style attributes', async ({ page }) => {
    await page.goto('fixtures/code-block/');
    const block = page.locator('pre.astro-code').first();
    await expect(block).toBeVisible();
    expect(await page.locator('pre.astro-code [style], pre.astro-code[style]').count()).toBe(0);
    const keyword = block.locator('.code-keyword').first();
    const text = block.locator('.code-fg').first();
    const color = (locator: typeof keyword) => locator.evaluate((node) => getComputedStyle(node).color);
    expect(await color(keyword)).not.toBe(await color(text));
    await expect(block.locator('.code-comment')).toHaveText('// Runs a command through the one run path.');
  });
});
