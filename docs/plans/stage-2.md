# Stage 2 — Design system and layout shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A finished design system and the cluster layout shell, released as **v0.3.0**.

- Final design tokens, plus UI primitives and an original site mark.
- A top bar on every page.
- A shorter plain view.
- The `/` dashboard shell (stage, detail panel, terminal dock, mobile cluster mode). It ships behind
  `clusterDashboard`, which is off in production.

**Architecture:**

- **Tokens:** CSS variables in `src/styles/tokens.css`, exposed to Tailwind in `global.css`. Two static
  tests guard them: AA contrast pairs, and scene tokens only in the cluster and game folders.
- **Styles:** class recipes in `src/components/ui/recipes.ts` are shared by Astro components now and React
  islands later.
- **Cluster data:** derived by pure helpers in `src/lib/content/cluster.ts` and `src/lib/utils/kubectl.ts`,
  so the static placeholders and Stages 3 and 4 use the same data.
- **Rendering:** everything is static Astro. The only scripts are the jump chip highlighter, print
  expanders, and focus on cluster mode open. Each is an inline `<script>` in the component that needs it,
  as `ContactForm` does today. No new `src/scripts/` folder.

**Tech Stack:** Astro 7.4.13, Tailwind v4, `@lucide/astro` (new, pin the exact version after checking npm),
Vitest, Playwright and axe, Lighthouse CI.

**Spec:**

- [`stage-2-design.md`](stage-2-design.md) (approved 2026-11-25) and [ADR 0002](../adr/0002-design-direction-tool-and-game.md).
- `docs/SPEC.md` §3 (structure), §4 (IA, responsive), §5, §7 (nodes), §9 (pre-selected role), §11 Stage 2.
- Rules: `CLAUDE.md`.

**Status:** draft. It waits for Sohan's approval before any code. Issues #49 to #56 are on milestone Stage 2.

## Global Constraints

- **Tokens and URLs:** dark only, tokens only (no raw hex in components); every internal URL goes through
  `url()`.
- **Scene scope:** `--scene-*` tokens and glow effects (`text-shadow`, a colored `box-shadow`,
  `filter: drop-shadow`) only in `src/components/cluster/` and `src/components/game/` (ADR 0002).
- **Content:** components read content only through `@/lib/content/*`.
  - No names, counts, or roles are hardcoded.
  - Copy follows `docs/content-guide.md`: no em or en dashes, no `·`, no curly quotes. The location is
    "San Francisco Bay Area".
  - Public project slugs only.
- **Responsive:** 320 to 2560px with no page-level sideways scroll; targets ≥ 44 by 44 with ≥ 8px gaps;
  `dvh`; safe-area insets.
- **Accessibility:**
  - status shown by text plus shape, never color alone;
  - visible 2px `accent-soft` focus;
  - `prefers-reduced-motion` respected.
- **Motion:** chrome animates only color, opacity, and transform, at 150 to 300ms, never infinitely.
- **Production safety:** production builds (`release.yml`) set no `PUBLIC_ENABLED_FLAGS`, so `/` shows the
  hero.
- **Budgets:** Lighthouse mobile performance ≥ 0.9; accessibility, best practices, and SEO ≥ 0.95;
  CLS < 0.1. Coverage: `src/lib/**` ≥ 90% lines and branches, overall ≥ 80%.
- **Dependencies:** `@lucide/astro` is the only new dependency: exact pin, with reason, size, license, and
  alternatives in its PR.

## Review Focus

1. **Tight widths.** At 320px the top bar shows the mark, `sohan`, and three text controls with no
   overflow, including with a longer version string such as `v0.10.0`. Pinned in Task 4.
2. **Content edge cases in cluster data.** These must render cleanly and never throw:
   - a cluster node with zero pods;
   - a role whose `end` is `present` (status `Active`, and it becomes the pre-selected role if it's the
     newest work role);
   - a project on a `cluster: false` node.

   Pinned in Task 6.

3. **Expander counts.**
   - No expander when a role has ≤ 2 highlights.
   - Singular copy for one hidden item ("Show 1 more highlight").
   - The projects count matches the data.

   Pinned in Task 5.

4. **Sticky bar covering content.** After a jump chip is clicked or a link is tabbed to, the target heading
   sits below the jump bar, not under it. Pinned in Task 5.
5. **Mistyped flags.** `PUBLIC_ENABLED_FLAGS=clusterDashbord` (a typo) fails the build with a message naming
   the unknown flag. Whitespace and empty entries are ignored. Pinned in Task 6.

## PR split

| #   | Branch                            | Title                                                            | Tasks | Issues |
| --- | --------------------------------- | ---------------------------------------------------------------- | ----- | ------ |
| 1   | `docs/stage-2-design-direction`   | `docs(design): adopt the tool-and-game design direction`         | 1     | #49    |
| 2   | `feat/stage-2-design-tokens`      | `feat(design): add design tokens with contrast and scope checks` | 2     | #50    |
| 3   | `feat/stage-2-ui-primitives`      | `feat(ui): add ui primitives`                                    | 3     | #51    |
| 4   | `feat/stage-2-top-bar`            | `feat(ui): add top bar, site mark, and lucide icons`             | 4     | #52    |
| 5   | `feat/stage-2-plain-view-shorter` | `feat(plain): add jump chips and expanders to the plain view`    | 5     | #53    |
| 6   | `feat/stage-2-cluster-data`       | `feat(cluster): add cluster data helpers and feature flags`      | 6     | #54    |
| 7   | `feat/stage-2-dashboard-shell`    | `feat(cluster): add dashboard shell behind a feature flag`       | 7     | #55    |
| 8   | `docs/stage-2-wrap-up`            | `docs(docs): close out stage 2 in status, plan, and readme`      | 8     | #56    |

Each PR updates the README and STATUS for what it
changes and ticks this file.

---

### Task 1: Design direction docs (PR 1) — done (#57)

**Files:** `docs/adr/0002-design-direction-tool-and-game.md`, `docs/SPEC.md` (§5 scene rule, §7 nodes, §11
Stages 8 to 10), `docs/plans/stage-2-design.md`, this plan, `docs/STATUS.md`.

- [x] ADR 0002 accepted; SPEC and the design doc updated (approved 2026-11-25).
- [x] Create one issue per task on milestone 3, and milestones `Stage 8 — 3D cluster view`,
      `Stage 9 — Missions`, `Stage 10 — Incidents`. Fill in the issue numbers above.
- [x] STATUS: Stage 2 in progress, and the open "design direction" and "plain view length" questions
      closed with links.
- [x] `pnpm check` green; open the PR as a draft.

### Task 2: Design tokens (PR 2) — done (#58)

**Files:**

- Modify: `src/styles/tokens.css`, `src/styles/global.css` (`@theme` names for the new tokens).
- Create: `src/lib/utils/contrast.ts` and its test, `src/styles/tokens.test.ts`,
  `tests/static/scene-scope.test.ts`.

**Interfaces:**

- **Produces:**
  - `contrastRatio(fg: string, bg: string): number`: hex in (`#rgb` or `#rrggbb`), WCAG 2.x ratio out.
    Throws on anything else.
  - `readTokens(css: string): Map<string, string>`, in `src/styles/tokens.test.ts` (test-only).
  - The token names in design doc §4.1, and Tailwind utilities such as `bg-status-running-soft`,
    `bg-accent-fill`, `rounded-lg`, `duration-ui`, `ease-out`, `z-sticky`.

**Steps:**

- [x] **Contrast test first.** `contrastRatio('#ffffff', '#000000')` is `21`; `('#e6edf3', '#0a0e14')` is
      ≈ `16.36` (2 dp); `('#fff', '#326ce5')` is ≈ `4.75`; `'blue'` throws. Run
      `pnpm vitest run src/lib/utils/contrast.test.ts`; it fails (module missing). Implement it, and the
      test passes.
- [x] **Tokens test first** (`tokens.test.ts`). It reads `tokens.css` and asserts these pairs:
  - **≥ 4.5:**
    - `text` and `text-muted` on `bg`, `surface-1`, `surface-2`, and each `status-*-soft`;
    - `accent-soft` on `bg`, `surface-1`, `surface-2`, and `accent-fill`;
    - each `status-*` on its own `-soft` fill;
    - `on-accent` on `accent`.
  - **≥ 3:** `border` on `bg`, for UI parts (WCAG 1.4.11). If the current `#243044` fails, raise it until
    it passes.
  - **Every** `var(--x)` in `global.css` `@theme` names a token defined in `tokens.css`.

  It fails on the missing tokens. Add the tokens from design doc §4.1 and tune the values until it
  passes.

- [x] **Scope test** (`scene-scope.test.ts`). It walks `src/` (`.astro`, `.ts`, `.tsx`, `.css`) and
      reports `file:line` for `--scene-`, `text-shadow`, `drop-shadow`, or a `box-shadow` with a color,
      outside `src/components/{cluster,game}/` and `src/styles/tokens.css`. A self-test feeds it a fake
      offending string, so the rule provably fires.
- [x] `pnpm check` green; commit `feat(design): add design tokens with contrast and scope checks`.

### Task 3: UI primitives (PR 3) — done (#60)

**Files:**

- Create: `src/components/ui/recipes.ts` (with test), `Button.astro`, `Panel.astro`, `Table.astro`,
  `Chip.astro`, `Expander.astro`.
- Modify: `StatusPill.astro`, `TagList.astro`.
- Test: `src/components/ui/recipes.test.ts`, and `src/components/ui/primitives.test.ts`, which renders each
  component with Astro's Container API (`experimental_AstroContainer` from `astro/container`; Vitest already
  uses `getViteConfig`). Layout behavior (44px targets, cards at 320px) is checked in e2e where the
  primitives are used (Tasks 4, 5, 7). No test-only page ships.

**Interfaces:**

- **Consumes:** Task 2 token utilities.
- **Produces:**
  - `button(variant: 'primary' | 'secondary' | 'ghost'): string`, plus `chip(): string`, `panel(): string`,
    `focusRing: string`, `target: string` (min 44 by 44).
  - `Button` props: `{ variant?, href?, type?: 'button' | 'submit', icon?: LucideIcon }`, with the label in
    the slot.
  - `Panel` props: `{ label?: string, meta?: string, as?: 'section' | 'div', labelledBy?: string }`.
  - `Table` props: `{ caption: string, columns: { key: string, label: string }[], rows: Record<string, string | { text: string, href: string }>[] }`.
    - Headers are uppercase mono.
    - Below 640px it becomes stacked cards with `data-label`.
    - Wide content scrolls in its own container.
  - `Chip` props: `{ href: string }`, with the label in the slot.
  - `Expander` props: `{ summary: string }`, with the hidden content in the slot. Native
    `<details>`/`<summary>`.
  - `StatusPill` gains a soft fill and a per-status inline SVG shape (running filled circle, pending half
    circle, failed cross, completed ring), and keeps its text.

**Steps:**

- [x] **Recipes test first.** `button('primary')` contains `bg-accent`, `text-on-accent`, `min-h-11`;
      `secondary` contains `border-border`; every recipe contains `focusRing`. Fails, implement, passes.
- [x] **Moved to Task 4:** knip fails on unused dependencies, so Lucide arrives with its first use (the top
      bar). Was: **Add `@lucide/astro`.** Check the latest stable version on npm, pin it exactly, and record size and
      license (ISC) for the PR body. No other icon set.
- [x] **Build the components.** Restyle `StatusPill` and `TagList` to the recipes. Update existing usages
      only where their props change.
- [x] **Container API tests first** (then implement until they pass):
  - `Button` renders `<a href>` when `href` is set, otherwise `<button type="button">`.
  - `Table` renders a `<caption>`, a `<th scope="col">` per column, and `data-label` on each cell; link
    cells render `<a>`.
  - `Expander` renders `<details>` with the summary text.
  - `StatusPill` renders its status word as text and an `aria-hidden` SVG shape, for each of the four
    statuses.
  - `Chip` renders a link with the recipe classes.
- [x] `pnpm check` green; commit `feat(ui): add ui primitives`.

### Task 4: Top bar and site mark (PR 4)

**Files:**

- Create: `src/components/layout/TopBar.astro`, `src/components/layout/SiteMark.astro`.
- Modify: `src/layouts/BaseLayout.astro`, `public/favicon.svg`, `package.json` (`@lucide/astro` 1.75.0 or
  newer, at least a week old, exact pin; moved here from Task 3).
- Delete: `src/components/layout/SiteHeader.astro`.
- Test: `tests/e2e/top-bar.spec.ts`.

**Interfaces:**

- **Consumes:** `Button`, `StatusPill`, `buildInfo`, `url()`. The view switch on `/plain/` reads `Home`;
  Task 7 changes it to `Cluster view` when `clusterDashboard` is on.
- **Produces:** `TopBar` props `{ view: 'cluster' | 'plain' | 'page' }`, which `BaseLayout` takes as an
  optional `view` prop (default `'page'`).

**Steps:**

- [x] **Failing e2e first, on every project:**
  - a `banner` with a link to home named `sohan-cluster` (or `sohan` below 640px), plus links `Resume`
    and `Contact`;
  - on `/` the view link reads `Plain view` and goes to `plain/`;
  - on `/plain/` it reads `Home` while the flag is off;
  - the `Ready` text and the version (matching `/^v\d+\.\d+\.\d+/`) are visible at 768px and up, and
    hidden below;
  - no horizontal overflow, also on the 320px project;
  - all controls ≥ 44 by 44;
  - print hides the banner.
- [x] **Build `SiteMark`.** Flat hexagon outline, node dot, "SP" in the mono font, `aria-hidden`; the link
      text names it. Export the same geometry to `public/favicon.svg`. No helm wheel shapes.
- [x] **Build `TopBar`** per design doc §4.5. Wire it into `BaseLayout`, delete `SiteHeader`, and keep the
      skip link first.
- [x] Tests green; `pnpm check` green; check 320, 375, 768, 1280, and 1920px; commit
      `feat(ui): add top bar and site mark on every page`.

### Task 5: Shorter plain view (PR 5)

**Files:**

- Create: `src/components/plain/JumpChips.astro`, with an inline script that marks the current section.
  The print expander script is inline in `Expander.astro`.
- Modify: `src/pages/plain/index.astro`, `SectionNav.astro`, `ExperienceSection.astro`,
  `ProjectsSection.astro`, `UpdatesSection.astro`, `Section.astro`, `global.css` (print rules).
- Test: `tests/e2e/plain.spec.ts` (extend), `src/lib/utils/plural.test.ts`.

**Interfaces:**

- **Consumes:** `Chip`, `Expander`, `plainSections`.
- **Produces:** `moreLabel(count: number, singular: string, plural: string): string`, which returns
  `'Show 1 more highlight'` or `'Show 3 more highlights'`, in `src/lib/utils/plural.ts`.

**Steps:**

- [ ] **Unit test first** for `moreLabel` (0 throws, 1 is singular, 13 is plural). Implement.
- [ ] **Failing e2e first:**
  - Below 1024px, a `navigation` named "On this page" stays in view after scrolling 2000px. At 1024px and
    up, the sidebar does instead.
  - Clicking `Projects` puts `#projects`' heading top at or below the jump bar's bottom edge, and that link
    gets `aria-current="location"`.
  - A role with ≤ 2 highlights has no expander; a role with more shows exactly 2 and an expander labelled
    with the hidden count.
  - "More projects" shows one expander whose label count equals the number of non-featured projects in
    the data (read the count from the rendered list, not a hardcoded 13).
  - Updates show 3 entries and an "All updates" link.
  - `emulateMedia({ media: 'print' })` in Chromium: hidden highlights and projects are visible, the summary
    and jump bar are hidden.
  - axe passes; no overflow at 320px.
- [ ] **Implement** per design doc §4.7. The scripts are progressive: without JS the links and expanders
      still work. `scroll-margin-top: var(--jumpbar-h)` on sections.
- [ ] Tests green; `pnpm check` and `pnpm lhci` green; check widths; commit
      `feat(plain): add jump chips and expanders to the plain view`.

### Task 6: Cluster data and flags (PR 6)

**Files:**

- Create: `src/lib/content/cluster.ts`, `src/lib/utils/kubectl.ts`, `src/lib/utils/flags.ts`, a test next to
  each.
- Modify:
  - `src/lib/content/schemas/collections.ts` (+ test): `cluster: z.boolean().default(true)` on experience
    and education;
  - `src/content/experience/sparks-foundation.yaml` and `src/content/education/mumbai.yaml`:
    `cluster: false`;
  - `src/lib/content/queries.ts`: `getCluster(now?)`;
  - `src/config/features.ts`;
  - `.env.example` (`PUBLIC_ENABLED_FLAGS=`).

**Interfaces:**

- **Produces:**
  - `type PodPhase = 'Running' | 'Pending' | 'Completed'`;
    `podPhase(status: 'running' | 'pending' | 'completed'): PodPhase`.
  - `type Pod = { slug: string; name: string; phase: PodPhase }`;
    `type ClusterNode = { name: string; label: string; role: 'work' | 'education' | 'teaching'; pods: Pod[] }`.
  - `clusterNodes(experience, education, projects): ClusterNode[]`:
    - only nodes whose entries all have `cluster: true`;
    - newest first, by the latest `end` (`present` first) among that node's entries;
    - `label` comes from `nodeLabels`;
    - `role` comes from the newest entry's `type` (education entries count as `education`).
  - `unscheduledPods(projects): Pod[]`: projects with no `node`.
  - `preselectedRole(experience, nodes): ExperienceEntry | undefined`: the newest `type: 'work'` entry
    whose node is in `nodes`.
  - `experienceRows(experience, nodes, now: Date): { name, role, node, status: 'Active' | 'Completed', age }[]`:
    - rows only for cluster nodes;
    - `role` = `toKubeName(entry.role)`;
    - `age` = `kubectlAge(start, now)`.
  - `toKubeName(text: string): string`: lowercase; runs of non-alphanumerics become `-`; trimmed.
    `'DevOps Engineer (Co-op)'` → `'devops-engineer-co-op'`.
  - `kubectlAge(start: string /* YYYY-MM */, now: Date): string`: days from the first of the start month.
    Rules, the Kubernetes `HumanDuration` subset:
    - under 8 days: `Nd`;
    - under 2 years (730 days): `Nd`;
    - under 8 years: `Ny` plus `Md` when M > 0 (years = floor(days / 365), M = days mod 365);
    - otherwise: `Ny`.
  - `getCluster(now = new Date()): Promise<{ nodes, unscheduled, selected, rows }>` in `queries.ts`.
  - `resolveFlags(defaults: Record<F, boolean>, enabled: string | undefined): Record<F, boolean>`: splits on
    commas, trims, ignores empty entries, and throws `Unknown feature flag "x"` for names not in
    `defaults`.
  - `features.ts`: adds `clusterDashboard: false` to the defaults; `features = resolveFlags(defaults,
import.meta.env.PUBLIC_ENABLED_FLAGS)`. `isEnabled` stays the same.

**Steps:**

- [ ] **Failing unit tests first:**
  - `kubectlAge('2025-06', new Date('2026-11-25'))` is `'542d'`; `('2021-05', same)` is `'5y209d'`;
    `('2026-11', new Date('2026-11-03'))` is `'2d'`; a start after `now` throws.
  - `toKubeName` covers the example above, plus `'Teaching Assistant, Network Structures & Cloud Computing (CSYE 6225)'`
    → `'teaching-assistant-network-structures-cloud-computing-csye-6225'`.
  - `clusterNodes` on fixtures:
    - a `cluster: false` node is excluded, along with its projects;
    - a node with no projects has `pods: []`;
    - order is newest first;
    - `northeastern` with both a TA and an education entry appears once, with `role: 'teaching'`.
  - `preselectedRole`: a `present` work role wins over an older one; the teaching role is never chosen when
    a work role exists. Against real-shaped fixtures it returns the MasterControl entry.
  - `experienceRows` status: `present` → `Active`, otherwise `Completed`.
  - `resolveFlags`:
    - `undefined` and `''` keep the defaults;
    - `' clusterDashboard , '` turns it on;
    - `'clusterDashbord'` throws naming it (Review Focus 5).
  - The schema: `cluster` defaults to `true` and accepts `false`.
- [ ] **Implement.** `cluster.ts` stays pure (no `astro:content`); only `queries.ts` wires it to the
      collections.
- [ ] Coverage holds; `pnpm check` green; commit
      `feat(cluster): add cluster data helpers and feature flags`.

### Task 7: Dashboard shell (PR 7)

**Files:**

- Create:
  - `src/components/cluster/ClusterStage.astro`, `src/components/cluster/DetailPanel.astro`;
  - `src/components/terminal/TerminalDock.astro`;
  - `src/components/layout/BottomSheet.astro`;
  - `src/components/plain/HomeHero.astro` (the restyled flag-off hero, moved out of the page). The
    focus-on-open script is inline in `ClusterStage.astro`.
- Modify:
  - `src/pages/index.astro`;
  - `.github/workflows/ci.yml` (second build, `@dashboard` e2e, Lighthouse on `/`);
  - `.github/workflows/preview.yml` (`PUBLIC_ENABLED_FLAGS: clusterDashboard`);
  - `src/components/layout/TopBar.astro` (the `Cluster view` link on `/plain/` when the flag is on);
  - `tests/smoke/smoke.spec.ts` (production `/` shows the hero, with no `Cluster map` region);
  - `lighthouserc.json` if a second config is needed.
- Test: `tests/e2e/home.spec.ts` (flag off), `tests/e2e/dashboard.spec.ts` (tagged `@dashboard`).

**Interfaces:**

- **Consumes:** `getCluster()`, `isEnabled('clusterDashboard')`, `Panel`, `Table`, `Chip`, `StatusPill`,
  `Button`, `TopBar view="cluster"`.
- **Produces:**
  - `ClusterStage` props `{ nodes: ClusterNode[], unscheduled: Pod[], selected?: string }`. The root is
    `<section aria-labelledby>` with `data-renderer="static"` and a fixed footprint (`aspect-ratio` at
    1024px and up, `min-height` below).
  - `DetailPanel` props `{ entry: ExperienceEntry }`.
  - `TerminalDock` props `{ rows: ExperienceRow[] }`.
  - `BottomSheet` takes a slot and `{ label: string }`.

**Steps:**

- [ ] **Failing e2e first.**
  - **Flag off (`home.spec.ts`, default build):** a heading `Sohan Patil`; `View portfolio`, `Resume`, and
    `Contact`; no region named `Cluster map`; axe; overflow.
  - **Flag on (`dashboard.spec.ts`, run against the flag build):**
    - **1280px:**
      - regions `Cluster map`, `Details`, and `Terminal`;
      - the stage and details sit side by side (details left edge > stage right edge);
      - node names come from content, and their count equals the `N/N nodes ready` header;
      - `describe node/mastercontrol` is visible;
      - the terminal shows a table with headers `NAME ROLE NODE STATUS AGE`;
      - every chip is a link ≥ 44px.
    - **768px:** the stage, then details, stacked.
    - **375px:** `Launch cluster` opens cluster mode (`#cluster` targeted), focus lands on the stage
      heading, `Back` closes it, and browser back closes it too.
    - **Every size:** axe and no overflow.
    - **Layout stability:** the stage footprint doesn't change between `load` and `networkidle`
      (bounding boxes equal).
- [ ] **Implement** per design doc §4.6. Each node card links to `plain/#experience` or `plain/#education`
      through `url()`; pods link to `projects/<slug>/`. The unscheduled row is labelled `unscheduled`.
- [ ] **CI.** The build job also runs
      `PUBLIC_ENABLED_FLAGS=clusterDashboard pnpm exec astro build --outDir dist-dashboard` and uploads it.
  - A `dashboard` e2e job runs `--grep @dashboard` on chromium, firefox, and webkit against it.
  - `lighthouse` runs `/` from `dist-dashboard` with the same budgets.
  - The default e2e run uses `--grep-invert @dashboard`.
  - `ci-ok` needs the new job.
  - Every action stays pinned to a SHA, with least-privilege permissions.
- [ ] Tests green; `pnpm check` and `pnpm lhci` green for both builds; check the preview at 320, 375,
      768, 1024, 1280, and 1920px; commit `feat(cluster): add dashboard shell behind a feature flag`.

### Task 8: Stage 2 wrap-up (PR 8)

- [ ] README: features, the architecture diagram (tokens, recipes, cluster helpers), the flags section
      (`PUBLIC_ENABLED_FLAGS`), the status line.
- [ ] STATUS: sign-off with screenshots and links, plus a retrospective. Close the remaining stage
      questions.
- [ ] This plan ticked; then Sohan merges the release PR for v0.3.0.
