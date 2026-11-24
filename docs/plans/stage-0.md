# Stage 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A production-grade empty shell: Astro + React + TS + Tailwind scaffold, every quality gate and workflow
from SPEC §10/§10b, and a placeholder page (name + version) deployed to `https://roarceus.github.io/` via a
release-please release, with working PR previews.

**Architecture:** Static Astro site (`output: 'static'`), base path from `BASE_PATH`, deployed by workflows to the
`gh-pages` branch (production at root, previews under `pr-preview/pr-<N>/`). release-please owns versions;
the production deploy runs in the same workflow as release-please (GITHUB_TOKEN releases don't trigger workflows).

**Tech Stack:** Node 26 LTS, pnpm 12, Astro 7, React 19, TypeScript 6, Tailwind 4, Vitest 5, Playwright 1.65.

**Spec:** `docs/SPEC.md` (§3, §10, §10b, §11 Stage 0). Working rules: `CLAUDE.md`.

**Status:** Approved 2026-11-24. Milestones, labels, board, and issues #1–#16 created; M1–M5 done.

## Global Constraints

- Exact versions in `package.json` (no `^`/`~`); `.npmrc` sets `save-exact=true`, `engine-strict=true`.
- Every third-party action pinned to a full commit SHA with `# vX.Y.Z` comment; `permissions: {}` at workflow
  level, granted per job; concurrency group on every workflow.
- Every internal URL goes through `url()` (`src/lib/utils/url.ts`); no hardcoded leading `/`.
- `lib/` never imports React, the DOM, or `components/`. No barrel files. Path aliases `@/…`.
- Dark only, tokens only (Stage 0 ships just the §5 palette as CSS variables in `src/styles/tokens.css`).
- Commit types/scopes come from one shared file read by both commitlint and the PR title check.
- Coverage: `src/lib/**` ≥ 90% lines/branches, overall ≥ 80%.

## Review Focus

1. **Base path with/without trailing slash, hash, or query** (`/pr-preview/pr-12` vs `/pr-preview/pr-12/`,
   `#about`) → always one slash between parts. Pinned by `url.test.ts` (Task 2).
2. **Release PR never gets CI** — a PR opened with `GITHUB_TOKEN` triggers no workflows, so required checks never
   report and the release PR can't merge (the ruleset has no bypass actors). Fixed by using a GitHub App token for
   release-please (Task 9, manual step M4).
3. **Preview and production both push to `gh-pages`** → races/rejected pushes. A shared concurrency group
   would let a queued preview cancel a pending production deploy, so each workflow has its own group and both
   deploy with `force: false` (rebase and retry, `attempt-limit: 5`); production uses `clean-exclude: pr-preview/`.
   Checked on the first real release.
4. **Jekyll on branch-deployed Pages hides `_`-prefixed folders** (Astro's default `_astro/`). Set
   `build.assets: 'assets'` and ship `public/.nojekyll`. Asserted by the smoke suite (assets return 200).
5. **Windows dev machine** — CRLF and hook shebangs. `.gitattributes` forces LF; Prettier `endOfLine: lf`;
   Husky v9 hooks verified on Git Bash.

---

## Pinned versions (verified on npm / GitHub releases, 2026-11-24)

**Runtime:** Node **26.13.1** (current LTS "Lithium") in `.nvmrc` + `engines.node: ">=26.13.1 <27"`;
pnpm **12.23.0** via `packageManager`. (Node 26 has no corepack, so pnpm is installed with `pnpm/action-setup` in CI and
`npm i -g pnpm@12.23.0` locally.)

| Package                               | Version     | Package                             | Version |
| ------------------------------------- | ----------- | ----------------------------------- | ------- |
| astro                                 | 7.4.13      | @astrojs/react                      | 7.1.9   |
| @astrojs/check                        | 0.9.12      | react / react-dom                   | 19.3.1  |
| @types/react / -dom                   | 19.3.0      | @types/node                         | 26.6.6  |
| typescript                            | **6.0.3** ¹ | tailwindcss / @tailwindcss/vite     | 4.3.5   |
| @fontsource-variable/inter            | 5.3.0       | @fontsource-variable/jetbrains-mono | 5.3.0   |
| vitest / @vitest/coverage-v8          | 5.1.1       | jsdom                               | 31.0.1  |
| @testing-library/react                | 16.3.3      | @testing-library/jest-dom           | 8.0.0   |
| @playwright/test                      | 1.65.1      | @axe-core/playwright                | 4.14.0  |
| eslint                                | 10.15.0     | @eslint/js                          | 10.0.1  |
| typescript-eslint                     | 8.74.0      | eslint-plugin-astro                 | 3.2.1   |
| @eslint-react/eslint-plugin           | 5.30.6 ²    | ~~eslint-plugin-react-hooks~~ ³     | —       |
| eslint-plugin-jsx-a11y-x              | 0.2.0 ²     | eslint-plugin-import-x              | 4.18.1  |
| eslint-import-resolver-typescript     | 4.4.5       | eslint-config-prettier              | 10.1.8  |
| globals                               | 17.14.0     | prettier                            | 3.10.1  |
| prettier-plugin-astro                 | 1.1.2       | prettier-plugin-tailwindcss         | 0.8.1   |
| husky                                 | 9.1.7       | lint-staged                         | 17.6.2  |
| @commitlint/cli / config-conventional | 21.2.4      | @commitlint/types                   | 21.2.3  |
| knip                                  | 6.48.0      | dependency-cruiser                  | 18.9.0  |
| @lhci/cli                             | 0.16.1      |                                     |         |

¹ TypeScript 7.0.2 is the latest, but `typescript-eslint` (peer `<6.1.0`) and `@astrojs/check` (peer `^5 || ^6`)
don't support it yet. Pin 6.0.3; Renovate will propose 7 when peers allow. Recorded in ADR-0001.
² `eslint-plugin-react` and `eslint-plugin-jsx-a11y` don't declare ESLint 10 support; use the maintained
ESLint-10-compatible equivalents (`eslint-plugin-astro` accepts `jsx-a11y-x`).
³ Dropped in PR 3: `@eslint-react` 5 implements the rules of hooks itself (duplicate reports otherwise).
Not installed in Stage 0 (added in the stage that uses them, to keep knip green): motion, zustand, lucide-react,
@astrojs/sitemap, @astrojs/rss, @testing-library/user-event.

**Actions (latest release → SHA):**

| Action                               | Version  | SHA                                      |
| ------------------------------------ | -------- | ---------------------------------------- |
| actions/checkout                     | v7.0.1   | 3d3c42e5aac5ba805825da76410c181273ba90b1 |
| actions/setup-node                   | v7.1.0   | 949feb2413d6458794dcd2491c4babbbce0c15c1 |
| pnpm/action-setup                    | v6.1.1   | 73e46992e05b19abd31f2f3c20e0e7370d762115 |
| actions/cache                        | v6.1.0   | 55cc8345863c7cc4c66a329aec7e433d2d1c52a9 |
| actions/upload-artifact              | v7.0.2   | cf430e030ddbb5b0abf93d22962f4752f3646cd9 |
| actions/download-artifact            | v8.0.2   | 9000827ccba6bdab643e8b6fd33ac0654aef8333 |
| actions/github-script                | v9.0.0   | 3a2844b7e9c422d3c10d287c895573f7108da1b3 |
| actions/labeler                      | v7.0.0   | bf12e9b00b37c5c0ca2b87b79b2daf7891dbda13 |
| actions/dependency-review-action     | v5.0.1   | bbc44d14a204704ccc493733616cd1e93a0321ec |
| actions/create-github-app-token      | v3.4.0   | f418cff399f7aef4c2f0ad47e25ca7a6abbdd6fc |
| amannn/action-semantic-pull-request  | v6.1.3   | c5e23b7e584519ee15caa684cf60d056aa9f035f |
| rossjrw/pr-preview-action            | v1.8.2   | 873417d2df72380da1f3978378fb58560bcde976 |
| googleapis/release-please-action     | v5.0.0   | 45996ed1f6d02564a971a2fa1b5860e934307cf7 |
| JamesIves/github-pages-deploy-action | v4.9.0   | fa24774553152dd7873cd16ebd8d959b010c5445 |
| github/codeql-action (init/analyze)  | v4.39.4  | 1bd86f2fdb4b86187fa4059f16f31a3202acc9ea |
| lycheeverse/lychee-action            | v2.9.0   | e7477775783ea5526144ba13e8db5eec57747ce8 |
| EndBug/label-sync                    | v2.3.3   | 52074158190acb45f3077f9099fea818aa43f97a |
| ossf/scorecard-action                | v2.5.0 ⁴ | fa7117db83c52d787ae5a89f350999701505d78e |

Lighthouse runs via the pinned `@lhci/cli` devDependency (no extra action).
⁴ v2.6.0 (`23f22cd…`) was the latest, but its container image's platform manifests are gone from ghcr.io, so
the pull fails. Pinned to v2.5.0; Renovate skips 2.6.0 only.

---

## Workflows

| File                             | Triggers                                                                             | Jobs → actions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Permissions                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ci.yml`                         | `pull_request`, `push: main`, `merge_group`                                          | `quality` (format check, lint, typecheck, knip, depcruise, unit + coverage, `pnpm audit --prod --audit-level high`; coverage artifact + job summary) · `build` (dist artifact, plus a second build with `BASE_PATH=/pr-preview/pr-0/` to catch base-path breakage) · `e2e` matrix `chromium`/`firefox`/`webkit` (Playwright + axe on dist) · `lighthouse` (lhci, mobile budgets) · `links` (lychee offline on dist) · `dependency-review` (PRs only) · **`ci-ok`** aggregator (`if: always()`, fails if any need failed/cancelled) | `contents: read`; dependency-review adds `pull-requests: write` for its comment                  |
| `pr-title.yml`                   | `pull_request` [opened, edited, synchronize, reopened]                               | `validate`: amannn with types/scopes read from the shared convention file; then github-script applies the `type: <x>` label from the title. `label`: actions/labeler (area labels by path)                                                                                                                                                                                                                                                                                                                                         | `pull-requests: write`                                                                           |
| `preview.yml`                    | `pull_request` [opened, reopened, synchronize, closed] (skips forks)                 | `deploy`: build with `BASE_PATH=/pr-preview/pr-<N>/`, rossjrw/pr-preview-action (comments URL, removes on close); then `smoke`: Playwright smoke vs preview URL (waits until the page reports the PR's SHA)                                                                                                                                                                                                                                                                                                                        | `contents: write`, `pull-requests: write`; concurrency per PR; `force: false`                    |
| `release.yml`                    | `push: main`; `workflow_dispatch` input `tag` (rollback)                             | `release-please` (App token, manifest mode) → `deploy` if `release_created` or dispatch: checkout tag, build with `PUBLIC_VERSION` + `PUBLIC_COMMIT_SHA`, JamesIves to `gh-pages` root with `clean-exclude: pr-preview/`, env `github-pages` → `smoke` vs production (failure fails the workflow)                                                                                                                                                                                                                                  | release-please: App token only; deploy: `contents: write`; own concurrency group; `force: false` |
| `codeql.yml`                     | `pull_request`, `push: main`, weekly cron                                            | CodeQL `javascript-typescript`, `build-mode: none`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `security-events: write`, `contents: read`                                                       |
| `scheduled.yml`                  | weekly cron (Mon 14:00 UTC), quarterly cron (1 Jan/Apr/Jul/Oct), `workflow_dispatch` | weekly: smoke vs prod, lychee on live site, lhci vs prod; on failure github-script opens/updates one `ops` issue. quarterly: opens a "Content review YYYY-QN" issue from a template                                                                                                                                                                                                                                                                                                                                                | `contents: read`, `issues: write`                                                                |
| `labels.yml`                     | `push: main` (paths `.github/labels.yml`), `workflow_dispatch`                       | EndBug/label-sync from `.github/labels.yml` (does not delete unknown labels)                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `issues: write`                                                                                  |
| `scorecard.yml` (SPEC §10.6, D3) | `push: main`, weekly cron                                                            | ossf/scorecard-action, upload SARIF, README badge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `security-events: write`, `id-token: write`                                                      |

Required status checks (added by you after PR 4's first run): **`ci-ok`** and **`validate`**. One aggregator
means matrix/job renames never break the ruleset.

---

## `.claude/settings.json` (proposed, committed)

Defense in depth only; the ruleset (PR required, `non_fast_forward`, no bypass) is the real guard.

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "deny": [
      "Bash(git push --force*)",
      "Bash(git push -f*)",
      "Bash(git push * --force*)",
      "Bash(git push * -f*)",
      "Bash(git push * +*)",
      "Bash(git push origin main*)",
      "Bash(git push * HEAD:main*)",
      "Bash(git push * :main*)",
      "Bash(git push * HEAD:refs/heads/main*)",
      "Bash(git push * refs/heads/main*)",
      "Bash(git commit * --no-verify*)",
      "Bash(git push * --no-verify*)",
      "Bash(gh pr merge*)",
      "Bash(gh api * /merge*)",
      "PowerShell(git push --force*)",
      "PowerShell(git push -f*)",
      "PowerShell(git push * --force*)",
      "PowerShell(git push * +*)",
      "PowerShell(git push origin main*)",
      "PowerShell(git push * HEAD:main*)",
      "PowerShell(gh pr merge*)",
      "PowerShell(gh api * /merge*)"
    ]
  }
}
```

`--force-with-lease` is covered by the `--force*` patterns. `--no-verify` is included because CLAUDE.md
forbids skipping hooks. Exact pattern syntax gets verified against the Claude Code docs before committing.

---

## PR split (Stage 0)

Order matters: each PR builds on the previous one, so they merge sequentially. Line counts exclude `pnpm-lock.yaml`.

| #   | Branch                                 | PR title (= squash commit)                                            | Contents                                                                                                                                                                                                                                                                           | ~Lines                                     |
| --- | -------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | `docs/stage-0-plan-and-repo-templates` | `docs(docs): add spec, stage 0 plan, and repo templates`              | `CLAUDE.md`, `docs/SPEC.md`, `docs/github/rulesets/*.json`, this plan, `docs/STATUS.md`, `.gitignore`, `.gitattributes`, `.claude/settings.json`, PR template, issue templates + `config.yml`, `CODEOWNERS`, `LICENSE` (MIT)                                                       | ~450 (spec is ~590 lines of existing text) |
| 2   | `feat/stage-0-astro-scaffold`          | `feat(ui): scaffold astro site with base-path helper`                 | Astro/React/TS/Tailwind, `.nvmrc`, `.npmrc`, `src/` skeleton, `url()` + tests, `build-info.ts`, `features.ts`, `site.ts`, tokens, placeholder page, `public/.nojekyll`, `favicon.svg` (original hex mark), Vitest config, `.env.example`, ADR template + ADR-0001, README skeleton | ~400                                       |
| 3   | `build/stage-0-quality-tooling`        | `build(config): add lint, format, commit, and architecture checks`    | ESLint, Prettier, knip, dependency-cruiser, Husky + lint-staged, commitlint + shared convention file, no-root-paths test, `pnpm check`                                                                                                                                             | ~350                                       |
| 4   | `ci/stage-0-ci-pipeline`               | `ci(ci): add ci, pr title, labeler, and codeql workflows`             | `ci.yml`, `pr-title.yml`, `codeql.yml`, `labels.yml`, `.github/labels.yml`, `.github/labeler.yml`, Playwright config + Stage 0 e2e, `lighthouserc.json`, `lychee.toml`                                                                                                             | ~500                                       |
| 5   | `ci/stage-0-preview-and-release`       | `ci(release): add pr previews, release-please, and production deploy` | `preview.yml`, `release.yml`, release-please config + manifest, smoke suite                                                                                                                                                                                                        | ~350                                       |
| 6   | `ci/stage-0-ops-and-renovate`          | `ci(ci): add scheduled ops checks and renovate config`                | `scheduled.yml`, issue body templates, `renovate.json`, `scorecard.yml` + badge                                                                                                                                                                                                    | ~250                                       |
| 7   | `docs/stage-0-project-docs`            | `docs(docs): add contributing guide, security policy, and runbooks`   | `CONTRIBUTING.md`, `SECURITY.md`, `docs/content-guide.md` (stub), postmortem template, runbooks, README completion, STATUS sign-off + retro                                                                                                                                        | ~400                                       |
| —   | `release-please--branches--main` (bot) | `chore(main): release 0.1.0`                                          | You merge it → tag `v0.1.0` → production deploy                                                                                                                                                                                                                                    | —                                          |

PRs 2 and 3 merge before CI exists; they're verified with local `pnpm check` and noted as such in the PR.
PR 5 is the first PR with a preview URL (Stage 0 "done when" #1).

---

## Files and folders (SPEC §3)

```
.github/  workflows/{ci,pr-title,preview,release,codeql,scheduled,labels[,scorecard]}.yml
          ISSUE_TEMPLATE/{feature,bug,content-update}.yml, config.yml
          issue-bodies/{ops-failure,content-review}.md   # used by scheduled.yml; kept out of ISSUE_TEMPLATE so they don't show in the chooser
          pull_request_template.md  CODEOWNERS  labeler.yml  labels.yml  commit-convention.json
.claude/settings.json      .husky/{pre-commit,commit-msg}
docs/  SPEC.md STATUS.md content-guide.md  plans/stage-0.md
       adr/{0000-template,0001-stack-and-tooling}.md  postmortems/0000-template.md
       runbooks/{local-setup,adding-content,releasing,rolling-back,hotfixing,rotating-public-keys,updating-visual-baselines}.md
       github/rulesets/*.json
public/  .nojekyll  favicon.svg  robots.txt
src/  config/{site,features,build-info}.ts   layouts/BaseLayout.astro   pages/index.astro
      lib/utils/{url,url.test}.ts   styles/{tokens,global}.css   env.d.ts
      (empty dirs from §3 are NOT created until used — git doesn't track them and knip would flag placeholders)
tests/  e2e/placeholder.spec.ts  smoke/smoke.spec.ts  support/fixtures.ts (console-error + pageerror guard)
        static/no-root-paths.test.ts
astro.config.mjs tsconfig.json vitest.config.ts playwright.config.ts eslint.config.js prettier.config.mjs
commitlint.config.mjs knip.config.ts .dependency-cruiser.cjs lighthouserc.json lychee.toml
release-please-config.json .release-please-manifest.json renovate.json
.nvmrc .npmrc .gitignore .gitattributes .env.example package.json pnpm-lock.yaml
README.md CONTRIBUTING.md SECURITY.md LICENSE CLAUDE.md
```

Notes: `.github/commit-convention.json` is the single types/scopes list (commitlint imports it; `pr-title.yml` reads it
with `jq`). `tests/smoke/` and `tests/static/` are subfolders of the existing `tests/` (no new top-level folder).
`CHANGELOG.md` appears with the first release PR (release-please creates it).

---

## Tasks

### Task 1: Planning docs and repo templates (PR 1) — issue #1

- [x] Branch from latest `main`; add uncommitted `CLAUDE.md`, `docs/SPEC.md`, `docs/github/rulesets/*.json`, this plan.
- [x] `.gitignore` = Astro defaults + `CLAUDE.local.md`, `.claude/settings.local.json`, `.env*` with `!.env.example`,
      `coverage/`, `playwright-report/`, `test-results/`, `blob-report/`, `.lighthouseci/`, `.lycheecache`.
- [x] `.gitattributes`: `* text=auto eol=lf`. `.claude/settings.json` as above.
- [x] PR template verbatim from SPEC §10; issue forms with Definition-of-Ready fields (problem, acceptance criteria
      checkboxes, scope/out-of-scope, areas, test approach); `config.yml` with `blank_issues_enabled: false`.
- [x] `CODEOWNERS`: `* @roarceus`. `LICENSE`: MIT (code); README notes content is all rights reserved.
- [x] `docs/STATUS.md` (current stage, next steps, open questions). Open draft PR; mark ready.

### Task 2: Astro scaffold and base-path helper (PR 2) — issues #2, #3, #4

**Interfaces — Produces:**

- `src/lib/utils/url.ts`: `joinBase(base: string, path?: string): string` (pure) and `url(path?: string): string`
  (= `joinBase(import.meta.env.BASE_URL, path)`). Throws `TypeError` for absolute URLs (`https:`, `//`, `mailto:`).
- `src/config/build-info.ts`: `export const buildInfo: { version: string; commit: string }` from
  `import.meta.env.PUBLIC_VERSION` (fallback: `package.json` version) and `PUBLIC_COMMIT_SHA` (fallback `"dev"`).
- `src/config/features.ts`: `export const features = { bootSequence: false, chaosMode: false } as const;`
  `export type FeatureFlag = keyof typeof features;` `export function isEnabled(flag: FeatureFlag): boolean` (tagged `@public` for knip until used).
- `src/config/site.ts`: `site = { name: "Sohan Patil", title: "TODO(sohan)", url: "https://roarceus.github.io" }`.

- [x] Write `url.test.ts` first (TDD), cases:
      `joinBase('/', '') === '/'`; `joinBase('/', 'plain/') === '/plain/'`; `joinBase('/', '/plain/') === '/plain/'`;
      `joinBase('/pr-preview/pr-12/', 'resume.pdf') === '/pr-preview/pr-12/resume.pdf'`;
      `joinBase('/pr-preview/pr-12', '/plain/') === '/pr-preview/pr-12/plain/'`; `joinBase('/', '#about') === '/#about'`;
      `joinBase('/pr-preview/pr-12/', '?q=1') === '/pr-preview/pr-12/?q=1'`;
      `expect(() => joinBase('/', 'https://x.dev')).toThrow(TypeError)`; same for `//cdn.x` and `mailto:a@b.c`.
- [x] Run `pnpm test` → fails (module missing). Implement. Run → passes, `src/lib` coverage 100%.
- [x] `astro.config.mjs`: `output: 'static'`, `site: 'https://roarceus.github.io'`, `base: process.env.BASE_PATH ?? '/'`,
      `trailingSlash: 'always'`, `build.assets: 'assets'`, React integration, Tailwind Vite plugin.
- [x] `tsconfig.json` extends `astro/tsconfigs/strictest` + `noUncheckedIndexedAccess`; aliases `@/components/*`,
      `@/lib/*`, `@/config/*`, `@/layouts/*`, `@/styles/*`, `@/types/*`.
- [x] Placeholder `index.astro` via `BaseLayout`: name, "Site under construction", `v{version} ({commit short})`,
      dark tokens, fluid type, Inter + JetBrains Mono self-hosted, `<meta>` CSP (self only for now), no JS shipped.
- [x] ADR-0001 (stack + TS 6 pin + ESLint-10 plugin choices); ADR template; README skeleton with status.
- [x] Verify: `pnpm build && pnpm preview` at 320/768/1280/2560, plus `BASE_PATH=/pr-preview/pr-0/ pnpm build`
      and check that dist HTML references `/pr-preview/pr-0/assets/…`.

### Task 3: Quality tooling (PR 3) — issues #5, #6, #7

- [x] `.github/commit-convention.json` `{ "types": [11 from CLAUDE.md], "scopes": [17 from CLAUDE.md] }`;
      `commitlint.config.mjs` extends config-conventional with `type-enum`, `scope-enum`, `header-max-length 72`,
      `body-max-line-length 100`. Subject case stays the preset's (lowercase start, acronyms allowed).
- [x] Husky: `pre-commit` → `pnpm exec lint-staged`; `commit-msg` → `pnpm exec commitlint --edit "$1"`.
      Verify: `git commit -m "bad"` is rejected; `feat(nope): x` is rejected (scope).
- [x] ESLint flat config (ts strict-type-checked, astro, @eslint-react, jsx-a11y-x, import-x with
      `no-cycle`, `no-restricted-imports` banning `react`/`react-dom`/`@/components/*` inside `src/lib/**`), Prettier.
- [x] dependency-cruiser rules: `lib` ↛ `components|layouts|pages|react`; `components` ↛ `pages`; no circular.
      No orphan rule (it can't parse `.astro`; knip covers dead files).
- [x] knip config (Astro plugin finds entries; `.css` in `project` so CSS `@import`s count).
- [x] `tests/static/no-root-paths.test.ts`: scans `src/**/*.{astro,ts,tsx,css}` (excluding
      `src/lib/utils/url.ts`) for root-relative `href`/`src`/`action`, `fetch`, CSS `url()`, and
      `Astro.redirect`; fixture cases prove it catches `href="/plain/"`.
- [x] Scripts: `lint`, `format`, `format:check`, `knip`, `depcruise`, and `check` (format check, lint,
      typecheck, knip, depcruise, unit tests with coverage, build). `test:e2e` arrives with Playwright in PR 4.

### Task 4: CI pipeline (PR 4) — issues #8, #9, #10 (CodeQL part)

- [x] `playwright.config.ts`: projects = Chromium/Firefox/WebKit at 1280×800 and 1920×1080; iPhone SE (320 via
      custom viewport, 375), iPhone 15, Pixel 7, iPad (portrait) + iPhone 15 landscape; `retries: CI ? 2 : 0`;
      `webServer` = `pnpm preview`; reduced motion; frozen time via fixture.
- [x] `tests/support/fixtures.ts`: extends `test` to fail on `pageerror` and `console.error`.
- [x] `tests/e2e/placeholder.spec.ts`: shows name and `v\d+\.\d+\.\d+`; no horizontal overflow
      (`scrollWidth <= innerWidth`); axe zero serious/critical.
- [x] `lighthouserc.json`: `staticDistDir: dist`, mobile preset, perf ≥ 0.9, a11y/best-practices/SEO ≥ 0.95.
- [x] Workflows `ci.yml`, `pr-title.yml`, `codeql.yml`, `labels.yml` per the table; `labels.yml`/`labeler.yml` data.
      Shared setup lives in the composite action `.github/actions/setup` (pnpm, Node, frozen install).
- [x] Verify: PR 4's own run is green; then you add required checks (M6). (#21, #22)

### Task 5: Previews and release (PR 5) — issues #11, #12

- [x] `release-please-config.json`: `release-type: node`, `bump-minor-pre-major: true`, changelog sections
      (feat, fix, perf, revert visible; others hidden), `include-component-in-tag: false`; manifest `{ ".": "0.0.0" }`.
      Release PR title `chore(release): release <version>` (the default `chore(main): ...` fails our PR title
      check, which is required); release checklist in the PR footer.
- [x] `preview.yml`, `release.yml` per the table; rollback path: `workflow_dispatch` with `tag` checks out that tag
      and runs the same deploy + smoke jobs. Tag is validated (`vX.Y.Z`, must exist) before building.
- [x] `tests/smoke/smoke.spec.ts` + `playwright.smoke.config.ts` (`SMOKE_BASE_URL`): waits until the live page
      reports the expected version/commit (cache-busted), home renders, every `link/script/img` under the base
      returns 200, no console errors.
- [x] Verify: PR 5 comment shows a working preview URL (after M7), smoke job green. (`/pr-preview/pr-23/`
      served `v0.0.0 (9cadfcd)`; all 15 checks green.)

### Task 6: Ops and Renovate (PR 6) — issues #10 (Scorecard), #13, #14

- [x] `scheduled.yml` per the table; finds an open issue labeled `ops` with the same title before creating a new
      one, and closes it when a later run passes. Lighthouse budgets are shared with CI (`lighthouserc.json` no
      longer names an input; `pnpm lhci` passes `dist/`, the weekly job passes the production URL).
- [x] `renovate.json`: `config:recommended`, `:pinAllExceptPeerDependencies`, `helpers:pinGitHubActionDigests`,
      weekly schedule, grouped non-major updates, automerge devDependency patches only, `dependencies` label,
      semantic commits `chore(deps)`/`ci(deps)`. Node majors disabled (tracked as issues).
- [x] `scorecard.yml` + README badge (D3).
- [x] Verify after merge (`workflow_dispatch` only runs from `main`): `ops` before v0.1.0 should fail and open the
      ops issue (production root is 404), then pass and close it after the release; `content-review` opens one
      issue. Renovate onboarding validates `renovate.json` (M8).

### Task 7: Project docs and sign-off (PR 7) — issue #15

- [x] `CONTRIBUTING.md`, `SECURITY.md` (private vulnerability reporting), runbooks, postmortem template,
      content-guide stub, README complete (Mermaid architecture + CI/CD flow, manual setup list, license note).
- [x] `docs/STATUS.md` sign-off + retrospective; tick this plan.
- [x] After merge: you merge the release PR → verify `https://roarceus.github.io/` shows `v0.1.0`.
      (Live: `v0.1.0 (d7cb6fa)`; release, deploy, and smoke jobs green.)

---

## GitHub items I'll create (after "go")

**Milestones (8):** `Stage 0 — Foundation`, `Stage 1 — Content and plain view`, `Stage 2 — Design system and layout
shell`, `Stage 3 — Terminal engine`, `Stage 4 — Cluster visualization`, `Stage 5 — Boot sequence and polish`,
`Stage 6 — Game layer`, `Stage 7 — Hardening`.

**Labels (synced from `.github/labels.yml` once PR 4 merges; created with `gh label create` before that so issues
can use them):** `type: feat|fix|perf|refactor|style|test|docs|build|ci|chore|revert` (11) ·
`area: content|plain|terminal|commands|cluster|ui|design|game|boot|seo|a11y|perf|ci|deps|release|docs|config` (17) ·
`priority: p0|p1|p2` · `ops` · `dependencies` · `blocked`. Existing default labels are left alone.
(release-please creates its own `autorelease: *` labels.)

**Issues (Stage 0 milestone, each with acceptance criteria + test approach):**

1. Repo templates, working rules, and Claude settings (PR 1)
2. Astro + React + TS + Tailwind scaffold with placeholder page (PR 2)
3. Base-path helper with tests (PR 2)
4. Build info and feature flag config (PR 2)
5. ESLint, Prettier, and typecheck setup (PR 3)
6. Commit conventions: Husky, lint-staged, commitlint, shared convention file (PR 3)
7. Architecture checks: knip, dependency-cruiser, no-root-paths test (PR 3)
8. CI workflow with Playwright, axe, Lighthouse, lychee, dependency review, audit (PR 4)
9. PR title check, labeler, and label sync (PR 4)
10. CodeQL workflow (PR 4)
11. PR preview deploys (PR 5)
12. release-please, production deploy, rollback, and smoke tests (PR 5)
13. Scheduled ops checks and quarterly content review (PR 6)
14. Renovate config (PR 6)
15. Contributing, security policy, ADRs, runbooks, README (PR 7)
16. Projects board and backlog setup (no PR; done via `gh`)

**Projects board:** "roarceus.github.io" (user-level Projects v2) with Status options Backlog → Ready → In progress →
In review → Done, Priority field, linked to the repo. Needs the `project` scope on your `gh` token (M5).

---

## Manual GitHub settings for Sohan (in order)

| #   | When                                             | What                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Before PR 2                                      | Install Node 26.13.1 (e.g. `fnm`/`nvm-windows`; local is 24.14, below `eslint-plugin-astro`'s `^24.16` floor) and `npm i -g pnpm@12.23.0`.                                                                                                                                                                                                                                                                                |
| M2  | Before PR 4                                      | Settings → Actions → General: workflow permissions **Read repository contents** (jobs request writes explicitly, see D2); leave **Allow GitHub Actions to create and approve pull requests** unticked; tick **Require actions to be pinned to a full-length commit SHA**.                                                                                                                                                 |
| M3  | Before PR 4                                      | Settings → Security (Advanced Security): secret scanning + push protection, Dependabot alerts, private vulnerability reporting. Make sure CodeQL **default setup is off** (it conflicts with `codeql.yml`).                                                                                                                                                                                                               |
| M4  | Before PR 5 merges                               | Create a GitHub App for release-please (Contents, Pull requests, Issues: read/write; no webhook; install on this repo only); add repo variable `RELEASE_APP_ID` and secret `RELEASE_APP_PRIVATE_KEY`. Reason: Review Focus #2.                                                                                                                                                                                            |
| M5  | Right after "go"                                 | `gh auth refresh -s project` so I can create the Projects board.                                                                                                                                                                                                                                                                                                                                                          |
| M6  | After PR 4's first CI run                        | Edit ruleset `protect-main` → Require status checks: `ci-ok` and `validate` (source: GitHub Actions). Then re-export to `docs/github/rulesets/protect-main.json` (I'll commit it in the next PR).                                                                                                                                                                                                                         |
| M7  | After PR 5's preview job first pushes `gh-pages` | Settings → Pages → Deploy from a branch → `gh-pages` / `/ (root)`. (Pages was auto-enabled from `main` for this `<user>.github.io` repo; on 2026-11-24 the source was set to "GitHub Actions" to stop failing Jekyll builds. M7 switches it to `gh-pages`.) Then check Settings → Environments → `github-pages` allows `main` (deploy job and rollback dispatch run from `main`). Re-run the preview job so smoke passes. |
| M8  | After PR 6 merges                                | Install the Renovate GitHub App on this repo only; merge its onboarding PR (or close it, since `renovate.json` already exists).                                                                                                                                                                                                                                                                                           |
| M9  | After PR 7 merges                                | Merge the release PR `chore(main): release 0.1.0` → confirm production at `https://roarceus.github.io/`.                                                                                                                                                                                                                                                                                                                  |
| M10 | After production is live                         | UptimeRobot (or similar) monitor for the homepage with email alerts.                                                                                                                                                                                                                                                                                                                                                      |

Not in Stage 0: Web3Forms / GoatCounter keys and `public/resume.pdf` (Stage 1).

## Decisions (2026-11-24)

- **D1:** release-please uses a GitHub App token (`vars.RELEASE_APP_ID`, `secrets.RELEASE_APP_PRIVATE_KEY`).
- **D2:** Default workflow permissions are read-only; "Allow GitHub Actions to create and approve pull requests" stays
  **off** (the App opens release PRs, so `GITHUB_TOKEN` never needs it). Deviation from SPEC §10's manual list,
  recorded in ADR-0001.
- **D3:** `scorecard.yml` + README badge ship in PR 6.
- **D4:** Visual regression config and `test:visual` script ship in Stage 0; first baselines land in Stage 2.
- **D5:** Placeholder page shows name, "Site under construction", and `v<version> (<short sha>)`.
