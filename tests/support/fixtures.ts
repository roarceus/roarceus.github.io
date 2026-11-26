import { test as base, expect } from '@playwright/test';

/** Fixed clock so date-dependent output is deterministic (SPEC §10 Determinism). */
const FIXED_NOW = new Date('2026-01-15T12:00:00Z');

/** CSP console messages differ by engine; none of them is ever expected. */
const CSP_CONSOLE = /Content[- ]Security[- ]Policy|Refused to (?:execute|load|apply|run)/i;

/**
 * Every e2e test fails on an uncaught exception or a console error (SPEC §10 Tests). CSP violations
 * fail it too (ADR 0004): a `securitypolicyviolation` listener on every page reports each one, since
 * not every engine logs them to the console, and a CSP console error is never excused by
 * `expectedConsoleError`.
 */
export const test = base.extend<{ expectedConsoleError: RegExp | null; runtimeErrors: string[] }>({
  /**
   * Console errors a test causes on purpose (e.g. the browser's own "Failed to load resource" when
   * a mocked request fails). Each test opts in with exact patterns; everything else still fails.
   */
  // One RegExp (use alternation for several): test.use() would read a two-item array as
  // [value, options].
  expectedConsoleError: [null, { option: true }],
  runtimeErrors: [
    async ({ page, expectedConsoleError }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
      page.on('console', (message) => {
        const text = message.text();
        if (message.type() !== 'error') return;
        if (expectedConsoleError?.test(text) && !CSP_CONSOLE.test(text)) return;
        errors.push(`console.error: ${text}`);
      });
      await page.exposeFunction('__reportCspViolation', (violation: string) => {
        errors.push(`CSP violation: ${violation}`);
      });
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          const report = (window as unknown as { __reportCspViolation: (v: string) => void })
            .__reportCspViolation;
          report(
            `${event.effectiveDirective} blocked ${event.blockedURI || 'inline'} at ${event.sourceFile}:${String(event.lineNumber)}`,
          );
        });
      });
      await page.clock.setFixedTime(FIXED_NOW);

      await use(errors);

      expect(errors, 'runtime errors during the test').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
