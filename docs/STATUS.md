# Status

_Last updated: 2026-11-25_

## Current stage

**Stage 1 — Content and plain view: done, ready to release as v0.2.0.** Production still serves v0.1.0
until release PR #42 merges. Plan: [`plans/stage-1.md`](plans/stage-1.md) ·
[milestone](https://github.com/roarceus/roarceus.github.io/milestone/2) (#32–#40) ·
[board](https://github.com/users/roarceus/projects/1). **Next:** Stage 2 planning (design system and layout).

## Stage 1 sign-off

- **Shipped:** content schemas, query helpers, and integrity checks (#41); all portfolio content with a
  content review (#43); the plain portfolio at `/plain/` and the home hero (#44); 16 project pages, updates,
  and an RSS feed (#45); a contact form through Web3Forms that also works without JavaScript (#46); page
  metadata, a share image, JSON-LD, a production-only sitemap, robots.txt, and the kubectl 404 page (#47);
  Lighthouse on every page type and this sign-off (#48).
- **Checks:** Lighthouse mobile 100/100/100/100 on `/`, `/plain/`, a project page, and `/updates/`; the 404
  page 100/100/100 (SEO is 63 by design: it's noindex). No sideways scroll on 7 page types at 320, 375, 768,
  1280, and 1920px. e2e passes on Chromium, Firefox, and WebKit across phone, tablet, and desktop sizes.
  Sohan checked the plain view on iOS Safari. No `TODO(sohan)` left in `src/`.
- **Links:** last preview https://roarceus.github.io/pr-preview/pr-47/ · release PR #42 (v0.2.0).

## Retrospective

- **Went well:** tests first caught real bugs before review (the hidden live region, the 404 canonical);
  the content review with Sohan meant no invented facts; a static test keeps AI-style punctuation out of the
  copy; local preview-base builds proved canonical, RSS, and sitemap stay on production.
- **Didn't:** one push went out with a failing local test (`ec38b8f`), fixed in the next commit. Changing
  site-wide head tags broke two CI consumers no unit test covers (the smoke asset check and Lighthouse's
  SEO score on noindex pages). Firefox logs failed requests differently from Chromium. Astro 7's new
  Markdown processor silently ignores rehype plugins. Internal tool names once reached a PR body.
- **Change next stage:** only push when `pnpm check` and the affected e2e exit 0 in the same command; when
  changing `<head>` or routes, run smoke against a local preview-base build and `pnpm lhci` before pushing;
  check PR bodies against the public-names rule before posting.

## Next steps

1. Sohan: merge release PR #42 (v0.2.0) once this PR is in, then watch Actions → Release (deploy, smoke).
2. After v0.2.0: submit the sitemap in Google Search Console; check the share card in a link inspector
   (runbook: `docs/runbooks/share-image.md`); set up the uptime monitor (M10).
3. Stage 2 planning: a design-direction ADR first (see open questions), then `plans/stage-2.md`.
4. Decide on Renovate's queued TypeScript 7 PR (fails until `typescript-eslint` supports TS 7).

## Open questions

- Plain view length: Sohan checked it on iOS Safari (no clipping) but finds it long. Revisit at Stage 2
  (summary-first layout or collapsible sections), keeping it complete and printable.
- Design direction: Sohan wants real flair (3D, gamey, fun, many components), not a generic terminal
  look. That conflicts with SPEC §5's "real tool look"; explore options at Stage 2 planning and update
  SPEC §5 via an ADR once a direction is chosen. Keep the mobile perf budget, plain view, and a11y.
- Older project dates and eras are still open in `docs/content-review.md`.
- Global `~/.npmrc` uses `registry=http://`; switching it to `https://` is Sohan's call (repo is pinned).

## Known issues

- GitHub Pages serves only the root `404.html`, so a missing page under a PR preview shows production's
  404 page.
- Scorecard shows 8 findings (repo age, solo reviews, fuzzing, best-practices badge, early commits without
  CI/SAST, security policy before #28). Several clear over time; the rest are expected for a solo static site.
- Claude Code sessions must source `~/.ssh/agent.env` before git network commands (passphrase-protected
  `id_roarceus` key) and refresh PATH for fnm's Node 26.
- Git Bash rewrites `BASE_PATH=/...`; use `MSYS2_ENV_CONV_EXCL=BASE_PATH` (runbook: local setup).
