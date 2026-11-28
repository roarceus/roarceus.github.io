# Status

_Last updated: 2026-11-27_

## Current stage

**Stage 4 (3D cluster): in progress, sub-stage 4a.** v0.4.0 is live (Stage 3, release #79). Design:
[`plans/stage-4-design.md`](plans/stage-4-design.md); plan: [`plans/stage-4.md`](plans/stage-4.md) (native
execution); [milestone](https://github.com/roarceus/roarceus.github.io/milestone/5) (#97 to #109, plus #81).
The dashboard stays behind `clusterDashboard`, and the scene will sit behind `cluster3d`.

- **Done in 4a:** Task 1, the content model (#97): cordoned eras stay on the map, a built-in `personal` node
  for side projects, only pending projects unscheduled, update and achievement links, snapshot v2 with
  project stories (6.5 KB gzipped).
- **Next in 4a:** Task 2 (commands, #98), Task 3 (layout model, #99), Task 4 (2D map, #100), Task 5 (docs,
  #101). The Stage 2 cards show live nodes only until the 2D map replaces them.

## Stage 3 in short

Shipped #77 to #94 (parser, snapshot, commands, store, hashed CSP, terminal and panel islands, one-screen
layout, paging, deep links, contact manifest). At sign-off: 927 unit tests, e2e 1119 production and 347
`@dashboard`, Lighthouse mobile 100 everywhere (404 SEO 63 by design). Retrospective lessons we carry into
Stage 4: check forms and long content at 1024x700 before a UI PR; update the plan in the same PR when an ADR
changes direction; measure bundle changes before proposing size fixes.

## Next steps

1. Finish 4a (Tasks 2 to 5), one PR at a time, each with a preview.
2. Carried over: submit the sitemap in Google Search Console; check the share card in a link inspector
   (runbook: `docs/runbooks/share-image.md`); set up the uptime monitor (M10); decide on Renovate's
   queued TypeScript 7 PR.

## Open questions

- Older project dates and eras are still open in `docs/content-review.md`.
- Global `~/.npmrc` uses `registry=http://`; switching it to `https://` is my call (the repo is pinned).

## Known issues

- The detail panel is cramped at 1024x700: a pod takes 5 pages, and the contact form pages too (focus
  turns to the right page, so it still works). 4b proposes new one-screen proportions.
- The no-JS contact form post flaked once on WebKit at 320px (not seen in 25 runs before). Watching it.
- GitHub Pages serves only the root `404.html`, so a missing page under a PR preview shows production's
  404 page.
- Scorecard shows 8 findings (repo age, solo reviews, fuzzing, best-practices badge, early commits without
  CI/SAST, security policy before #28). Several clear over time; the rest are expected for a solo static site.
- Claude Code sessions must source `~/.ssh/agent.env` before git network commands (passphrase-protected
  `id_roarceus` key) and refresh PATH for fnm's Node 26.
- Git Bash rewrites `BASE_PATH=/...`; use `MSYS2_ENV_CONV_EXCL=BASE_PATH` (runbook: local setup).
