# Status

_Last updated: 2026-11-24_

## Current stage

**Stage 0 — Foundation → v0.1.0.** All PRs written; waiting on PR 7 and the release (M9). Plan:
[`plans/stage-0.md`](plans/stage-0.md) · [milestone](https://github.com/roarceus/roarceus.github.io/milestone/1) ·
[board](https://github.com/users/roarceus/projects/1)

## Stage 0 sign-off

- **Shipped:** Astro/React/TS/Tailwind scaffold with `url()` base-path helper and placeholder page (#18);
  lint/format/knip/depcruise/commit hooks and root-path test (#19); CI with Playwright + axe on 3 engines,
  Lighthouse, links, dependency review, `ci-ok`, PR title check, CodeQL (#21); PR previews, release-please
  (App token), production deploy, rollback, smoke tests (#23); weekly ops checks, Renovate, Scorecard (#26);
  docs and runbooks (PR 7).
- **Fixes along the way:** minimatch advisory (#20), required-checks ruleset export (#22), first release
  0.1.0 not 1.0.0 (#25), Scorecard v2.6.0 image missing upstream, pinned v2.5.0 (#27).
- **Manual setup done:** M1–M8 (Node/pnpm, `gh` scope, Actions + security settings, release App, required
  checks, Pages from `gh-pages`, Renovate app).
- **Links:** first verified preview https://roarceus.github.io/pr-preview/pr-23/ (Lighthouse 100 ×4 mobile).

## Retrospective

- **Went well:** pinning and verifying versions up front (TS 6, ESLint-10 plugins) avoided churn; local
  probes (rule violations, base-path builds, smoke under a sub-path) caught bugs before CI; one
  aggregated `ci-ok` check kept the ruleset simple.
- **Didn't:** several assumptions only failed on GitHub: Pages was auto-enabled from `main`, CI lacked
  Astro's generated types on a fresh checkout, lychee changed a config type, release-please defaulted to
  1.0.0, an upstream action image vanished. README table edits silently didn't apply for three PRs
  (string match broke after Prettier padded the tables).
- **Change next stage:** verify every doc edit by reading the result (or edit with exact anchors); run a
  fresh-checkout check (`rm -rf .astro node_modules && pnpm install && pnpm check`) before opening PRs;
  check platform defaults (GitHub settings, tool defaults) explicitly instead of assuming.

## Next steps

1. Merge PR 7, then merge release PR #24 (`chore(release): release 0.1.0`) → v0.1.0 deploys (M9).
2. After the release: run **Scheduled → ops** manually (should pass and stay quiet) and **content-review**
   once (then close the issue); set up an uptime monitor (M10).
3. Stage 1 planning: `docs/plans/stage-1.md`, milestone issues, and a design-direction discussion (below).

## Open questions

- Design direction: Sohan wants real flair (3D, gamey, fun, many components), not a generic terminal
  look. That conflicts with SPEC §5's "real tool look"; explore options at Stage 2 planning and update
  SPEC §5 via an ADR once a direction is chosen. Keep the mobile perf budget, plain view, and a11y.
- Renovate hasn't created its Dependency Dashboard yet after install; check its repo access and logs
  (developer.mend.io) if it still hasn't by the next session.
- Global `~/.npmrc` uses `registry=http://`; switching it to `https://` is Sohan's call (repo is pinned).

## Known issues

- Site root returns 404 until v0.1.0 deploys (only PR previews are on `gh-pages`).
- Claude Code sessions must source `~/.ssh/agent.env` before git network commands (passphrase-protected
  `id_roarceus` key) and refresh PATH for fnm's Node 26.
- Git Bash rewrites `BASE_PATH=/...`; use `MSYS2_ENV_CONV_EXCL=BASE_PATH` (runbook: local setup).
