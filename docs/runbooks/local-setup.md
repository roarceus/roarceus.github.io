# Runbook: local setup

## Prerequisites

- **Node 26.13.1** (`.nvmrc`). With fnm: `fnm install 26.13.1 && fnm default 26.13.1`, and load fnm in your
  shell profile (PowerShell: `fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression`).
- **pnpm 12.23.0**: `npm i -g pnpm@12.23.0` (Node 26 has no corepack).
- Git with SSH access to the repo.

`engine-strict` is on, so the wrong Node or pnpm version fails `pnpm install` on purpose.

## First run

```sh
git clone git@github.com:roarceus/roarceus.github.io.git
cd roarceus.github.io
pnpm install          # also installs the Husky git hooks
pnpm dev              # http://localhost:4321
```

For e2e tests, install browsers once: `pnpm exec playwright install chromium firefox webkit`.

## Everyday commands

| Task                            | Command                                              |
| ------------------------------- | ---------------------------------------------------- |
| Everything CI checks except e2e | `pnpm check`                                         |
| Unit tests (watch)              | `pnpm test:watch`                                    |
| E2E on one engine               | `pnpm build && pnpm test:e2e --project="chromium-*"` |
| Lighthouse budgets              | `pnpm build && pnpm lhci`                            |
| Build as a PR preview           | `BASE_PATH=/pr-preview/pr-0/ pnpm build`             |

## Windows notes

- **Git Bash rewrites `BASE_PATH=/...` into a Windows path.** Use
  `MSYS2_ENV_CONV_EXCL=BASE_PATH BASE_PATH=/pr-preview/pr-0/ pnpm build`, or PowerShell:
  `$env:BASE_PATH='/pr-preview/pr-0/'; pnpm build`.
- **Git hooks run `pnpm`**, so GUI git clients need Node 26 and pnpm on their PATH.
- **npm registry:** the repo's `.npmrc` pins `https://registry.npmjs.org/`. If your global `~/.npmrc` uses
  `http://`, other projects still fetch over plain HTTP; switch it to `https://`.
- Line endings are LF everywhere (`.gitattributes`); don't override with `core.autocrlf=true`.

## Troubleshooting

- **Type-aware lint errors about `import.meta.env` on a fresh clone:** `src/env.d.ts` references
  `astro/client`; make sure it's still there. `pnpm build` or `pnpm exec astro sync` also generates `.astro/`.
- **Commit rejected by commitlint:** check the type and scope against `.github/commit-convention.json`, a
  lowercase subject, a header ≤ 72 chars, and body lines ≤ 100.
