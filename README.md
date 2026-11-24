# roarceus.github.io

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
| Script | What it does |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Build the static site into `dist/` |
| `pnpm preview` | Serve `dist/` locally |
| `pnpm typecheck` | `astro check` (TypeScript + Astro files) |
| `pnpm test` / `pnpm test:watch` | Unit tests (Vitest) |
| `pnpm test:coverage` | Unit tests with coverage thresholds (`src/lib` ≥ 90%, overall ≥ 80%) |
| `pnpm check` | Typecheck, tests with coverage, and build. Run before every push |

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
Every internal link and asset goes through `url()` from `src/lib/utils/url.ts`, so the site works at
`/` and under `/pr-preview/pr-<N>/`. Full layout and conventions: [SPEC §3](docs/SPEC.md).

## Docs
- [`docs/SPEC.md`](docs/SPEC.md): product and engineering spec (source of truth)
- [`docs/plans/`](docs/plans/): per-stage implementation plans
- [`docs/adr/`](docs/adr/): architecture decision records
- [`CLAUDE.md`](CLAUDE.md): working rules for this repo

## License
Code is [MIT](LICENSE). Site content (text, images, and the resume) is copyright Sohan Patil,
all rights reserved.
