import { test as base, expect } from '@playwright/test';

/** Fixed clock so date-dependent output is deterministic (SPEC §10 Determinism). */
const FIXED_NOW = new Date('2026-01-15T12:00:00Z');

/**
 * Every e2e test fails on an uncaught exception or a console error (SPEC §10 Tests), including
 * CSP violations, which browsers report as console errors.
 */
export const test = base.extend<{ expectedConsoleErrors: RegExp[]; runtimeErrors: string[] }>({
  /**
   * Console errors a test causes on purpose (e.g. the browser's own "Failed to load resource" when
   * a mocked request fails). Each test opts in with exact patterns; everything else still fails.
   */
  expectedConsoleErrors: [[], { option: true }],
  runtimeErrors: [
    async ({ page, expectedConsoleErrors }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        const text = message.text();
        if (message.type() !== 'error') return;
        if (expectedConsoleErrors.some((pattern) => pattern.test(text))) return;
        errors.push(`console.error: ${text}`);
      });
      await page.clock.setFixedTime(FIXED_NOW);

      await use(errors);

      expect(errors, 'runtime errors during the test').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
