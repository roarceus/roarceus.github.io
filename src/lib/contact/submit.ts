import type { ContactMessage } from './validate';

export type SubmitResult = 'sent' | 'invalid' | 'server-error' | 'offline';

/** What came back from the request: a response, or the error thrown when there was none. */
export type SubmitOutcome = { status: number; body: unknown } | { error: unknown };

/** The JSON body Web3Forms expects (https://docs.web3forms.com). */
export function contactPayload(message: ContactMessage, accessKey: string): Record<string, string> {
  return {
    access_key: accessKey,
    subject: 'New message from your portfolio',
    from_name: message.name,
    name: message.name,
    email: message.email,
    message: message.message,
  };
}

const reportsSuccess = (body: unknown) =>
  typeof body === 'object' && body !== null && 'success' in body && body.success === true;

/** Maps a Web3Forms response (or a network failure) to what the form tells the visitor. */
export function toSubmitResult(outcome: SubmitOutcome): SubmitResult {
  if ('error' in outcome) return 'offline';
  const { status, body } = outcome;
  if (status >= 200 && status < 300) return reportsSuccess(body) ? 'sent' : 'server-error';
  if (status === 400 || status === 422) return 'invalid';
  return 'server-error';
}

/** Posts the payload as JSON. Never throws: a failed request comes back as `{ error }`. */
export async function sendContact(
  endpoint: string,
  payload: Record<string, string>,
  fetcher: typeof fetch = fetch,
): Promise<SubmitOutcome> {
  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const body: unknown = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch (error) {
    return { error };
  }
}
