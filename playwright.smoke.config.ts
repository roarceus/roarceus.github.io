import { defineConfig, devices } from '@playwright/test';

/**
 * Post-deploy smoke tests against a live URL (SPEC §10 Tests): a PR preview or production.
 * SMOKE_BASE_URL must end with "/" (e.g. https://roarceus.github.io/pr-preview/pr-12/).
 */
// Validated in tests/smoke/smoke.spec.ts (tools like knip load this file without the variable).
const baseURL = process.env.SMOKE_BASE_URL;

export default defineConfig({
  testDir: 'tests/smoke',
  outputDir: 'test-results/smoke',
  forbidOnly: Boolean(process.env.CI),
  retries: 1,
  // GitHub Pages can take a few minutes to publish a push; the first test waits for it.
  timeout: 12 * 60_000,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: { baseURL, contextOptions: { reducedMotion: 'reduce' } },
  projects: [
    { name: 'smoke-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'smoke-mobile', use: { ...devices['Pixel 7'] } },
  ],
});
