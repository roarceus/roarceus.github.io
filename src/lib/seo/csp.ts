import { createHash } from 'node:crypto';

/**
 * The Content Security Policy (ADR 0004). GitHub Pages can't set headers, so it ships as a meta tag.
 * Astro writes that tag (`security.csp`) and adds `script-src` and `style-src` with a SHA-256 hash for
 * every inline script and style it emits; these are the rest. No relative imports: CI's
 * `check-csp.mjs` loads this file with plain Node.
 */

type Directive =
  `${'default-src' | 'img-src' | 'font-src' | 'connect-src' | 'object-src' | 'base-uri' | 'form-action'} ${string}`;

/** Every directive but `script-src` and `style-src`. The only off-site endpoint is the contact form's. */
export function cspDirectives(contactEndpoint: string): Directive[] {
  const contact = new URL(contactEndpoint).origin;
  return [
    "default-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${contact}`,
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${contact}`,
  ];
}

const CSP_META = /<meta\s+http-equiv="content-security-policy"\s+content="([^"]*)"\s*\/?>/i;
const ELEMENT = (name: string) => new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)</${name}>`, 'gi');
const hash = (text: string) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;
const CHARSET = /^<meta charset="utf-8"\s*\/?>$/i;

function sources(policy: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();
  for (const directive of policy.split(';')) {
    const [name, ...values] = directive.trim().split(/\s+/);
    if (name) directives.set(name, values);
  }
  return directives;
}

/** `script-src`/`style-src` may hold only `'self'` and hashes. */
function checkHashedSources(name: string, values: string[] | undefined, problems: string[]): Set<string> {
  if (!values) {
    problems.push(`missing directive: ${name}`);
    return new Set();
  }
  for (const value of values) {
    if (value !== "'self'" && !/^'sha256-[A-Za-z0-9+/=]+'$/.test(value))
      problems.push(`${name} allows ${value}`);
  }
  return new Set(values);
}

function checkInline(html: string, problems: string[], scripts: Set<string>, styles: Set<string>) {
  for (const [, attrs = '', body = ''] of html.matchAll(ELEMENT('script'))) {
    if (/\bsrc=/i.test(attrs) || /type="application\/ld\+json"/i.test(attrs)) continue;
    if (!scripts.has(hash(body))) problems.push(`inline script not in script-src: ${body.slice(0, 60)}`);
  }
  for (const [, , body = ''] of html.matchAll(ELEMENT('style'))) {
    if (!styles.has(hash(body))) problems.push(`inline style not in style-src: ${body.slice(0, 60)}`);
  }
  const markup = html.replace(ELEMENT('script'), '').replace(ELEMENT('style'), '');
  for (const [tag] of markup.matchAll(/<[a-z][^>]*>/gi)) {
    if (/\sstyle\s*=/i.test(tag)) problems.push(`style attribute: ${tag}`);
    if (/\son[a-z]+\s*=/i.test(tag)) problems.push(`inline event handler: ${tag}`);
  }
}

/**
 * Astro writes the CSP meta tag just before its stylesheets, after the page's own head content. A meta
 * CSP only applies to what follows it, so the build moves it to right after `<meta charset>`.
 */
export function hoistCspMeta(html: string): string {
  const meta = CSP_META.exec(html)?.[0];
  const charset = /<meta charset="utf-8"\s*\/?>/i.exec(html);
  if (!meta || !charset) return html;
  const at = charset.index + charset[0].length;
  const rest = html.slice(at).replace(meta, '');
  return `${html.slice(0, at)}${meta}${rest}`;
}

/** Problems with one built page's CSP; an empty list means it passes. */
export function auditCsp(html: string, contactEndpoint: string): string[] {
  const meta = CSP_META.exec(html);
  if (!meta) return ['no CSP meta tag'];
  const problems: string[] = [];

  // A meta CSP only covers what comes after it; the charset must stay in the first 1024 bytes.
  const [, first, second] = /<head[^>]*>\s*(<[^>]*>)\s*(<[^>]*>)?/i.exec(html) ?? [];
  if (!first || !CHARSET.test(first)) problems.push('<meta charset> is not the first element in <head>');
  if (second !== meta[0]) problems.push('the CSP meta tag does not come right after <meta charset>');

  const policy = sources(meta[1] ?? '');
  const actual = new Set(
    [...policy]
      .filter(([name]) => name !== 'script-src' && name !== 'style-src')
      .map(([name, values]) => [name, ...values].join(' ')),
  );
  const expected: string[] = cspDirectives(contactEndpoint);
  for (const directive of expected)
    if (!actual.has(directive)) problems.push(`missing directive: ${directive}`);
  for (const directive of actual)
    if (!expected.includes(directive)) problems.push(`unexpected directive: ${directive}`);

  const scripts = checkHashedSources('script-src', policy.get('script-src'), problems);
  const styles = checkHashedSources('style-src', policy.get('style-src'), problems);
  checkInline(html, problems, scripts, styles);
  return problems;
}
