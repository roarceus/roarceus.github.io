# Status

_Last updated: 2026-11-26_

## Current stage

**Stage 3 — Terminal engine: in progress** (Tasks 1 to 6 of 9: plan #77, parser #78, snapshot #80, commands #84, store #85, terminal island #87, one-screen layout #88; direction ADR 0005 #89; budgets #90; terminal paging #91). v0.3.0 is live. Design:
[`plans/stage-3-design.md`](plans/stage-3-design.md) (approved with changes 2026-11-25). Plan:
[`plans/stage-3.md`](plans/stage-3.md) (approved) ·
[milestone](https://github.com/roarceus/roarceus.github.io/milestone/4) (#68 to #76). Store:
[ADR 0003](adr/0003-nanostores-for-island-state.md). The dashboard stays behind `clusterDashboard` until
Stage 4. The CSP now comes from Astro with hashed inline scripts ([ADR 0004](adr/0004-astro-hashed-csp.md), #86),
so islands load without `'unsafe-inline'`; CI audits every built page. **Direction (2026-11-26):** the 3D
cluster becomes the v1.0 desktop experience on one fixed screen where nothing scrolls, with a pod you can step
inside ([ADR 0005](adr/0005-3d-cluster-one-screen.md); concept: [`concepts/cluster-3d-concept.html`](concepts/cluster-3d-concept.html)).

## Stage 2 sign-off

- **Shipped:** the design direction ADR (#57); design tokens with AA contrast and scene-scope checks (#58);
  UI components (#60); the top bar, site mark, and Lucide icons (#61); a shorter plain view with jump chips
  and expanders (#62); cluster data helpers and feature flags (#64); the dashboard shell on `/` behind the
  `clusterDashboard` flag (#65), widened to 1920px with the top bar lined up (#66); a WebKit heading
  contrast fix (#63).
- **Checks:** Lighthouse mobile 100/100/100/100 on `/` (both builds), `/plain/`, a project page, and
  `/updates/`; the 404 page 100/100/100 (SEO 63 by design: noindex). e2e passes on Chromium, Firefox, and
  WebKit at phone, tablet, and desktop sizes, plus the `@dashboard` specs against the flag build and a width
  check at 1280, 1920, and 2560px. Previews checked at 375 and 1920px.
- **Spec updates:** "One playground" (SPEC §4): the cluster view never leaves the page; chips and names run
  in place from Stage 3. Stage 4 replaces the placeholder cards with nodes sized to their pods.
- **Links:** last preview https://roarceus.github.io/pr-preview/pr-66/ · release PR #59 (v0.3.0) ·
  screenshots in `assets/`.

## Retrospective

- **Went well:** the design proposal and review before code meant no layout rework; the contrast test caught
  two failing pairs (primary hover, selected scene) before review; building a second, flagged site in CI let
  the dashboard ship to previews without touching production.
- **Didn't:** the WebKit heading flake failed 19 of 20 CI runs, hidden by retries, before anyone looked.
  Phone smoke failed only on the preview because the test counted a hidden region as missing. The new
  `dist-dashboard` folder got scanned by lint and typecheck. A width cap left wide empty gutters at 1920px,
  found by Sohan, not by tests.
- **Change next stage:** read retried test logs, not just the green check; run smoke against a local flag
  build when changing what it checks; check layouts at 1920 and 2560px before opening a UI PR.

## Next steps

1. Review the detail panel PR (7a), then 7b (`?run=` deep links), then Tasks 7 to 9 (`plans/stage-3.md`). Task 7 pages the detail panel; Task 8 opens
   Contact in place from the top bar too. Stage 4 is now the 3D scene with a 2D fallback.
2. Carried over: submit the sitemap in Google Search Console; check the share card in a link inspector
   (runbook: `docs/runbooks/share-image.md`); set up the uptime monitor (M10); decide on Renovate's
   queued TypeScript 7 PR.

## Open questions

- Older project dates and eras are still open in `docs/content-review.md`.
- Global `~/.npmrc` uses `registry=http://`; switching it to `https://` is Sohan's call (repo is pinned).

## Known issues

- The no-JS contact form post flaked once on WebKit at 320px (not seen in 25 runs before). Watching it.
- GitHub Pages serves only the root `404.html`, so a missing page under a PR preview shows production's
  404 page.
- Scorecard shows 8 findings (repo age, solo reviews, fuzzing, best-practices badge, early commits without
  CI/SAST, security policy before #28). Several clear over time; the rest are expected for a solo static site.
- Claude Code sessions must source `~/.ssh/agent.env` before git network commands (passphrase-protected
  `id_roarceus` key) and refresh PATH for fnm's Node 26.
- Git Bash rewrites `BASE_PATH=/...`; use `MSYS2_ENV_CONV_EXCL=BASE_PATH` (runbook: local setup).
