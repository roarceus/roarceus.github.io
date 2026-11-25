# Status

_Last updated: 2026-11-24_

## Current stage

**Stage 1 — Content and plain view (in progress → v0.2.0).** Production still serves v0.1.0. Plan:
[`plans/stage-1.md`](plans/stage-1.md) · [milestone](https://github.com/roarceus/roarceus.github.io/milestone/2)
(#32–#40) · [board](https://github.com/users/roarceus/projects/1)

- **Done:** PR 1 schemas and query helpers (#41). Release PR #42 (v0.2.0) stays open until the stage ends.
- **In progress:** PR 2, content + `docs/content-review.md` (#34). **Next:** `/plain/` and the home hero.

## Stage 0 sign-off

- **Shipped:** Astro/React/TS/Tailwind scaffold with `url()` base-path helper and placeholder page (#18);
  lint/format/knip/depcruise/commit hooks and root-path test (#19); CI with Playwright + axe on 3 engines,
  Lighthouse, links, dependency review, `ci-ok`, PR title check, CodeQL (#21); PR previews, release-please
  (App token), production deploy, rollback, smoke tests (#23); weekly ops checks, Renovate, Scorecard (#26);
  docs and runbooks (#28); release **v0.1.0** (#24), deployed and smoke-tested in production.
- **Fixes along the way:** minimatch advisory (#20), required-checks ruleset export (#22), first release
  0.1.0 not 1.0.0 (#25), Scorecard v2.6.0 image missing upstream, pinned v2.5.0 (#27).
- **Manual setup done:** M1–M9 (Node/pnpm, `gh` scope, Actions + security settings, release App, required
  checks, Pages from `gh-pages`, Renovate app).
- **Post-release checks:** manual `Scheduled → ops` run passed (smoke, external links, Lighthouse on
  production; no ops issue); `content-review` opened #30; Renovate dashboard #29 has no config errors.
- **Links:** https://roarceus.github.io/ · [v0.1.0 release](https://github.com/roarceus/roarceus.github.io/releases/tag/v0.1.0) · first verified preview https://roarceus.github.io/pr-preview/pr-23/ (Lighthouse 100 ×4 mobile).

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

1. Sohan: answer `docs/content-review.md` once PR 2 opens (before PR 3); Web3Forms access key before PR 5;
   uptime monitor (M10).
2. Decide on Renovate's queued TypeScript 7 PR (fails until `typescript-eslint` supports TS 7; a
   `packageRules` entry can hold TS majors until then).

## Open questions

- Design direction: Sohan wants real flair (3D, gamey, fun, many components), not a generic terminal
  look. That conflicts with SPEC §5's "real tool look"; explore options at Stage 2 planning and update
  SPEC §5 via an ADR once a direction is chosen. Keep the mobile perf budget, plain view, and a11y.
- Global `~/.npmrc` uses `registry=http://`; switching it to `https://` is Sohan's call (repo is pinned).

## Known issues

- Scorecard shows 8 findings (repo age, solo reviews, fuzzing, best-practices badge, early commits without
  CI/SAST, security policy before #28). Several clear over time; the rest are expected for a solo static site.
- Claude Code sessions must source `~/.ssh/agent.env` before git network commands (passphrase-protected
  `id_roarceus` key) and refresh PATH for fnm's Node 26.
- Git Bash rewrites `BASE_PATH=/...`; use `MSYS2_ENV_CONV_EXCL=BASE_PATH` (runbook: local setup).
