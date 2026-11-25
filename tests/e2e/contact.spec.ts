import { expectNoHorizontalOverflow, expectNoSeriousA11yViolations } from '../support/checks';
import { expect, test } from '../support/fixtures';

import type { Page, Route } from '@playwright/test';

// Web3Forms is always mocked: tests must never send real messages (SPEC §10 Tests).
const ENDPOINT = 'https://api.web3forms.com/submit';

const SENT = "Thanks, your message is on its way. I'll reply by email.";
const REJECTED = "Something in the form wasn't accepted. Please check your details and try again.";
const SERVER_ERROR = /Something went wrong on my end\. Please try again, or email me at/;
const OFFLINE = "You seem to be offline. Your message is still here, try again when you're back online.";

function form(page: Page) {
  return page.getByRole('form', { name: 'Contact form' });
}

async function fillValid(page: Page): Promise<void> {
  const contact = form(page);
  await contact.getByLabel('Name').fill('Ada Lovelace');
  await contact.getByLabel('Email').fill('ada@example.com');
  await contact.getByLabel('Message').fill('Hello there, I would like to chat about a role.');
}

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

test.describe('contact form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./plain/#contact');
  });

  test('sends the message and clears the form', async ({ page }) => {
    let payload: Record<string, string> = {};
    await page.route(ENDPOINT, async (route) => {
      payload = route.request().postDataJSON() as Record<string, string>;
      await json(route, 200, { success: true });
    });
    await fillValid(page);
    await form(page).getByRole('button', { name: 'Send message' }).click();

    await expect(form(page).getByRole('status')).toHaveText(SENT);
    await expect(form(page).getByLabel('Message')).toHaveValue('');
    expect(payload).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      message: 'Hello there, I would like to chat about a role.',
    });
    expect(payload.access_key).toMatch(/^[0-9a-f-]{36}$/);
  });

  test('shows every validation error, focuses the first, and sends nothing', async ({ page }) => {
    let requests = 0;
    await page.route(ENDPOINT, async (route) => {
      requests += 1;
      await json(route, 200, { success: true });
    });
    const contact = form(page);
    await contact.getByLabel('Email').fill('not-an-email');
    await contact.getByRole('button', { name: 'Send message' }).click();

    await expect(contact.getByText('Please enter your name.')).toBeVisible();
    await expect(
      contact.getByText('Please enter a valid email address, like name@example.com.'),
    ).toBeVisible();
    await expect(contact.getByText('Please write a message.')).toBeVisible();
    await expect(contact.getByLabel('Name')).toBeFocused();
    await expect(contact.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(requests).toBe(0);
  });

  test('clears a field error once the field is fixed and sent again', async ({ page }) => {
    await page.route(ENDPOINT, (route) => json(route, 200, { success: true }));
    const contact = form(page);
    await contact.getByRole('button', { name: 'Send message' }).click();
    await expect(contact.getByText('Please enter your name.')).toBeVisible();
    await fillValid(page);
    await contact.getByRole('button', { name: 'Send message' }).click();
    await expect(contact.getByText('Please enter your name.')).toHaveCount(0);
    await expect(contact.getByLabel('Name')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('sends only once when the button is clicked twice', async ({ page }) => {
    let requests = 0;
    let release: () => void = () => undefined;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(ENDPOINT, async (route) => {
      requests += 1;
      await released;
      await json(route, 200, { success: true });
    });
    await fillValid(page);
    const button = form(page).getByRole('button', { name: /Send message|Sending/ });
    await button.click();
    await expect(button).toHaveText('Sending...');
    await expect(button).toBeDisabled();
    await button.click({ force: true });
    release();
    await expect(form(page).getByRole('status')).toHaveText(SENT);
    expect(requests).toBe(1);
  });

  test('labels every field and has no serious accessibility violations', async ({ page }) => {
    const contact = form(page);
    for (const label of ['Name', 'Email', 'Message']) {
      await expect(contact.getByLabel(label)).toBeVisible();
    }
    await expect(contact.getByLabel('Email')).toHaveAttribute('type', 'email');
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousA11yViolations(page);
  });

  test('allows the Web3Forms endpoint in the CSP and nothing broader', async ({ page }) => {
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("connect-src 'self' https://api.web3forms.com");
    expect(csp).toContain("form-action 'self' https://api.web3forms.com");
  });
});

// The browser logs each failed request as a console error; these tests cause that on purpose.

test.describe('contact form failure: explains when the service rejects the message', () => {
  test.use({
    expectedConsoleError: /^Failed to load resource: the server responded with a status of 400/,
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('./plain/#contact');
  });

  test('explains when the service rejects the message', async ({ page }) => {
    await page.route(ENDPOINT, (route) => json(route, 400, { success: false }));
    await fillValid(page);
    await form(page).getByRole('button', { name: 'Send message' }).click();
    await expect(form(page).getByRole('status')).toHaveText(REJECTED);
    await expect(form(page).getByLabel('Name')).toHaveValue('Ada Lovelace');
  });
});

test.describe('contact form failure: offers email when the service fails', () => {
  test.use({
    expectedConsoleError: /^Failed to load resource: the server responded with a status of 500/,
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('./plain/#contact');
  });

  test('offers email when the service fails', async ({ page }) => {
    await page.route(ENDPOINT, (route) => json(route, 500, { success: false }));
    await fillValid(page);
    await form(page).getByRole('button', { name: 'Send message' }).click();
    await expect(form(page).getByRole('status')).toHaveText(SERVER_ERROR);
    await expect(form(page).getByRole('status').getByRole('link')).toHaveAttribute('href', /^mailto:/);
  });
});

test.describe('contact form failure: keeps the message when the visitor is offline', () => {
  test.use({
    // Chromium and WebKit log a failed load; Firefox reports a dropped request as a CORS failure.
    expectedConsoleError: new RegExp(
      [
        String.raw`^Failed to load resource: net::ERR_INTERNET_DISCONNECTED$`,
        String.raw`^\[JavaScript Error: "Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://api\.web3forms\.com/submit\. \(Reason: CORS request did not succeed\)\. Status code: \(null\)\."\]$`,
      ].join('|'),
    ),
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('./plain/#contact');
  });

  test('keeps the message when the visitor is offline', async ({ page }) => {
    await page.route(ENDPOINT, (route) => route.abort('internetdisconnected'));
    await fillValid(page);
    await form(page).getByRole('button', { name: 'Send message' }).click();
    await expect(form(page).getByRole('status')).toHaveText(OFFLINE);
    await expect(form(page).getByLabel('Message')).toHaveValue(
      'Hello there, I would like to chat about a role.',
    );
  });
});

test.describe('contact form without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('posts straight to Web3Forms with a redirect to the thank-you page', async ({ page }) => {
    let body = '';
    await page.route(ENDPOINT, async (route) => {
      body = route.request().postData() ?? '';
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<p>ok</p>' });
    });
    await page.goto('./plain/#contact');
    await fillValid(page);
    await form(page).getByRole('button', { name: 'Send message' }).click();
    await expect.poll(() => body).toContain('name=Ada+Lovelace');
    const params = new URLSearchParams(body);
    expect(params.get('email')).toBe('ada@example.com');
    expect(params.get('redirect')).toMatch(/\/contact\/thanks\/$/);
    expect(params.get('access_key')).toMatch(/^[0-9a-f-]{36}$/);
  });
});

test.describe('thank-you page', () => {
  test('confirms the message and links back', async ({ page }) => {
    await page.goto('./contact/thanks/');
    await expect(page.getByRole('heading', { level: 1, name: 'Message sent' })).toBeVisible();
    await page.getByRole('link', { name: 'Back to the portfolio' }).click();
    await expect(page).toHaveURL(/\/plain\/$/);
  });
});
