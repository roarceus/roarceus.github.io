# Status

_Last updated: 2026-11-27_

## Current stage

**Stage 3 (terminal engine): done. v0.4.0 is live** (release #79, 2026-11-27; production shows the hero with
the dashboard off, as intended). Next: Stage 4, the
3D cluster on one fixed screen where nothing scrolls ([ADR 0005](adr/0005-3d-cluster-one-screen.md); concept:
[`concepts/cluster-3d-concept.html`](concepts/cluster-3d-concept.html)). The dashboard stays behind
`clusterDashboard` until then. Stage 3 design: [`plans/stage-3-design.md`](plans/stage-3-design.md); plan:
[`plans/stage-3.md`](plans/stage-3.md); [milestone](https://github.com/roarceus/roarceus.github.io/milestone/4).

## Stage 3 sign-off

- **Shipped:** plan (#77); command parser (#78); content snapshot (#80); commands and registry (#84);
  nanostores store (#85, [ADR 0003](adr/0003-nanostores-for-island-state.md)); Astro hashed CSP with no
  `'unsafe-inline'` (#86, [ADR 0004](adr/0004-astro-hashed-csp.md)); terminal island (#87); one-screen desktop
  layout (#88); 3D direction (#89, ADR 0005); JavaScript budgets and a shared React runtime chunk (#90);
  terminal paging (#91); detail panel island (#92); `?run=` deep links (#93); contact manifest (#94).
- **Checks (main CI at 92d3673):** 927 unit tests, coverage 95.8% statements and 90.3% branches. e2e
  production 1119 passed (Chromium 282, Firefox 186, WebKit 651); `@dashboard` 347 passed (95, 71, 181).
  Lighthouse mobile 100/100/100/100 on `/` (both builds), `/plain/`, a project page, and `/updates/`; the
  404 page 100/100/100 (SEO 63 by design: noindex).
- **Budgets (gzipped):** dashboard island code 19507 (limit tightened to 21458), dashboard startup 89345 of
  92049, production `/` 0, `/plain/` 2164 of 2380 (raised in #94 for the shared contact chunk).
- **Links:** last preview https://roarceus.github.io/pr-preview/pr-94/; screenshot
  `assets/screenshot-dashboard.png`.

## Retrospective

- **Went well:** tests first kept command output exact; the e2e matrix caught two regressions before review
  (the pager jumping when its own button took focus, and a sixth chip that shrank the panel); the budget
  check caught the plain view growing; the ledger kept every ruling and its cost in one place.
- **Didn't:** the panel's pager took Space from typed text until Task 8, found only in a preview; a WebKit
  hydration mismatch (#93) showed up only in e2e; the plan and ADR 0005 disagreed on where Contact opens;
  a lazy-load fix for the budget was proposed before measuring Vite's preload helper, and made it worse.
- **Change next stage:** check forms and long content at 1024x700 before opening a UI PR; when an ADR
  changes direction, update the plan in the same PR; measure bundle changes before proposing size fixes.

## Next steps

1. Stage 4 planning, once Sohan gives the go: the 3D scene with a 2D fallback (ADR 0005); start with
   `docs/plans/stage-4.md`.
2. Carried over: submit the sitemap in Google Search Console; check the share card in a link inspector
   (runbook: `docs/runbooks/share-image.md`); set up the uptime monitor (M10); decide on Renovate's
   queued TypeScript 7 PR.

## Open questions

- Older project dates and eras are still open in `docs/content-review.md`.
- Global `~/.npmrc` uses `registry=http://`; switching it to `https://` is Sohan's call (repo is pinned).

## Known issues

- The detail panel is cramped at 1024x700: a pod takes 5 pages, and the contact form pages too (focus
  turns to the right page, so it still works). Revisit when Stage 4 lays out the 3D scene.
- The no-JS contact form post flaked once on WebKit at 320px (not seen in 25 runs before). Watching it.
- GitHub Pages serves only the root `404.html`, so a missing page under a PR preview shows production's
  404 page.
- Scorecard shows 8 findings (repo age, solo reviews, fuzzing, best-practices badge, early commits without
  CI/SAST, security policy before #28). Several clear over time; the rest are expected for a solo static site.
- Claude Code sessions must source `~/.ssh/agent.env` before git network commands (passphrase-protected
  `id_roarceus` key) and refresh PATH for fnm's Node 26.
- Git Bash rewrites `BASE_PATH=/...`; use `MSYS2_ENV_CONV_EXCL=BASE_PATH` (runbook: local setup).
