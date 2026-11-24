# Contributing

This is a personal portfolio, so outside contributions are rare, but the same process applies to every
change, including Sohan's and Claude Code's. The working rules live in [`CLAUDE.md`](CLAUDE.md) and the
spec in [`docs/SPEC.md`](docs/SPEC.md).

## Before you start

- **Issues first.** Open one with a template (feature, bug, or content update). An issue is ready to work
  on when it has acceptance criteria, scope and out-of-scope, and a test approach (Definition of Ready,
  SPEC §10b).
- **UI changes** need a short design proposal in the issue first: states and mobile / tablet / desktop
  behavior.
- **Big decisions** (new dependency category, structure change, deviation from the spec) get an ADR in
  [`docs/adr/`](docs/adr/) using [`0000-template.md`](docs/adr/0000-template.md).

## Local setup

See [`docs/runbooks/local-setup.md`](docs/runbooks/local-setup.md). In short: Node 26.13.1, pnpm 12.23.0,
`pnpm install`, `pnpm dev`.

## Branches

`main` is protected: no direct pushes, no force pushes, squash merges only, and the `ci-ok` and
`validate` checks must pass.

```sh
git switch main && git pull --ff-only
git switch -c <type>/<short-description>   # e.g. feat/terminal-autocomplete
```

Never reuse a branch after its PR merges or closes. Don't touch `gh-pages`, `release-please--*`, or
Renovate branches; workflows own them.

## Commits and PR titles

[Conventional Commits](https://www.conventionalcommits.org/), enforced locally by commitlint and in CI by
the PR title check. Types and scopes are listed in
[`.github/commit-convention.json`](.github/commit-convention.json).

```
<type>(<scope>): <subject in lowercase, imperative, ≤ 72 chars total>

<body: what and why, lines ≤ 100 chars>

Closes #123
```

PRs are squash-merged and **the PR title becomes the commit on `main` and the changelog entry**, so make
it describe the whole PR. Use `!` (`feat(content)!: ...`) for breaking changes.

## Pull requests

1. Run `pnpm check` (format, lint, typecheck, knip, dependency rules, unit tests, build) before pushing.
2. Open the PR as a **draft** and fill in every section of the template ("N/A" rather than blank).
3. Every PR gets a live preview at `https://roarceus.github.io/pr-preview/pr-<N>/`. Check it at mobile,
   tablet, and desktop widths for UI changes.
4. Mark it ready when CI is green. Keep PRs under ~500 changed lines (excluding lockfiles).

## Code rules (summary)

- Internal URLs go through `url()` from `src/lib/utils/url.ts`, without a leading slash: `url('plain/')`.
- Dark theme only; design tokens, never raw hex in components.
- Portfolio content lives in `src/content/` (from Stage 1); components never hardcode it.
- `src/lib/` stays free of React, Astro, and the DOM so it's unit-testable.
- Tests at the right level: unit for `lib/`, component tests for islands, e2e for user flows. Reproduce a
  bug with a failing test before fixing it. Never weaken a test to get green.
- Accessibility: keyboard navigable, visible focus, labeled inputs, reduced motion respected, WCAG AA.

## License

By contributing you agree your code is released under the [MIT License](LICENSE). Site content (text,
images, resume) is copyright Sohan Patil and isn't open for reuse.
