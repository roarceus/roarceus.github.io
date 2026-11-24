# roarceus.github.io

[![CI](https://github.com/roarceus/roarceus.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/roarceus/roarceus.github.io/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/roarceus/roarceus.github.io/badge)](https://scorecard.dev/viewer/?uri=github.com/roarceus/roarceus.github.io)

Personal portfolio of **Sohan Patil**, themed as an interactive Kubernetes cluster: explore with
`kubectl`-style commands or a clickable cluster map, or switch to a plain, recruiter-friendly view.

**Live:** https://roarceus.github.io/ (coming with v0.1.0)

## Status

Stage 0 — Foundation, in progress. Right now the site is a placeholder page (name and version).
See [`docs/STATUS.md`](docs/STATUS.md) and the [project board](https://github.com/users/roarceus/projects/1).

## Tech stack

Astro 7 (static output) · React 19 islands · TypeScript 6 (strict) · Tailwind CSS 4 with CSS-variable
design tokens · Vitest 5 · self-hosted Inter and JetBrains Mono (Fontsource). Choices and version pins:
[ADR-0001](docs/adr/0001-stack-and-tooling.md).

## Getting started

Requires Node **26.13.1** (see `.nvmrc`) and pnpm **12.23.0**.

```sh
pnpm install
pnpm dev        # http://localhost:4321
```

To build the way a PR preview does (under a sub-path):

```sh
BASE_PATH=/pr-preview/pr-0/ pnpm build
```

On Windows Git Bash, prefix the command with `MSYS2_ENV_CONV_EXCL=BASE_PATH`, or Git Bash rewrites
the value into a Windows path. PowerShell needs `$env:BASE_PATH='/pr-preview/pr-0/'; pnpm build`.

## Scripts

| Script                              | What it does                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `pnpm dev`                          | Start the dev server                                                            |
| `pnpm build`                        | Build the static site into `dist/`                                              |
| `pnpm preview`                      | Serve `dist/` locally                                                           |
| `pnpm typecheck`                    | `astro check` (TypeScript + Astro files)                                        |
| `pnpm lint` / `pnpm lint:fix`       | ESLint (type-aware TypeScript, Astro, React, a11y, import order and cycles)     |
| `pnpm format` / `pnpm format:check` | Prettier (with Astro and Tailwind class sorting)                                |
| `pnpm knip`                         | Unused files, exports, and dependencies                                         |
| `pnpm depcruise`                    | Dependency direction: `lib/` stays free of UI code, React, and Astro; no cycles |
| `pnpm test` / `pnpm test:watch`     | Unit tests (Vitest), including the hardcoded root path check                    |
| `pnpm test:coverage`                | Unit tests with coverage thresholds (`src/lib` ≥ 90%, overall ≥ 80%)            |
| `pnpm check`                        | All of the above in order, then build. Run before every push                    |

## CI

Every PR runs these workflows (all actions pinned to commit SHAs, least-privilege permissions):

| Workflow       | What it checks                                                                                                                                                                                                                                                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`       | Format, lint, typecheck, knip, dependency rules, unit tests + coverage, `pnpm audit` (high, prod deps), build (also under a preview base path), Playwright + axe on Chromium, Firefox, and WebKit across desktop, phone, and tablet sizes, Lighthouse mobile budgets (perf ≥ 90, a11y/best practices/SEO ≥ 95), offline link check, dependency review. `ci-ok` passes only if all of them do. |
| `pr-title.yml` | The PR title is a Conventional Commit with an allowed type and scope, ≤ 72 chars (it becomes the squash commit). Adds `type:` and `area:` labels.                                                                                                                                                                                                                                             |
| `codeql.yml`   | CodeQL security and quality queries for JavaScript/TypeScript (also weekly).                                                                                                                                                                                                                                                                                                                  |
| `labels.yml`   | Syncs repository labels from `.github/labels.yml`.                                                                                                                                                                                                                                                                                                                                            |

Required status checks on `main`: **`ci-ok`** and **`validate`**.

### Dependencies

Renovate opens grouped update PRs on Monday mornings (non-major npm updates together, GitHub Actions
together, both pinned). devDependency patches merge themselves once CI passes; everything else waits for
review. Node majors are not automated (LTS upgrades are tracked as issues). Security fixes open right away.

### Releases and deploys

1. Feature PRs merge to `main` (squash; the PR title becomes the commit and the changelog entry).
2. release-please opens or updates a `chore(release): release x.y.z` PR with the version bump and
   `CHANGELOG.md`. Pre-1.0, each stage is a minor release.
3. Merging that PR creates the tag and GitHub Release and deploys production to the root of `gh-pages`
   (PR previews under `pr-preview/` are kept). Smoke tests then check the live site.
4. **Rollback:** Actions → Release → Run workflow → enter a previous tag (e.g. `v0.1.0`). That tag is rebuilt
   and redeployed, then smoke-tested.

## Commits

Commits follow [Conventional Commits](https://www.conventionalcommits.org/) with the types and scopes in
[`.github/commit-convention.json`](.github/commit-convention.json) (the PR title check reads the same file).
Git hooks (Husky) run on `pnpm install`:

- **pre-commit:** lint-staged runs ESLint `--fix` and Prettier on staged files.
- **commit-msg:** commitlint rejects messages with an unknown type or scope, an uppercase subject, or a
  header over 72 characters. Example: `feat(terminal): add tab autocomplete for resource names`.

## Project structure

```
src/
  config/    site metadata, build info (version + commit), feature flags
  layouts/   page layouts (BaseLayout sets meta tags and the CSP)
  lib/utils/ framework-free helpers, e.g. url() for the base path
  pages/     routes
  styles/    tokens.css (design tokens) and global.css
public/      served as-is (favicon, robots.txt, .nojekyll)
docs/        spec, plans, ADRs, status
```

Every internal link and asset goes through `url()` from `src/lib/utils/url.ts`, written without a leading
slash (`url('plain/')`), so the site works at `/` and under `/pr-preview/pr-<N>/`. A test fails the build on
hardcoded root paths like `href="/plain/"`. Full layout and conventions: [SPEC §3](docs/SPEC.md).

## Docs

- [`docs/SPEC.md`](docs/SPEC.md): product and engineering spec (source of truth)
- [`docs/plans/`](docs/plans/): per-stage implementation plans
- [`docs/adr/`](docs/adr/): architecture decision records
- [`CLAUDE.md`](CLAUDE.md): working rules for this repo

## License

Code is [MIT](LICENSE). Site content (text, images, and the resume) is copyright Sohan Patil,
all rights reserved.
