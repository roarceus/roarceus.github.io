import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { auditCsp, cspDirectives, hoistCspMeta } from './csp';

const ENDPOINT = 'https://api.web3forms.com/submit';
const sha = (text: string) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;

const LOADER = '(function(){console.log(1)})();';
const STYLE = 'astro-island{display:contents}';

function page({
  policy = [
    ...cspDirectives(ENDPOINT),
    `script-src 'self' ${sha(LOADER)}`,
    `style-src 'self' ${sha(STYLE)}`,
  ].join(';'),
  head = '',
  body = '',
  first = '',
} = {}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">${first}<meta http-equiv="content-security-policy" content="${policy}">${head}<script>${LOADER}</script><style>${STYLE}</style></head><body>${body}</body></html>`;
}

describe('cspDirectives', () => {
  it('lists every directive except script-src and style-src, which Astro adds with hashes', () => {
    expect(cspDirectives(ENDPOINT)).toEqual([
      "default-src 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self' https://api.web3forms.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://api.web3forms.com",
    ]);
  });
});

describe('hoistCspMeta', () => {
  it('moves the CSP meta tag to right after <meta charset>', () => {
    const csp = `<meta http-equiv="content-security-policy" content="default-src 'self'">`;
    const html = `<html><head><meta charset="utf-8"><title>x</title><link rel="icon" href="/i.svg">${csp}<link rel="stylesheet" href="/a.css"></head></html>`;
    expect(hoistCspMeta(html)).toBe(
      `<html><head><meta charset="utf-8">${csp}<title>x</title><link rel="icon" href="/i.svg"><link rel="stylesheet" href="/a.css"></head></html>`,
    );
    expect(hoistCspMeta('<html><head><meta charset="utf-8"></head></html>')).toBe(
      '<html><head><meta charset="utf-8"></head></html>',
    );
  });
});

describe('auditCsp', () => {
  it('passes a page whose inline scripts and styles are all hashed', () => {
    expect(auditCsp(page({ head: '<script type="application/ld+json">{"a":1}</script>' }), ENDPOINT)).toEqual(
      [],
    );
  });

  it('needs <meta charset> first and the CSP meta tag right after it, before any link, script, or style', () => {
    expect(auditCsp(page({ first: '<link rel="stylesheet" href="/a.css">' }), ENDPOINT)).toContain(
      'the CSP meta tag does not come right after <meta charset>',
    );
    expect(auditCsp('<html><head><meta charset="utf-8"></head></html>', ENDPOINT)).toContain(
      'no CSP meta tag',
    );
  });

  it('flags a changed, missing, or extra directive', () => {
    const policy = (directives: string[]) =>
      page({ policy: [...directives, "script-src 'self'", "style-src 'self'"].join(';') });
    const [, ...rest] = cspDirectives(ENDPOINT);
    expect(auditCsp(policy(rest), ENDPOINT)).toContain("missing directive: default-src 'self'");
    expect(auditCsp(policy([...cspDirectives(ENDPOINT), "frame-src 'self'"]), ENDPOINT)).toContain(
      "unexpected directive: frame-src 'self'",
    );
  });

  it("never allows 'unsafe-inline', 'unsafe-eval', or another script source", () => {
    const with_ = (script: string) =>
      page({ policy: [...cspDirectives(ENDPOINT), script, `style-src 'self' ${sha(STYLE)}`].join(';') });
    expect(auditCsp(with_(`script-src 'self' 'unsafe-inline' ${sha(LOADER)}`), ENDPOINT)).toContain(
      "script-src allows 'unsafe-inline'",
    );
    expect(auditCsp(with_(`script-src 'self' 'unsafe-eval' ${sha(LOADER)}`), ENDPOINT)).toContain(
      "script-src allows 'unsafe-eval'",
    );
    expect(auditCsp(with_(`script-src 'self' https://cdn.example.com ${sha(LOADER)}`), ENDPOINT)).toContain(
      'script-src allows https://cdn.example.com',
    );
  });

  it('flags an inline script or style the policy does not hash', () => {
    expect(auditCsp(page({ body: '<script>alert(1)</script>' }), ENDPOINT)).toContain(
      'inline script not in script-src: alert(1)',
    );
    expect(auditCsp(page({ body: '<style>p{color:red}</style>' }), ENDPOINT)).toContain(
      'inline style not in style-src: p{color:red}',
    );
  });

  it('flags style attributes and inline event handlers, but not text that mentions them', () => {
    expect(auditCsp(page({ body: '<p style="color:red">x</p>' }), ENDPOINT)).toContain(
      'style attribute: <p style="color:red">',
    );
    expect(auditCsp(page({ body: '<img src="x" onerror="alert(1)">' }), ENDPOINT)).toContain(
      'inline event handler: <img src="x" onerror="alert(1)">',
    );
    expect(auditCsp(page({ body: '<code>&lt;img onerror=x style="y"&gt;</code>' }), ENDPOINT)).toEqual([]);
  });
});
