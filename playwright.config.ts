import { defineConfig, devices } from '@playwright/test';

const PORT = '4321';
const isCI = Boolean(process.env.CI);

/**
 * Browser and device matrix (SPEC §10 Tests). Project names start with the engine so CI can run
 * one engine per job: `playwright test --project="webkit-*"`.
 */
export default defineConfig({
  testDir: 'tests',
  testMatch: ['e2e/**/*.spec.ts', 'visual/**/*.spec.ts'],
  outputDir: 'test-results',
  snapshotPathTemplate: '{testDir}/visual/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: isCI,
  // Retries only in CI, reported as flaky (SPEC §10: max 2).
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/`,
    trace: 'on-first-retry',
    contextOptions: { reducedMotion: 'reduce' },
  },
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide' },
  },
  webServer: {
    // Serves the built dist/ (run `pnpm build` first; CI downloads the build artifact).
    command: `pnpm exec astro preview --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
  projects: [
    // Desktop
    { name: 'chromium-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'chromium-1920', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
    { name: 'firefox-1280', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } } },
    { name: 'firefox-1920', use: { ...devices['Desktop Firefox'], viewport: { width: 1920, height: 1080 } } },
    { name: 'webkit-1280', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
    { name: 'webkit-1920', use: { ...devices['Desktop Safari'], viewport: { width: 1920, height: 1080 } } },
    // Mobile and tablet
    { name: 'chromium-pixel-7', use: { ...devices['Pixel 7'] } },
    { name: 'webkit-iphone-se-320', use: { ...devices['iPhone SE'] } },
    { name: 'webkit-iphone-se-375', use: { ...devices['iPhone SE (3rd gen)'] } },
    { name: 'webkit-iphone-15', use: { ...devices['iPhone 15'] } },
    { name: 'webkit-iphone-15-landscape', use: { ...devices['iPhone 15 landscape'] } },
    { name: 'webkit-ipad', use: { ...devices['iPad (gen 11)'] } },
  ],
});
