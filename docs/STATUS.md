# Status

_Last updated: 2026-11-24_

## Current stage

**Stage 0 — Foundation** (target v0.1.0). Plan: [`docs/plans/stage-0.md`](plans/stage-0.md).
Milestone: [Stage 0 — Foundation](https://github.com/roarceus/roarceus.github.io/milestone/1) ·
Board: [Projects #1](https://github.com/users/roarceus/projects/1)

## Done

- Stage 0 plan approved; decisions D1–D5 recorded in the plan.
- Manual setup M1–M5: Node 26.13.1 + pnpm 12.23.0 locally, `project` scope on `gh`, Actions settings
  (read-only token, SHA pinning required), security settings, release-please GitHub App
  (`vars.RELEASE_APP_ID`, `secrets.RELEASE_APP_PRIVATE_KEY`).
- GitHub: 8 stage milestones, 34 labels, Projects board, Stage 0 issues #1–#16 (#16 closed).
- PR 1 merged (#17): spec, rules, plan, templates, Claude settings.
- PR 2 merged (#18): Astro scaffold, `url()` helper, build info, feature flags, placeholder page, ADR-0001.
- PR 3 merged (#19): ESLint, Prettier, knip, dependency-cruiser, commit hooks, root-path test.
- Pages source switched from `main` (auto-enabled Jekyll build, failed on `.astro` front matter) to
  "GitHub Actions" on 2026-11-24. The README page from PR 1 stays live until our first deploy.
- PR 4 merged (#21): CI (quality, build, Playwright + axe on 3 engines, Lighthouse, lychee, dependency
  review, `ci-ok`), PR title check + labels, CodeQL.
- M6: `protect-main` requires `ci-ok` and `validate` (export in `docs/github/rulesets/`, #22).
- #20 merged: minimatch override (Dependabot alert #1 fixed) and https registry.
- #25 merged: first release starts at 0.1.0 (release-please defaulted to 1.0.0 with no prior tag).
- PR 5 merged (#23): previews, release-please (App token), production deploy, rollback, smoke tests.
- M7: Pages serves `gh-pages` / root. PR previews work (first: `/pr-preview/pr-23/`). The site root returns
  404 until the first release deploys production.

## In progress

- PR 6 `ci/stage-0-ops-and-renovate` (#10, #13, #14): weekly production checks + quarterly content review,
  Renovate config, OpenSSF Scorecard.
- Release PR #24 (bot) now proposes **0.1.0** (#25 merged). Merge it last in Stage 0, after PR 7 (M9).

## Next steps

1. After PR 6 merges: Sohan installs the Renovate app (M8); run `Scheduled` manually once for each job.
2. PR 7 `docs/stage-0-project-docs` (#15), then merge release PR #24 → v0.1.0 deploys (M9).

## Open questions

- Design direction: Sohan wants real flair (3D, gamey, fun, many components), not a generic terminal
  look. That conflicts with SPEC §5's "real tool look"; explore options at Stage 2 planning and update
  SPEC §5 via an ADR once a direction is chosen. Keep the mobile perf budget, plain view, and a11y.
- Global `~/.npmrc` uses `registry=http://`; switching it to `https://` is Sohan's call (repo is pinned).

## Known issues

- PRs 2 and 3 merge before CI exists; they are verified with local `pnpm check` only.
- Git hooks call `pnpm`; GUI git clients need Node 26 + pnpm on their PATH (fnm in the shell profile).
- Claude Code sessions on this machine must source `~/.ssh/agent.env` before git network commands
  (the `id_roarceus` key is passphrase-protected and loaded in the Git Bash ssh-agent).
- Git Bash rewrites `BASE_PATH=/...` into a Windows path; use `MSYS2_ENV_CONV_EXCL=BASE_PATH` (README).
