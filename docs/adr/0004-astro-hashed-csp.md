# 0004. Astro's hashed CSP instead of a hand-written meta tag

- **Status:** accepted
- **Date:** 2026-11-26
- **Deciders:** Sohan Patil

## Context

GitHub Pages can't set headers, so the Content Security Policy ships as a `<meta>` tag (SPEC §10b).
Until now `BaseLayout.astro` wrote it by hand with `script-src 'self'` and `style-src 'self'`.

Stage 3 adds the first React island (the terminal). Astro loads islands with two small inline
scripts and an inline `<style>` (`astro-island { display: contents }`). The hand-written policy blocks
all three, so in a production build the island would never hydrate. The CI dashboard build is a
production build, so the e2e tests would catch it, but only by failing.

`'unsafe-inline'` is not an option: it would let any injected script run.

## Decision

Use Astro's built-in `security.csp`:

- Astro writes the meta tag on every built page and adds `script-src 'self'` and `style-src 'self'`
  with a SHA-256 hash of each inline script and style it emits. No `'unsafe-inline'`, ever.
- The other directives live in one place, `cspDirectives()` in `src/lib/seo/csp.ts`, and are
  unchanged: `default-src 'self'`, `img-src 'self' data:`, `font-src 'self'`, `connect-src` and
  `form-action` for the contact form's origin, `object-src 'none'`, `base-uri 'self'`.
- A meta CSP covers only what comes after it, and Astro writes its tag just before its stylesheets. A
  small build integration (`hoistCsp` in `astro.config.mjs`) moves it to right after
  `<meta charset>`, so no link, script, or style comes before it. The charset stays first because
  HTML requires it in the first 1024 bytes, and the tag with its hashes is already about 700 bytes.
- Shiki highlights code with `style` attributes, which `style-src` blocks. A theme whose colors are
  CSS variables plus a `styleToClass` transformer (`src/lib/markdown/code-highlight.ts`) output classes
  instead; `global.css` maps them to design tokens that already pass AA.
- The policy applies to builds only. The dev server injects its own inline code.

## Checks

- `check-csp.mjs` (CI build job) audits every page of the production build, the dashboard build, and
  both builds under the `/pr-preview/pr-0/` base path: charset first and the CSP right after it, the
  same directives, only `'self'` and hashes in `script-src` and `style-src`, a hash for every inline
  script and style, and no `style` attributes or inline event handlers.
- Every e2e test fails on a `securitypolicyviolation` event or a CSP console error
  (`tests/support/fixtures.ts`). `tests/e2e/csp.spec.ts` proves the guard catches a blocked script and
  that a highlighted code block (`/fixtures/code-block/`, built only with the `fixtures` flag in CI's
  dashboard build) renders under the policy.

## Alternatives considered

- **Keep the hand-written tag and add the hashes ourselves:** the hashes are of Astro's own loader
  code, so they change with Astro upgrades and would break islands silently between releases.
- **`'unsafe-inline'`:** defeats the point of a CSP.
- **Prism instead of Shiki:** also class-based, but needs a separate theme stylesheet and highlights
  fewer languages; the transformer keeps Shiki and our tokens.

## Consequences

- Islands, and any inline script or style Astro emits, work without loosening the policy.
- The policy is the same on every page: Astro lists the hashes of all inline scripts in the build.
- Analytics (GoatCounter, later): serve `count.js` from the site itself (preferred, stays under
  `'self'`), or add an explicit `script-src` and `connect-src` allowance for its origin when it lands.
  Either way it updates `cspDirectives()`, the audit, and this ADR. Never `'unsafe-inline'`.
- A new off-site endpoint means editing `cspDirectives()`; the audit fails until the directives match.
