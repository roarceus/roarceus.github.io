import { test as base, expect } from '@playwright/test';

/** Fixed clock so date-dependent output is deterministic (SPEC §10 Determinism). */
const FIXED_NOW = new Date('2026-01-15T12:00:00Z');

/**
 * Every e2e test fails on an uncaught exception or a console error (SPEC §10 Tests), including
 * CSP violations, which browsers report as console errors.
 */
export const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
      });
      await page.clock.setFixedTime(FIXED_NOW);

      await use(errors);

      expect(errors, 'runtime errors during the test').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
