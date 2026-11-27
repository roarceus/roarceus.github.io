import { expectNoHorizontalOverflow, expectNoSeriousA11yViolations } from '../support/checks';
import { expect, test } from '../support/fixtures';

import type { Page } from '@playwright/test';

// `kubectl apply -f contact.yaml` on the dashboard (ADR 0005): the contact form opens in place, in the
// details panel. Web3Forms is always mocked: tests must never send real messages (SPEC §10 Tests).
// Needs PUBLIC_ENABLED_FLAGS=clusterDashboard (CI's dashboard job).
const ENDPOINT = 'https://api.web3forms.com/submit';
const isMobile = (page: Page): boolean => (page.viewportSize()?.width ?? 1280) < 768;

async function open(page: Page) {
  await page.goto(isMobile(page) ? './#cluster' : './');
  const input = page.getByRole('textbox', { name: 'Command' });
  await expect(input).toBeVisible();
  await input.fill('kubectl apply -f contact.yaml');
  await input.press('Enter');
  const manifest = page.getByRole('form', { name: 'Contact manifest' });
  await expect(manifest).toBeVisible();
  return manifest;
}

test.describe('contact manifest @dashboard', () => {
  test('sends the message from the panel without leaving the page', async ({ page }) => {
    let payload: Record<string, string> = {};
    await page.route(ENDPOINT, async (route) => {
      payload = route.request().postDataJSON() as Record<string, string>;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    });
    const manifest = await open(page);
    await manifest.getByLabel('name:').fill('Ada Lovelace');
    await manifest.getByLabel('email:').fill('ada@example.com');
    await manifest.getByLabel('message:').fill('Hello there, I would like to chat about a role.');
    await manifest.getByRole('button', { name: 'Apply' }).click();

    await expect(manifest.getByRole('status')).toContainText('contactmessage/sohan created');
    await expect(manifest.getByLabel('message:')).toHaveValue('');
    expect(payload).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.com' });
    expect(new URL(page.url()).pathname).toMatch(/\/$/);
  });

  test('shows kubectl validation errors next to the fields', async ({ page }) => {
    const manifest = await open(page);
    await manifest.getByLabel('email:').fill('not-an-email');
    await manifest.getByRole('button', { name: 'Apply' }).click();

    await expect(manifest.getByText('error: validation failed: spec.name: Required value')).toBeVisible();
    await expect(manifest.getByText('error: validation failed: spec.email: Invalid value')).toBeVisible();
    await expect(manifest.getByLabel('name:')).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousA11yViolations(page);
  });

  test('opens from the top bar Contact button in place from 768px', async ({ page }) => {
    test.skip(isMobile(page), 'phones follow the link to the plain view');
    await page.goto('./');
    await expect(page.getByRole('textbox', { name: 'Command' })).toBeVisible();
    await page.getByRole('banner').getByRole('link', { name: 'Contact' }).click();

    await expect(page.getByRole('form', { name: 'Contact manifest' })).toBeVisible();
    expect(new URL(page.url()).pathname).toMatch(/\/$/);
    expect(new URL(page.url()).hash).toBe('');
  });

  test('follows the top bar Contact link to the plain view on phones', async ({ page }) => {
    test.skip(!isMobile(page), 'phone layout only');
    await page.goto('./');
    await page.getByRole('banner').getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL(/\/plain\/#contact$/);
  });
});
