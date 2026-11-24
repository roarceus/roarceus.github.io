# 0001. Stack and tooling for Stage 0

- **Status:** accepted
- **Date:** 2026-11-24
- **Deciders:** Sohan Patil

## Context

SPEC §3 picks the stack (Astro static output, React islands, TypeScript strict, Tailwind, pnpm, Node LTS)
and asks for the latest stable version of each tool, verified and pinned exactly. When Stage 0 began
(2026-11-24), a few of the "latest" versions could not be used together, and SPEC §10's manual GitHub
setup asked for broader workflow permissions than the release flow needs. The exact versions are listed
in `docs/plans/stage-0.md`.

## Decision

1. **Runtime:** Node 26.13.1 (current LTS) and pnpm 12.23.0, pinned in `.nvmrc`, `engines`, and
   `packageManager`. Exact versions only (`.npmrc` `save-exact=true`, `engine-strict=true`).
2. **Framework:** Astro 7 static output with the React 19 integration and Tailwind 4 via `@tailwindcss/vite`.
   Design tokens are CSS variables (`src/styles/tokens.css`) exposed to Tailwind with `@theme inline`.
3. **TypeScript 6.0.3, not 7.0.2.** `typescript-eslint` (peer `<6.1.0`) and `@astrojs/check`
   (peer `^5 || ^6`) don't support TypeScript 7 yet. Renovate will propose the upgrade once they do.
4. **ESLint 10 plugins:** `eslint-plugin-react` and `eslint-plugin-jsx-a11y` don't declare ESLint 10
   support, so we use `@eslint-react/eslint-plugin` and `eslint-plugin-jsx-a11y-x` (which
   `eslint-plugin-astro` accepts). `@eslint-react` 5 also implements the rules of hooks, so
   `eslint-plugin-react-hooks` is not used (it double-reported every violation). Added in PR 3.
5. **Static asset folder** is `assets/` instead of Astro's `_astro/`, because branch-deployed GitHub Pages
   runs Jekyll, which hides `_`-prefixed folders. `public/.nojekyll` is a second safeguard.
6. **CSP** ships as a `<meta>` tag in production builds only (GitHub Pages can't set headers; the dev
   server needs inline scripts). Stylesheets are never inlined so `style-src 'self'` holds, and Vite's
   `assetsInlineLimit` is 0 so small fonts and images are never turned into `data:` URIs (one font
   subset was, and the CSP blocked it).
7. **GitHub Actions token is read-only by default**, and "Allow GitHub Actions to create and approve pull
   requests" stays off. Each job requests the permissions it needs. release-please authenticates as a
   GitHub App (`vars.RELEASE_APP_ID`, `secrets.RELEASE_APP_PRIVATE_KEY`), which also makes its release
   PRs trigger CI, since PRs opened with `GITHUB_TOKEN` don't. This differs from SPEC §10's manual setup
   list ("read and write"), on purpose.

## Alternatives considered

- **TypeScript 7 without `typescript-eslint` type-aware rules:** loses the strict type-checked lint rules.
- **Keep `_astro/` and rely on `.nojekyll` alone:** previews can land on `gh-pages` before the first
  production deploy writes `.nojekyll` to the branch root, so `_astro/` assets would 404 there.
- **Personal access token for release-please:** long-lived and tied to a user; an App token is scoped
  to this repo and expires in an hour.

## Consequences

- One TypeScript major behind until the ecosystem catches up (tracked by Renovate).
- Two lint plugins differ from the most common setup; contributors should check ESLint config comments.
- Anyone adding a new workflow must declare `permissions:` per job; nothing inherits write access.
