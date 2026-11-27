# CLAUDE.md — working rules for this repo

Project: my (Sohan Patil's) Kubernetes-themed portfolio, which we build together, at https://roarceus.github.io/
Full spec: `docs/SPEC.md` (source of truth). Read it before starting any stage.

## How we work
- Work one stage at a time (SPEC section 11). Stop at the end of each stage, summarize what changed,
  list anything I must do manually, and wait for approval before starting the next stage.
- Before writing code for a stage, post a short plan (files, components, tests) and wait for a "go".
- One PR per stage (or several smaller PRs within a stage if it gets large).
- Run `pnpm check` (lint, typecheck, unit tests, build) before every push. Don't push red.
- Ask instead of guessing when a requirement is unclear. Never invent facts about me: use `TODO(sohan)`.

## Git workflow (strict)
`main` is protected and head branches are auto-deleted after merge.
- Never commit to `main`, never push to `main`, never force-push. All changes go through a PR.
- Every piece of work starts on a brand-new branch cut from the latest `main`:
  `git switch main && git pull --ff-only && git switch -c <type>/<short-description>`
- Never reuse a branch. Once a branch's PR is merged or closed, that branch name is done.
  Follow-up changes, review fixes after merge, or hotfixes get a new branch.
- Branch names: `<type>/<stage-or-scope>-<short-description>`, lowercase, hyphenated,
  using conventional commit types (e.g. `feat/stage-1-content-schemas`, `ci/pr-preview-workflow`,
  `fix/base-path-assets`). Check that the name doesn't already exist locally or on the remote.
- After a PR merges: `git switch main && git pull --ff-only`, delete the local branch,
  and run `git fetch --prune`.
- Before starting a new branch, confirm the working tree is clean and you're not on a stale branch.
- Bot-managed branches are the only exception: don't create, edit, or delete
  `release-please--*` branches, Renovate branches, or `gh-pages` by hand.
  Workflows own them.

## Commit messages (Conventional Commits, enforced by commitlint)
Format:
```
<type>(<scope>): <subject>

<body: what changed and why, wrapped at 100 chars>

<footer: Refs #N / Closes #N / BREAKING CHANGE: ...>
```
- **Types:** `feat`, `fix`, `perf`, `refactor`, `style`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.
- **Scopes** (pick one; add new ones to `commitlint.config` deliberately, not ad hoc):
  `content`, `plain`, `terminal`, `commands`, `cluster`, `ui`, `design`, `game`, `boot`,
  `seo`, `a11y`, `perf`, `ci`, `deps`, `release`, `docs`, `config`.
- **Subject:** imperative mood ("add", not "added"), lowercase start, no trailing period,
  whole header ≤ 72 characters.
- **Body:** required for anything beyond a trivial change. Explain why, not just what.
- **Breaking changes:** `!` after the type/scope (`feat(content)!: ...`) and a `BREAKING CHANGE:` footer.
- One logical change per commit. No "wip", "fix stuff", or "update files" commits.
- Example: `feat(terminal): add tab autocomplete for resource names`

## Pull requests
- **The PR title is the commit that lands on `main`** (squash merge, title only), so it must be a valid
  Conventional Commit and must describe the whole PR. CI enforces this.
  Use `!` in the title for breaking changes, since the PR body does not reach the squash commit.
- Fill in `.github/pull_request_template.md` completely. Delete sections only if truly not applicable,
  and say "N/A" rather than leaving them blank.
- Keep PRs focused and reviewable (aim for under ~500 changed lines excluding lockfiles and generated files).
  Split large stages into several PRs.
- Open PRs as **draft** while work is in progress; mark ready only when CI is green and the preview works.
- After opening, post the preview URL and a short summary in chat, then wait for me to review and merge.
  Never merge PRs yourself unless explicitly asked.

## Context management (avoid context rot)
Project state lives in files, not in conversation history or remembered context.
- **Start of every session:** read this file, `docs/STATUS.md`, and the current `docs/plans/stage-N.md`.
  Read SPEC sections only as needed for the task.
- **Sources of truth:** `docs/SPEC.md` (what), `docs/adr/` (why), `docs/STATUS.md` (where we are),
  `docs/plans/stage-N.md` (task checklist for the current stage), GitHub issues and milestones (work queue).
- **Before coding a stage:** write `docs/plans/stage-N.md` with tasks as checkboxes, create a milestone
  `Stage N — <name>` and one issue per task, and wait for approval. PRs close their issues.
- **While working:** tick plan checkboxes as tasks complete. Use subagents for broad exploration,
  research, or large diffs, and keep only conclusions in the main context.
- **End of every session (or before `/compact`):** rewrite `docs/STATUS.md` (current stage, done, in progress,
  next steps, open questions, known issues; keep it under ~60 lines) and update the plan file.
  These updates go in the current PR, or in a small `docs(docs): update status` PR.
- **Folder-specific conventions** go in a short nested `CLAUDE.md` in that folder (e.g. `src/lib/commands/`),
  not in this file. Keep this file to rules, not details.
- If memory from a previous session conflicts with these files, the files win; flag the conflict.

## Skills and plugins
Use installed skills deliberately. At the start of each stage, say which skills you'll use.
(Run a check in the first session to confirm the exact skill names installed.)
- Superpowers: use its brainstorming and plan-writing skills for each stage's plan, and its TDD
  skill for the command parser, registry, and content helpers. Our stage gates and git workflow
  still apply: stop after each stage and wait for approval, and never work on `main`.
- UI UX Pro Max: use for layout, component design, and accessibility reviews (Stages 2, 4, 5, 7).
  The design tokens and dark-only rule in `docs/SPEC.md` section 5 always win over its defaults.
- claude-mem: fine for continuity, but `docs/SPEC.md` and this file are the source of truth.
  If remembered context conflicts with them, follow the spec and flag the conflict.

## Non-negotiables
- Every internal URL goes through the base-path helper. No hardcoded root paths (PR previews depend on this).
- Follow the project structure and conventions in SPEC section 3 ("Project structure"). Put new code where the
  structure says it goes; don't create new top-level folders or break the dependency direction without an ADR.
  Remove dead code instead of leaving it (knip runs in CI).
- Dark theme only. Use design tokens, never raw hex in components.
- Content lives in `src/content/` and is schema-validated. Components never hardcode portfolio content.
- Everything is reachable without typing: clickable map, command chips, plain view.
- Accessibility: keyboard navigable, visible focus, labeled inputs, `aria-live` terminal output,
  `prefers-reduced-motion` respected, WCAG AA contrast.
- Terminal output must look like real kubectl output.
- Pin exact dependency versions; pin GitHub Actions to commit SHAs; least-privilege workflow permissions.
- No secrets in the repo. No `localStorage` access without try/catch.
- `.gitignore` must always include `CLAUDE.local.md`, `.claude/settings.local.json`, and `.env*`
  (except `.env.example`). Never commit personal or machine-specific Claude Code files.
  `CLAUDE.md`, `docs/SPEC.md`, and a shared `.claude/settings.json` (if created) are committed.

## Lifecycle (full details in SPEC section 10b)
- **Definition of Ready:** don't start an issue until it has acceptance criteria, scope, and a test approach.
  If it's missing them, write them and ask for approval.
- **UI work:** propose the design (states, mobile/tablet/desktop behavior) before building it.
- **Unfinished features** go behind flags in `src/config/features.ts`, default off in production.
- **Self-review every PR** before marking it ready (code-review skill or a review subagent): bugs, edge cases,
  accessibility, security, dead code, spec compliance. Fix findings and summarize the review in the PR.
- **Security:** never add third-party scripts or new external endpoints without updating the CSP and asking first.
  New dependencies need a reason in the PR (what it does, size, license, alternatives considered).
- **Production problems:** rollback first (redeploy the previous tag via `release.yml`), then hotfix through a normal PR,
  then write a postmortem in `docs/postmortems/`.
- **End of each stage:** sign-off summary (what shipped, screenshots, links) and a short retrospective in `docs/STATUS.md`.
- Keep runbooks in `docs/runbooks/` accurate whenever a process they describe changes.

## README and CHANGELOG
- **`README.md` is kept current in the same PR as the change.** Update it whenever a PR changes anything
  it describes: features and commands, architecture (Mermaid diagram), tech stack, scripts, local setup,
  deploy/release flow, project status, or manual setup steps. A PR that makes the README wrong is not done.
- README sections: overview and live link, screenshot/GIF, features, tech stack, architecture diagram,
  getting started, scripts, project structure, CI/CD and release flow, contributing (link), license, status
  (current stage and version, with a link to `docs/STATUS.md`).
- **`CHANGELOG.md` is generated by release-please. Never edit it by hand.** It's built from the
  Conventional Commit PR titles on `main`, so a clear, accurate PR title is how changelog entries get written.
- Release-specific notes (migration steps, manual actions) go in the PR description, and in the README
  if they're ongoing.

## When you make a significant decision
Write an ADR in `docs/adr/NNNN-title.md` (context, decision, consequences) and mention it in the PR.

## Definition of done (every PR)
CI green (all browsers and device sizes), preview URL checked at mobile, tablet, and desktop widths,
tests added or updated, docs updated if behavior changed, no new accessibility violations,
no console errors, no horizontal scroll at any width, Lighthouse budgets met (mobile profile).

## Mobile and responsive (non-negotiable)
Build mobile-first. Every UI change must work from 320px to 2560px and follow SPEC "Responsive and mobile
requirements". When reporting a UI change, state which widths and browsers you checked. If something
can't be verified locally (e.g. real iOS Safari behavior), say so instead of claiming it works.

## Testing and bugs
- Every PR that changes behavior includes tests at the right level (SPEC section 10 "Tests"): unit for `lib/`,
  component tests for islands, e2e for user flows. Coverage thresholds must hold; never lower them to pass CI.
- Never skip, delete, or weaken a failing test to get green. Fix the code, or explain and ask.
- Reproduce before fixing: write a failing test first, then fix, so the bug can't silently return.
- Never mark something done that you haven't verified. If unsure, say what's untested.
