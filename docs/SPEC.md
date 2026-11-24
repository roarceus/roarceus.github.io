# roarceus.github.io — Project Spec

Personal portfolio for **Sohan Patil**, software engineer (DevOps / cloud / full stack).
Theme: an interactive Kubernetes cluster. Visitors explore my career with `kubectl`-style
commands or by clicking a live cluster map. A plain, recruiter-friendly view is always one click away.

This document is the source of truth. If something here conflicts with a quick instruction in chat,
ask before deviating. Record any significant deviation as an ADR in `docs/adr/`.

---

## 1. Goals and non-goals

**Goals**
- Memorable, original, interactive UI that signals "this person knows cloud-native."
- Zero friction for non-technical visitors: every piece of content reachable without typing.
- Production-grade repo: CI/CD, PR previews, semantic versioning, tests, budgets, docs.
- Content is data. Updating experience, projects, or updates never requires touching components.
- Fast, accessible, SEO-friendly. Plain content is pre-rendered HTML.

**Non-goals**
- No backend, no database, no server runtime (GitHub Pages is static).
- No light theme. Dark only.
- No CMS. Content is edited as YAML/Markdown in the repo.

---

## 2. Hosting and URLs

- Repo: `roarceus/roarceus.github.io` (public). Site: `https://roarceus.github.io/`.
- Production lives at the root of the `gh-pages` branch.
- PR previews live at `https://roarceus.github.io/pr-preview/pr-<N>/` on the same branch.
- The old site (`roarceus/portfolio`, served at `/portfolio/`) is a separate repo and is left untouched.

**Base path rule (critical):** builds read `BASE_PATH` from the environment (default `/`).
Preview builds set it to `/pr-preview/pr-<N>/`. Every internal link, asset, font, image, and
fetch must go through Astro's `import.meta.env.BASE_URL` (wrap it in a small `url()` helper).
Never hardcode a leading `/`. Add a test or lint check that catches hardcoded root paths.

---

## 3. Stack

Use the latest **stable** version of each tool at the time of setup, verify it, and pin exact versions.
Package manager: **pnpm**. Node: current **LTS**, pinned in `.nvmrc` and `package.json#engines`.

| Concern | Choice | Notes |
|---|---|---|
| Framework | Astro (static output) | Pre-rendered pages; interactive parts as React islands |
| Interactive UI | React + TypeScript (strict) | Islands only: terminal, cluster map, game layer |
| Styling | Tailwind CSS + CSS variables | Design tokens as CSS variables (section 5) |
| Animation | Motion (Framer Motion successor) | Respect `prefers-reduced-motion` everywhere |
| Cluster map | Custom SVG + Motion | Fallback to React Flow only if layout gets unmanageable (write an ADR) |
| Terminal | Custom React component | Not xterm.js: we need clickable output, links, and accessibility |
| State (islands) | Zustand (or React context if it stays small) | Shared state between terminal, map, and detail panel |
| Content | Astro content collections, YAML + Markdown, Zod schemas | Build fails on invalid content |
| Fonts | JetBrains Mono (system/terminal), Inter (reading), self-hosted via Fontsource | No external font requests |
| Icons | Lucide | |
| Contact form | Web3Forms (or Formspree) | Access key is public-safe; keep it in config, not hardcoded in components |
| Analytics | GoatCounter | Privacy-friendly, no cookies. Track page views plus command usage as events |
| OG images | Generated at build (e.g. Satori-based Astro integration) | One per page/project |
| RSS | `@astrojs/rss` for updates | |
| Sitemap | `@astrojs/sitemap` | Exclude `pr-preview/` |

### Project structure
Production-grade layout. New top-level folders or changes to this structure need an ADR.

```
.
├── .github/
│   ├── workflows/              # ci, pr-title, preview, release, codeql
│   ├── ISSUE_TEMPLATE/
│   ├── pull_request_template.md
│   ├── CODEOWNERS
│   └── labeler.yml
├── .claude/settings.json       # shared Claude Code permissions (committed)
├── .husky/                     # pre-commit, commit-msg
├── docs/
│   ├── SPEC.md  STATUS.md  content-guide.md
│   ├── plans/                  # stage-N.md
│   ├── adr/                    # NNNN-title.md
│   └── github/rulesets/        # exported ruleset JSON
├── public/                     # resume.pdf, favicon, robots.txt (served as-is)
├── src/
│   ├── assets/                 # images processed by astro:assets
│   ├── components/
│   │   ├── ui/                 # primitives: Button, Badge, StatusPill, Panel, Table
│   │   ├── layout/             # TopBar, Footer, Shell, BottomSheet
│   │   ├── plain/              # plain-view sections (Astro components)
│   │   ├── cluster/            # React island: map, nodes, pods, detail panel
│   │   ├── terminal/           # React island: input, output renderer, chips
│   │   └── game/               # React island: chaos mode, badges, easter eggs
│   ├── config/                 # site.ts: metadata, links, public keys (Web3Forms, GoatCounter)
│   ├── content/                # collections + config.ts (Zod schemas)
│   ├── layouts/                # Astro page layouts
│   ├── lib/                    # framework-agnostic TypeScript (no React, no DOM)
│   │   ├── commands/           # registry + one module per command
│   │   ├── parser/             # command parser
│   │   ├── content/            # content query helpers (the only way components read content)
│   │   ├── state/              # stores shared by islands
│   │   └── utils/              # url()/base path, dates, formatting
│   ├── pages/                  # routes
│   ├── styles/                 # tokens.css, global.css
│   └── types/
├── tests/
│   ├── e2e/                    # Playwright specs
│   ├── visual/                 # screenshot baselines
│   └── fixtures/
├── astro.config.mjs  tsconfig.json  playwright.config.ts  vitest.config.ts
├── eslint, prettier, commitlint, lighthouserc, knip, dependency-cruiser configs
├── release-please-config.json  .release-please-manifest.json  renovate.json
├── .nvmrc  package.json  pnpm-lock.yaml  .gitignore  .env.example
└── README.md  CHANGELOG.md  CONTRIBUTING.md  LICENSE  CLAUDE.md
```

**Conventions**
- Components: `PascalCase.tsx` / `PascalCase.astro`. Everything else: `kebab-case.ts`.
- Unit tests sit next to the code (`parser.test.ts`); e2e and visual tests live in `tests/`.
- Path aliases (`@/components`, `@/lib`, `@/config`, ...); no deep `../../../` imports.
- **Dependency direction:** `pages` → `layouts`/`components` → `lib` → `types`. `lib/` never imports from
  `components/`, React, or the DOM, so all logic is unit-testable. Components read content only through `lib/content`.
- No barrel files that re-export whole folders (they hurt tree-shaking); small, explicit exports.
- One component or module per file; files stay focused (split anything growing past ~250 lines).
- Config values (links, keys, site metadata) live in `src/config/`, never inline in components.

**Enforced in CI**
- **dependency-cruiser** (or ESLint `import/no-restricted-paths`): enforces the dependency direction and blocks circular imports.
- **knip**: fails on unused files, exports, and dependencies, so dead code can't accumulate.
- TypeScript strict with `noUncheckedIndexedAccess`; ESLint and Prettier as above.

---

## 4. Information architecture

| Route | Purpose |
|---|---|
| `/` | Cluster dashboard (default). Pre-rendered hero + content fallback, islands hydrate on top |
| `/plain/` | Full plain portfolio: one scrollable, print-friendly page with all sections |
| `/projects/<slug>/` | Static project detail page (shareable, SEO) |
| `/updates/` | Updates list; `/updates/<slug>/` per entry; `/rss.xml` feed |
| `/resume.pdf` | Resume download (file supplied by Sohan in `public/`) |
| `/404` | Themed: `Error from server (NotFound): page "<path>" not found` + links home |

**Always-visible simple controls** (top bar on every page): name, `Plain view` / `Cluster view` toggle,
`Resume`, `Contact`. These never hide behind interaction.

**Mobile (< 768px):** default to the plain view layout on `/`, with a prominent `Launch cluster` button.
The cluster experience on mobile is tap-first; typing is optional.

**No-JS:** `/` must show the hero and links to all sections without JavaScript.

### Responsive and mobile requirements
Mobile is a first-class target, not an afterthought. Build mobile-first and scale up.

- **Supported widths:** every page works from **320px** to **2560px** wide, portrait and landscape.
  Reference breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536` (Tailwind defaults).
- **Layouts per size:**
  - < 768px: single column. `/` shows the plain layout with a `Launch cluster` button. The cluster mode is
    tap-first: map on top, detail panel as a bottom sheet, terminal collapsed to a command-chip bar with an
    optional expandable input.
  - 768–1023px (tablet): map and detail panel stacked; terminal docked and collapsible.
  - ≥ 1024px: full dashboard (map + detail panel side by side, terminal docked at the bottom).
- **No horizontal page scroll at any width.** Wide content (tables, YAML, code) scrolls inside its own container.
  Terminal tables reflow or switch to a stacked "card" format on narrow screens.
- **Touch:** tap targets ≥ 44×44px with adequate spacing; nothing depends on hover (hover only enhances);
  no tiny drag targets; map supports tap to select and does not hijack page scrolling.
- **Mobile browser quirks (handle explicitly):**
  - Inputs use ≥ 16px font size so iOS Safari doesn't zoom on focus.
  - Use `dvh`/`svh` units (not `100vh`) for full-height layouts, so browser toolbars don't cut content.
  - Respect safe-area insets (`env(safe-area-inset-*)`) for notches and home indicators.
  - The on-screen keyboard must not cover the terminal input or the contact form fields.
  - Disable double-tap zoom delays via proper `touch-action`; never disable pinch zoom.
- **Performance on mobile:** test against Lighthouse's mobile profile (throttled CPU and network).
  Islands hydrate lazily (`client:visible` / `client:idle`); the plain layout works before any JS loads.
- **Images and fonts:** responsive images (`astro:assets`, modern formats, explicit width/height to avoid layout shift);
  `font-display: swap`; preload only the critical font. CLS < 0.1.
- **Text:** fluid type scale (`clamp()`), readable line lengths (~60–80 characters), and layouts that survive
  200% browser zoom and long words (e.g. long tech names, URLs).

---

## 5. Design system

Dark only. Clean, credible, "real tool" look (think Lens, Grafana, k9s), not hacker-movie neon.
No glow effects, no heavy gradients. One accent color, used with restraint.

**Starting palette** (tune freely, but every text/background pair must pass WCAG AA; document final values):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0A0E14` | Page background |
| `--surface-1` | `#111722` | Panels, cards |
| `--surface-2` | `#18202E` | Raised elements, terminal |
| `--border` | `#243044` | Hairlines |
| `--text` | `#E6EDF3` | Primary text |
| `--text-muted` | `#8B98A9` | Secondary text |
| `--accent` | `#326CE5` | Kubernetes blue: selection, focus, links |
| `--accent-soft` | `#5B8DEF` | Accent on dark surfaces where `#326CE5` is too dim for text |
| `--status-running` | `#3FB950` | Running / success |
| `--status-pending` | `#D29922` | Pending / in progress |
| `--status-failed` | `#F85149` | CrashLoopBackOff / error |
| `--status-completed` | `#8B98A9` | Completed |

**Status colors are the site's state language.** Use them consistently: project status, cluster health,
chaos mode, form validation, build badges.

**Typography:** JetBrains Mono for anything "system" (labels, terminal, tables, metadata, nav).
Inter for reading content (descriptions, about, updates). Keep a clear type scale in tokens.

**Motion:** purposeful and quick (150–300ms for UI, longer only for the boot sequence).
With `prefers-reduced-motion`, skip the boot animation and use fades or no animation.

**Trademarks:** the Kubernetes name and logo belong to the Linux Foundation / CNCF. Use "Kubernetes" and
`kubectl` descriptively, but never use the official Kubernetes logo (the helm wheel) or a close copy as the
site's logo, favicon, or branding. Design an original mark (e.g. a hexagon/node motif with Sohan's initials).
Same for cloud provider logos: only in a skills/tech context, never as branding.

**Accuracy matters:** terminal output must look like real `kubectl` output (column alignment,
uppercase headers, `AGE` style values, realistic error messages). Infra engineers will notice.

---

## 6. Content model

All content lives in `src/content/` and is validated by Zod schemas in `src/content/config.ts`
(the "CRDs"). Both views (plain and cluster) render from the same data.

Collections (adjust fields as needed, but keep this shape):

- **profile** (single file): name, title, location, tagline, about (markdown), links (GitHub, LinkedIn, email), resume path, open-to-work flag.
- **experience**: slug, org, role, type (`work` | `education` | `teaching`), location, start, end (or `present`), summary, highlights (list, each may include a metric), tech (list), node label (e.g. `capgemini`).
- **education**: slug, school, degree, field, start, end, location, highlights.
- **projects**: slug, name, tagline, description (markdown), status (`running` = active, `completed`, `pending` = planned), node (which experience/education node it "runs on"), tech, links (repo, demo), highlights, featured flag, order.
- **skills**: category, items with optional proficiency level (used by `kubectl top skills`).
- **certifications**: name, issuer, status (`issued` | `in-progress`), date, credential URL.
- **achievements**: title, date, description, link.
- **updates** (Markdown files): title, date, tags, summary, body. Sohan will keep posting these.

### Content sourcing (Stage 1)
1. Read the old portfolio repo `roarceus/portfolio` on GitHub and extract its content.
2. Map it into the collections above.
3. Apply the **current facts** below, which override anything outdated in the old site.
4. Write `docs/content-review.md` listing every item that is outdated, missing, vague, or needs a number,
   so Sohan can fill gaps. Use clearly marked `TODO(sohan)` placeholders, never invented facts.

### Current facts (source of truth)
- ~3 years of software engineering experience across the stack. Main languages TypeScript and Python, some Java; React.
- **Capgemini** (joined 2021, India): software engineer on web applications for an OCT (optical coherence tomography) medical imaging system used in heart procedures. Built Node.js APIs and React dashboards showing patient and physician data, heart imaging data, and DICOM images with filtering, including a real-time monitoring dashboard. Large images lived in object storage; the database held metadata and pointers. Results: ~40% faster data retrieval (Redis caching + PostgreSQL indexing) and ~25% lower API latency (sending only new readings and smaller per-update payloads).
- **Northeastern University**: Master's (focus on DevOps and application development). Graduated spring 2026.
- **MasterControl**: DevOps Engineer co-op. Projects there include an AI agent framework for Gradle rollouts (LangGraph + Claude Code) and a GitOps deployment bot (GitHub App / Probot).
- **Teaching assistant** for a cloud computing course at Northeastern for one semester (after the co-op).
- Currently: based in Santa Clara, CA (Bay Area, moved August 2026), job searching, and studying for the **CKA** (certification status: in progress).
- Notable projects to include (details from the old repo, project READMEs, and Sohan): **askTRACE** (Kafka / GKE / RAG, GCP Terraform, Jenkins CI), **AWS infrastructure automation with Terraform** (webapp + serverless, CI/CD), **PromotionBot** (GitOps deployment bot), **BoringBot** (AI agent framework), **SafeHaven** (MERN refugee portal).
- Exact dates, metrics, links, and contact details not listed here: `TODO(sohan)`.

---

## 7. Cluster metaphor and command reference

### Mapping
- **Cluster** = Sohan's career. Name: `sohan-cluster`.
- **Nodes** = organizations/eras: `capgemini`, `northeastern`, `mastercontrol` (labels: `role=work|education|teaching`).
- **Pods** = projects, scheduled on the node where they were built. Pod status mirrors project status.
- **Namespaces** = sections: `career`, `projects`, `skills`, `updates`.
- Real achievements = `achievements` resource. Game unlocks = **badges** (different word on purpose).

### Commands (v1)
`k` is an alias for `kubectl`. Unknown commands get a realistic error plus a suggestion (`did you mean ...?`).

| Command | Result |
|---|---|
| `help`, `kubectl --help` | Friendly command list with clickable entries |
| `kubectl cluster-info` | About me |
| `kubectl get nodes` | Career eras table; map highlights nodes |
| `kubectl get experience` | Roles table |
| `kubectl describe node <name>` | Role details in the detail panel |
| `kubectl get pods -n projects` / `kubectl get projects` | Projects table |
| `kubectl describe pod <slug>` | Project details |
| `kubectl get pods -o wide` | Projects with node and tech columns |
| `kubectl get <resource> -o yaml` | Raw YAML of the content entry |
| `kubectl top skills` | Skills with usage bars |
| `kubectl get certificates` | Certifications (CKA shows `in-progress`) |
| `kubectl get achievements` | Achievements |
| `kubectl logs updates` (`-f` streams them in) | Latest updates |
| `kubectl get events` | Combined timeline (roles, projects, updates), newest first |
| `kubectl apply -f contact.yaml` | Contact form styled as a YAML manifest |
| `kubectl port-forward github` / `linkedin` | Opens the link |
| `kubectl config use-context plain` | Switches to plain view |
| `kubectl version` | Site version from `package.json` + build commit SHA |
| `kubectl get all` | Overview of everything |
| `clear`, Ctrl+L | Clear terminal |

### Terminal behavior
- History (Up/Down), Tab autocomplete for commands, resources, and slugs.
- Clickable output: names in tables open details; links are real links.
- Command chips under the input (`get experience`, `get pods -n projects`, `top skills`, `help`); clicking runs the command visibly.
- Clicking anything on the map types and runs the equivalent command in the terminal (shows visitors the CLI).
- Output region uses `aria-live="polite"`; input is a real labeled `<input>`; full keyboard support.

### Architecture
- `src/lib/commands/`: a registry where each command is one module (`name`, `aliases`, `parse`, `run`, `complete`).
- Parser is a pure function, heavily unit-tested.
- Commands return structured results (table, detail, yaml, error, action) that a renderer turns into UI, so output is testable without the DOM.

---

## 8. Game layer (Stage 6)

- **Self-healing:** `kubectl delete pod <slug>` makes the pod terminate and restart (`Terminating` → `ContainerCreating` → `Running`) with the ReplicaSet recreating it.
- **Chaos mode:** a toggle (and `kubectl chaos start`) breaks a random pod (`CrashLoopBackOff`, `ImagePullBackOff`, `OOMKilled`). The visitor fixes it with real-ish troubleshooting (`describe`, `logs`, `rollout restart`), with a hint system. Mini CKA-style puzzles.
- **Badges:** unlock for exploring (first command, viewed all nodes, survived chaos, found an easter egg). Show "cluster explored: N%". Persist in `localStorage` (wrapped in try/catch).
- **Easter eggs:** `sudo` (polite refusal), `rm -rf /` (admission webhook denies it), `kubectl get secrets` (playful refusal), `vim` (the exit joke), `k9s`, `whoami`, `exit` (cluster stays up).
- Keep the humor light. The content is the point; the game is the garnish.

---

## 9. Boot sequence (Stage 5)

On first load of `/` (not on mobile, not with reduced motion): about 2–3 seconds of nodes joining
(`NotReady` → `Ready`) and pods starting, with a few terminal lines. Skippable with any key or click,
and skipped on repeat visits within a session. The page must be usable immediately: content is never
blocked behind the animation. After boot, auto-select the most recent role so passive visitors see content.

---

## 10. Repo, quality, and CI/CD

### Repo conventions
- Trunk-based. `main` is protected (no direct commits or pushes) and head branches are deleted after merge.
  Every change starts on a new branch cut from the latest `main` (`feat/...`, `fix/...`, `chore/...`, `docs/...`, `ci/...`);
  branches are never reused. Full rules in `CLAUDE.md` → Git workflow.
- The branch ruleset must target `main` only. `gh-pages` is written by workflows (production and PR previews),
  so it must not require PRs or status checks, and must not be auto-deleted.
- **Conventional Commits** everywhere. PRs are squash-merged, so the **PR title** must be a valid conventional commit (enforced in CI).
- Docs: `README.md` (overview, architecture diagram in Mermaid, local dev, deploy flow), `CONTRIBUTING.md`, `CHANGELOG.md` (generated), `docs/adr/` (one ADR per major decision, starting with the stack choice), `docs/content-guide.md` (how to add an update/project).
- License: MIT for code; content (text, images, resume) all rights reserved. State this in the README.

### Commit and PR format
- **commitlint** (`@commitlint/config-conventional` base) with `type-enum` and `scope-enum` matching
  the lists in `CLAUDE.md`, header max 72, body max line length 100. Runs on `commit-msg` via Husky.
- **PR title check** (`amannn/action-semantic-pull-request`, SHA-pinned) using the **same** types and scopes,
  so a PR title can never pass CI with a type or scope commitlint would reject. Keep the lists in one shared
  config file that both read, or add a test that they match.
- **`.github/pull_request_template.md`** with this structure:

  ```markdown
  ## Summary
  <!-- What does this PR do, and why? 1–3 sentences. -->

  ## Stage
  <!-- e.g. Stage 1 — Content and plain view (SPEC §11), or "N/A" -->

  ## Type of change
  - [ ] feat — new feature
  - [ ] fix — bug fix
  - [ ] perf / refactor / style
  - [ ] docs / test / build / ci / chore
  - [ ] Breaking change (title uses `!`)

  ## Changes
  <!-- Bulleted list of the notable changes. -->

  ## Screenshots / preview
  <!-- Preview URL (posted by the preview bot) and before/after screenshots for UI changes. -->

  ## How was this tested?
  <!-- Unit, e2e, manual steps. -->

  ## Checklist
  - [ ] PR title is a valid Conventional Commit (it becomes the squash commit)
  - [ ] `pnpm check` passes locally
  - [ ] Tests added or updated
  - [ ] Preview checked on desktop and mobile widths
  - [ ] No hardcoded root paths (base-path helper used)
  - [ ] Accessibility: keyboard, focus, contrast, reduced motion
  - [ ] README updated if this changes anything it describes
  - [ ] Docs / ADR / STATUS updated if behavior or architecture changed
  - [ ] CHANGELOG not edited by hand (release-please owns it)

  ## Related
  <!-- Closes #N / Refs #N / ADR links -->
  ```
- **Issue templates** in `.github/ISSUE_TEMPLATE/`: `feature.yml`, `bug.yml`, `content-update.yml`
  (for new updates, projects, or role changes), plus `config.yml` disabling blank issues.
- **Labels:** auto-apply labels from the PR title type and changed paths (`actions/labeler`, SHA-pinned),
  e.g. `type: feat`, `area: terminal`, `area: content`. Keep the label definitions in the repo.
- **CODEOWNERS:** `* @roarceus`.

### Local quality gates
- TypeScript strict, ESLint (with Astro, React, a11y, and import plugins), Prettier (with Astro plugin).
- Husky + lint-staged on pre-commit; commitlint on commit-msg.
- Scripts: `dev`, `build`, `preview`, `lint`, `format`, `typecheck`, `test`, `test:e2e`, `check` (all of the above).

### Tests
- **Vitest**: command parser, command registry, content helpers, base-path helper.
- **Playwright**: plain view renders all sections; top-bar controls work; terminal runs core commands; clicking a node updates the panel; mobile viewport defaults to plain layout; 404 page.
  - **Browser and device matrix** (Playwright projects, run in CI on every PR): Chromium, Firefox, and WebKit
    on desktop (1280×800 and 1920×1080), plus emulated iPhone SE (320/375 wide), iPhone 15, Pixel 7, and iPad,
    in portrait and at least one landscape case.
  - **Responsive assertions on every key page and width:** no horizontal overflow
    (`document.documentElement.scrollWidth <= window.innerWidth`), top-bar controls visible and tappable,
    no overlapping or clipped interactive elements.
  - **Visual regression:** Playwright screenshot comparisons for key pages at mobile, tablet, and desktop widths,
    with baselines committed. Intentional UI changes update baselines in the same PR.
  - **Runtime errors fail tests:** every e2e test fails on any uncaught exception or `console.error`.
- **Component tests**: Vitest + React Testing Library (jsdom) for the islands: terminal input, history, autocomplete,
  output rendering, chips, map selection, detail panel, bottom sheet, contact form validation and error states.
  Query by role and label (as a user would), not by class names.
- **Content tests**: schema validation runs at build, plus tests that every project's `node` points to a real
  experience entry, slugs are unique, dates are ordered, and all internal links resolve.
- **Coverage thresholds** (enforced in CI, Vitest + v8): `src/lib/**` ≥ 90% lines and branches; overall ≥ 80%.
  Coverage report uploaded as a CI artifact and summarized in the PR.
- **Keyboard and a11y e2e**: full keyboard-only flows (tab through top bar, run a command, open a node,
  submit contact form), visible focus, and correct focus return when panels and sheets close.
- **Contact form**: network calls mocked in tests (success, validation error, server error, offline).
- **Post-deploy smoke tests**: after each PR preview deploy and each production deploy, a small Playwright suite
  runs against the live URL (pages load, assets resolve under the base path, no console errors, resume link works).
  A failed production smoke test fails the release workflow visibly.
- **Determinism**: tests freeze time, seed any randomness (chaos mode), and disable animations, so results never
  depend on timing. No arbitrary `waitForTimeout`; wait on state.
- **Flaky tests**: retries allowed in CI only (max 2) and reported. A test that flakes gets fixed or quarantined
  with an issue, never silently retried forever.
- **axe** (via Playwright) on key pages: zero serious/critical violations.
- **Lighthouse CI** with budgets: Performance ≥ 90 (mobile), Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95. The plain view ships minimal JS; islands load lazily.
- **Link check** (lychee) on the built site.

### GitHub Actions workflows
Pin every third-party action to a full commit SHA (with the version in a comment). Use least-privilege `permissions:` per job. Use concurrency groups.

1. **`ci.yml`** (pull_request, push to main): install (cached pnpm), lint, typecheck, unit tests, build, Playwright + axe, Lighthouse CI, link check. These are the required status checks.
2. **`pr-title.yml`**: validate PR title as a conventional commit.
3. **`preview.yml`** (pull_request opened/synchronize/reopened/closed): build with `BASE_PATH=/pr-preview/pr-<N>/` and deploy with `rossjrw/pr-preview-action` to `gh-pages` under `pr-preview/`. It comments the URL on the PR and removes the preview when the PR closes. Skip for PRs from forks.
4. **`release.yml`** (push to main): run **release-please** (manifest mode). It maintains a release PR with the changelog and version bump. When that PR is merged, it creates the tag and GitHub Release, and **the same workflow then builds and deploys production** in a job conditioned on `release_created`.
   - Important: releases created with `GITHUB_TOKEN` do not trigger other workflows, so the deploy must live in this workflow, not in a separate `on: release` workflow.
   - Production deploy writes to the root of `gh-pages` (e.g. `JamesIves/github-pages-deploy-action` with `clean-exclude: pr-preview/`) so it never wipes previews. Use the `github-pages` environment for the deploy job.
   - Inject the version and commit SHA at build time (used by `kubectl version` and the footer).
5. **`codeql.yml`**: CodeQL for JavaScript/TypeScript.
6. Optional: **OpenSSF Scorecard** workflow with badge.

### Versioning
- SemVer via release-please. Each stage ships as a minor release (`0.1.0`, `0.2.0`, ...). Stage 7 ships `1.0.0` (use a `Release-As: 1.0.0` commit footer).
- Production only changes when a release PR is merged. That merge is the promotion step.

### Dependencies and security
- **Renovate** (`renovate.json`): grouped minor/patch updates, weekly schedule, automerge for dev-dependency patches only if CI passes, pin action digests.
- Dependabot security alerts on. No secrets in the repo. Public keys (Web3Forms, GoatCounter site code) live in a config file.

### Manual setup Sohan does in GitHub (list these in the README; Claude Code cannot do them all)
- Create the public repo `roarceus.github.io`.
- Settings → Pages → Source: **Deploy from a branch**, branch `gh-pages`, folder `/`.
- Settings → Actions → General → Workflow permissions: read and write; allow GitHub Actions to create and approve pull requests (needed by release-please).
- Branch ruleset on `main`: require PRs, require status checks from `ci.yml` and `pr-title.yml`, require linear history, squash merge only, block force pushes.
- Install the Renovate GitHub App on the repo (after Stage 0 adds `renovate.json`).
- Settings → Security: enable secret scanning with push protection, Dependabot alerts, and private vulnerability reporting.
- Create a free uptime monitor (e.g. UptimeRobot) for `https://roarceus.github.io/` once production is live.
- Create accounts and add keys: Web3Forms, GoatCounter.
- Add `public/resume.pdf`.

---

## 10b. Software lifecycle and operations

The project follows a full company-style lifecycle. Every phase below has an owner artifact in the repo.

### Plan
- **Backlog:** GitHub issues from templates, grouped by stage milestones, tracked on a free GitHub Projects board
  (columns: Backlog → Ready → In progress → In review → Done). Labels for type, area, and priority (`p0`–`p2`).
- **Definition of Ready** (before an issue is worked on): clear problem statement, acceptance criteria as
  checkboxes, scope and out-of-scope, affected areas, and a test approach. Issue templates prompt for these.
- **Definition of Done:** see `CLAUDE.md`. An issue closes only when its acceptance criteria are met and verified.

### Design
- **ADRs** for architecture and tooling decisions (`docs/adr/`, with a template and status: proposed/accepted/superseded).
- **UI design review:** for UI-heavy work (Stages 2, 4, 5, 6), post a design proposal first (layout description,
  states, mobile/tablet/desktop behavior, and a quick static mockup or screenshots in the PR or issue) and get
  approval before full implementation.
- **Feature flags:** unfinished or experimental features ship behind build-time flags in `src/config/features.ts`
  (e.g. `chaosMode`, `bootSequence`), default off in production until approved. Flags are removed once a feature is stable.

### Build
- Branching, commits, and PRs: `CLAUDE.md` rules. Small PRs, drafts while in progress.
- **Self-review before "ready for review":** Claude Code reviews its own diff (use the code-review skill or a review
  subagent) for bugs, edge cases, accessibility, security, naming, dead code, and spec compliance, fixes findings,
  and summarizes the review in the PR.

### Verify
- Testing: section 10 "Tests". Preview deploy per PR. Manual check of the preview on a real phone for UI changes.

### Secure
- **Secret scanning with push protection**, **Dependabot security alerts**, and **private vulnerability reporting**
  enabled (manual settings).
- **Dependency review** on every PR (`actions/dependency-review-action`, SHA-pinned): fails on new high/critical
  vulnerabilities and on disallowed licenses (allow MIT, Apache-2.0, BSD, ISC, and similar permissive licenses).
- **CodeQL** (section 10) and `pnpm audit` in CI (fail on high/critical in production dependencies).
- **Content Security Policy** via `<meta http-equiv="Content-Security-Policy">` (GitHub Pages can't set headers):
  self-hosted scripts, styles, and fonts only, plus the analytics and contact-form endpoints. No inline event handlers.
- External links use `rel="noopener noreferrer"`. No third-party scripts beyond analytics.
- `SECURITY.md` explaining how to report a vulnerability.

### Release
- release-please (section 10) produces the version, changelog, tag, and GitHub Release.
- **Release checklist** in the release PR description (auto-filled template): CI green, preview verified,
  smoke tests passed, README/STATUS current, any manual steps listed.
- Pre-1.0: each stage is a minor release. Post-1.0: strict SemVer (features = minor, fixes = patch,
  breaking URL/content-structure changes = major).

### Deploy
- Production deploys only from a release (section 10), followed by automatic production smoke tests.
- Environments: **local** (`pnpm dev`), **preview** (per PR), **production** (`github-pages` environment).

### Operate and monitor
- **Scheduled workflow** (`scheduled.yml`, weekly): production smoke tests, link check on the live site
  (external links rot), and Lighthouse against production. On failure, it opens (or updates) a single issue
  labeled `ops` instead of failing silently.
- **Uptime:** a free external monitor (e.g. UptimeRobot) pinging the homepage, alerting Sohan by email.
- **Analytics review:** GoatCounter tracks page views and command usage; use it to see which sections and
  commands people actually use, and feed that back into the backlog.

### Incidents, hotfixes, and rollback
- **Rollback:** `release.yml` also supports `workflow_dispatch` with a `tag` input that rebuilds and redeploys
  any previous release tag to production. This is the first response to a bad release.
- **Hotfix:** new `fix/...` branch from `main` → PR → merge → release-please patch release. Same gates, no shortcuts.
- **Postmortem** for anything that broke production: short doc in `docs/postmortems/` (what happened, impact,
  timeline, root cause, fix, follow-up issues). Blameless.

### Maintain
- Renovate weekly (section 10). Node LTS upgrades tracked as issues.
- **Quarterly content review:** a scheduled workflow opens a "Content review" issue every quarter
  (update roles, projects, skills, resume, and certifications; refresh screenshots).
- Remove expired feature flags and dead code; knip and dependency-cruiser keep this honest.

### Document
- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md` (generated), `LICENSE`.
- `docs/`: `SPEC.md`, `STATUS.md`, `plans/`, `adr/`, `postmortems/`, `content-guide.md`, and **runbooks** in
  `docs/runbooks/`: local setup, adding content (update, project, role), releasing, rolling back, hotfixing,
  rotating public keys, and updating visual baselines.

### Review and improve
- **Stage sign-off:** at the end of each stage, a short demo summary (what shipped, screenshots, preview/production
  links), plus a brief retrospective in `docs/STATUS.md`: what went well, what didn't, and what to change next stage.

### Launch (with v1.0.0)
- Privacy note page (analytics and contact form data handling), favicon and OG images verified, Google Search
  Console verified and sitemap submitted, old `/portfolio` site redirected to the new one, README screenshot/GIF updated.

---

## 11. Stages

Each stage: its own branch and PR, CI green, preview reviewed by Sohan, merged, then a release.
**Stop after each stage** and wait for Sohan's go-ahead before starting the next.

### Stage 0 — Foundation → v0.1.0
Scaffold Astro + React + TS + Tailwind; all tooling (section 10), including commitlint, the PR title check,
the PR and issue templates, labels, and CODEOWNERS; a `.gitignore` that merges the Astro defaults with
`CLAUDE.local.md`, `.claude/settings.local.json`, `.env*` (keeping `.env.example`), and test/Lighthouse output
folders; all workflows; release-please config;
Renovate config; README/CONTRIBUTING/ADR-0001; `docs/STATUS.md` and `docs/plans/` (with `stage-0.md`);
GitHub milestones for all eight stages; labels and a GitHub Projects board; ADR and postmortem templates;
`SECURITY.md`; initial runbooks; dependency review and `pnpm audit` in CI; `scheduled.yml` (weekly ops checks,
quarterly content-review issue); rollback via `workflow_dispatch` in `release.yml`; `src/config/features.ts`; base-path helper with tests; a minimal placeholder
page showing name and version. **Done when:** a PR gets a working preview URL, CI is green, and merging the
release PR deploys production at `https://roarceus.github.io/`.

### Stage 1 — Content and plain view → v0.2.0
Zod schemas; content extracted from `roarceus/portfolio` plus current facts; `docs/content-review.md`;
complete `/plain/` page with all sections, project pages, updates + RSS, contact form, resume link,
SEO metadata, sitemap, 404. **Done when:** the plain view is a complete, shippable portfolio and passes all budgets.

### Stage 2 — Design system and layout shell → v0.3.0
Tokens, typography, components (button, badge/status pill, panel, table); top bar with always-visible
controls; dashboard grid on `/` (cluster area, detail panel, docked terminal) with static placeholders;
mobile layout. **Done when:** layout matches section 4 and 5 at desktop and mobile sizes.

### Stage 3 — Terminal engine → v0.4.0
Parser, registry, all v1 commands (section 7), structured output renderer, history, autocomplete,
chips, accessibility. **Done when:** every command works and is unit-tested; e2e covers the core ones.

### Stage 4 — Cluster visualization → v0.5.0
SVG map of nodes and pods from content data, status colors, hover/selection, detail panel, two-way sync
between map and terminal. **Done when:** everything in the map is clickable and keyboard reachable, and clicks echo commands in the terminal.

### Stage 5 — Boot sequence and polish → v0.6.0
Boot animation (section 9), transitions, empty/loading/error states, OG images, mobile tap-first cluster mode.

### Stage 6 — Game layer → v0.7.0
Self-healing, chaos mode, badges, easter eggs (section 8), GoatCounter command events.

### Stage 7 — Hardening → v1.0.0
Full accessibility audit, performance pass, cross-browser check (Chrome, Firefox, Safari, mobile Safari),
content final review with Sohan, docs pass, release `1.0.0`.
