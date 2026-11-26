# Stage 2 design: design system and layout shell

- **Status:** approved by Sohan, 2026-11-25
- **Date:** 2026-11-25
- **Direction:** [ADR 0002](../adr/0002-design-direction-tool-and-game.md), "the UI is the tool, the cluster
  is the game"
- **Spec:** SPEC §4 (IA, responsive), §5 (design system), §11 Stage 2
- **References:** Sohan's four mockups (desktop dashboard, mobile views, contact and chaos, 3D concept). We
  use them for layout and interaction, not as pixel targets.

## 1. Intent

Stage 2 sets how the whole site looks and how the cluster experience is laid out. Later stages fill that
shell: the terminal in Stage 3, the map in Stage 4, the boot sequence and tap-first mode in Stage 5, the game
in Stage 6, and 3D in Stage 8.

What this stage must achieve:

- A recruiter gets who Sohan is in 10 seconds, without interacting.
- Every page feels like one polished tool (Linear-level typography and restraint).
- The plain view gets noticeably shorter without losing content, crawlability, or print.
- The layout already has a slot that can host the 2D map now and a 3D canvas later.

## 2. Goals, non-goals, anti-goals

**Goals**

- Final design tokens (color, type, spacing, radius, motion, z-index, scene), with every text and
  background pair checked for AA by a test.
- UI primitives: Button, StatusPill, Panel, Table (kubectl style), Chip, Expander, Tag.
- A top bar on every page with the always-visible controls.
- The dashboard shell on `/`: hero line, cluster stage, detail panel, docked terminal with chips. It uses
  static content-driven placeholders and sits behind the `clusterDashboard` flag.
- Mobile layout: the plain layout on `/`, plus a "Launch cluster" mode with a stage, a bottom sheet, and a
  chip bar.
- A shorter plain view: sticky jump chips, expanders, and tighter spacing.
- An original site mark (hexagon and node motif with "SP"), also used as the favicon.

**Non-goals (later stages)**

- A working terminal input (Stage 3).
- An interactive map, hover and select, or map and terminal sync (Stage 4).
- Bottom sheet drag gestures, the boot sequence, transitions (Stage 5).
- Anything game-like (Stage 6).
- 3D (Stage 8).

**Anti-goals (a failure even if it "works")**

- Production `/` showing placeholder or unfinished UI while Sohan is job hunting.
- Glow, gradients, or decorative motion in the chrome.
- Content hidden in a way that search engines, screen readers, or printing lose.
- Any regression in Lighthouse mobile (≥ 90 performance, ≥ 95 elsewhere), CLS, or sideways scroll from
  320 to 2560px.

## 3. Approaches

**Shortening the plain view.** Sohan chose option 1.

1. **Jump chips and expanders (chosen).**
   - A sticky row of section chips on phones and tablets; the sidebar stays on desktop.
   - Each role shows its first two highlights; "More projects" folds into one expander.
   - Spacing gets tighter.
   - All content stays in the HTML, and expanders open when you print.
   - Trade-off: some content is one tap away.
2. **Summary-first.** One-line summaries, with detail on separate pages. It's the shortest page, but it
   means more clicks, and printing the page no longer gives a full résumé.
3. **Tabs per section.** Dropped: tabs hide whole sections and scan and print badly.

**Keeping placeholders off production** (my call; Sohan can overrule): the dashboard sits behind
`clusterDashboard`, which is on in dev, CI, and PR previews and off in production. Production `/` keeps the
current hero, restyled with the new system. The alternative was shipping the shell with placeholders in
v0.3.0, which looks unfinished to recruiters.

## 4. Design

### 4.1 Tokens (`src/styles/tokens.css`)

The color tokens from SPEC §5 stay. Additions:

| Group        | Tokens                                                                                                                                                                                  | Values (starting point)                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Status fills | `--status-{running,pending,failed,completed}-soft`                                                                                                                                      | dark tinted backgrounds for pills and alerts, e.g. running `#0F2A17`, pending `#2B2108`, failed `#3A1414`, completed `#1A212C` |
| Accent fill  | `--accent-fill`                                                                                                                                                                         | `#0E2350`, the selected-row and selected-node background (mockup "promotionbot" rows)                                          |
| Radius       | `--radius-sm/md/lg/full`                                                                                                                                                                | 4px / 6px / 10px / 9999px                                                                                                      |
| Type         | `--text-xs-fluid`, `--text-h2-fluid`, `--leading-tight/body`                                                                                                                            | adds to the existing fluid scale; body line-height 1.6                                                                         |
| Motion       | `--duration-fast/ui/slow`, `--ease-out`, `--ease-in`, `--ease-standard`                                                                                                                 | 150 / 200 / 300ms; exits use about 70% of the enter time                                                                       |
| Z-index      | `--z-sticky/dock/sheet/overlay/skip`                                                                                                                                                    | 10 / 20 / 30 / 40 / 50 (no arbitrary values)                                                                                   |
| Layout       | `--topbar-h`, `--jumpbar-h`, `--terminal-h`                                                                                                                                             | used for `scroll-margin-top` and grid sizing                                                                                   |
| **Scene**    | `--scene-bg`, `--scene-platform`, `--scene-platform-edge`, `--scene-platform-selected`, `--scene-link`, `--scene-packet`, `--scene-glow-{running,pending,failed}`, `--scene-duration-*` | flat, Mini Metro-style colors; glows are status colors at low alpha. Only `cluster/` and `game/` may use them                  |

- **Contrast test** (`src/styles/tokens.test.ts`): parses `tokens.css` and asserts each listed pair:
  - text on `bg`, `surface-1`, `surface-2`, and every `*-soft` fill;
  - status colors on their soft fills;
  - `on-accent` on `accent`.

  Body text must reach ≥ 4.5:1, and large text and UI parts ≥ 3:1.

- **Scope test** (`tests/static/scene-scope.test.ts`): `--scene-*` tokens and glow effects appear only in
  `src/components/cluster/` and `src/components/game/` (ADR 0002).
- **Tailwind:** the new tokens get Tailwind names in `global.css` `@theme`. Components use utilities, never
  raw hex (unchanged rule).

### 4.2 Type

Inter (reading) and JetBrains Mono (system), self-hosted as today. A clear scale:

- display (h1);
- h2 for sections;
- h3 for cards;
- body (16 to 18px fluid);
- small (14px);
- xs (12px, mono metadata only, never body text).

Headings use weight 600 and body 400. Tabular figures in tables. Preload only the Inter latin subset. Line
length is capped at about 70 characters.

### 4.3 Primitives (`src/components/ui/`)

Class recipes live in `src/components/ui/recipes.ts` (plain strings, no React or DOM), so the Astro
components now and the React islands in Stages 3 and 4 look identical.

| Component             | Variants and rules                                                                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`              | `primary` (accent fill, `on-accent` text), `secondary` (border), `ghost`. Renders `<a>` or `<button>`. Min 44 by 44, visible focus, optional Lucide icon left. Only one primary per view.                             |
| `StatusPill` (update) | soft fill plus shape (running ●, pending ◐, failed ✕, completed ○ as inline SVG) plus text, so it never relies on color alone.                                                                                        |
| `Panel`               | `surface-1`, border, `radius-lg`. Optional header row: mono muted label on the left (e.g. `namespace: career`), meta on the right.                                                                                    |
| `Table`               | kubectl look: uppercase mono headers, left-aligned columns, `AGE`-style values, the name column as links. Below 640px it becomes stacked cards (header becomes label). Wide content scrolls inside its own container. |
| `Chip`                | command chip, mono, 44px tall, bordered, `$`-less label (`get pods -n projects`). A link now; a button in Stage 3.                                                                                                    |
| `Expander`            | native `<details>`/`<summary>`; the summary says what's hidden with a count ("Show 3 more highlights"); chevron rotates (transform only); opens for print (4.7).                                                      |
| `Tag`                 | existing `TagList`, restyled to the mockup pill.                                                                                                                                                                      |

Icons come from **Lucide**, which SPEC §3 already lists, through `@lucide/astro`. That's a new dependency:
the exact version gets pinned and checked on npm, and its reason, size, and ISC license go in the PR. Icons
always sit next to visible text.

### 4.4 Site mark

An original flat hexagon outline with a small node dot and "SP" in JetBrains Mono. It is not the Kubernetes
helm wheel or anything close (SPEC §5 trademarks). Delivered as an inline SVG component, `public/favicon.svg`,
and the source for a future OG refresh.

### 4.5 Top bar (`src/components/layout/TopBar.astro`, replaces `SiteHeader`)

```
≥ 1024px [mark] sohan-cluster (Ready) v0.3.0      [icon Plain view] [icon Resume] [icon Contact]
≥ 768px  [mark] sohan-cluster (Ready) v0.3.0          [Plain view] [Resume] [Contact]
≥ 640px  [mark] sohan-cluster                         [Plain view] [Resume] [Contact]
< 640px  [mark] sohan                                  [Plain] [Resume] [Contact]
< 360px  [mark]                                        [Plain] [Resume] [Contact]
```

- **Left:**
  - the mark and `sohan-cluster` (mono), linking home;
  - a "Ready" StatusPill;
  - the version from `buildInfo`, muted.

  The pill and version show from 768px, the name shortens to `sohan` below 640px, and below 360px only
  the mark shows (the link keeps its name for screen readers), so the bar stays on one row at 320px
  (measured in PR 4).

- **Right, always visible:**
  - the view switch: `Plain view` on `/`; `Cluster view` on `/plain/` when the flag is on, otherwise
    `Home`;
  - `Resume`, a secondary button;
  - `Contact`, the primary button.

  Text labels at every width (no icon-only nav). Verified at 320px by the overflow test.

- It is not sticky (it saves vertical space). Print hides it.

### 4.6 `/` layout

**Flag off (production in Stage 2):** the current hero, restyled. It reuses `Intro` content: name, title,
location and open-to-work pill, tagline, actions (View portfolio, Resume, Contact), and section links.

**Flag on** (dev, CI, PR previews; the default in production from Stage 4):

```
≥ 1024px
┌ top bar ───────────────────────────────────────────────────────────────┐
│ Sohan Patil                                                            │
│ Software engineer, DevOps and cloud, San Francisco Bay Area            │
├ Panel: namespace: career  3/3 nodes ready, N pods ┬ describe node/... ──┤
│ cluster stage (2fr)                               │ detail panel (1fr)  │
│ [capgemini] [northeastern] [mastercontrol]        │ most recent role    │
│ legend: ● Running ◐ Pending ○ Completed           │ tech tags           │
├ terminal dock (collapsible, --terminal-h) ──────────────────────────────┤
│ $ kubectl get experience   (pre-rendered kubectl table)                 │
│ [get pods -n projects] [top skills] [get certificates] [logs updates]   │
└─────────────────────────────────────────────────────────────────────────┘
768 to 1023px: stage, then detail panel, stacked; terminal docked and collapsible.
< 768px: the plain layout (see below).
```

- **Cluster stage** (`src/components/cluster/ClusterStage.astro`):
  - It is a labelled region (`aria-label="Cluster map"`) with a fixed footprint: `aspect-ratio` at 1024px
    and up, and a `min-height` below that. Swapping what's inside never shifts the layout (CLS).
  - `data-renderer` takes `static` in Stage 2, `svg` in Stage 4, or `webgl` in Stage 8.
  - The static fill is built from content: node cards with their pods (project slugs from content), plus
    the status legend. Nothing is hardcoded. Each node links to its plain-view section, so it works
    without JS.
- **As built (PR 7):** the stage keeps its footprint with a minimum height (24rem, 28rem from 1024px)
  rather than an aspect ratio, because node cards would overflow a fixed ratio; Lighthouse measured CLS
  at 0.022 or less. The terminal dock is not collapsible yet: with only a static table there is nothing
  worth collapsing, so collapse arrives with the real terminal in Stage 3.
- **Width (after PR 7):** the dashboard, with its top bar and footer, grows to `--shell-wide` (120rem,
  1920px) so the map gets the screen. The detail panel is a fixed column (20rem, 26rem from 1280px) to
  keep its text readable. Text pages keep the 72rem width.
- **Detail panel:** the pre-selected role (see 4.12; MasterControl today), as SPEC §9 asks, built from content. The header is
  `describe node/<node>`.
- **Terminal dock:**
  - It shows a pre-rendered `$ kubectl get experience` with the Table primitive, using real kubectl
    formatting.
  - The chips link to the matching plain-view sections until Stage 3 turns them into commands.
  - There is no input yet: a disabled input would be a dead control.
- **Hero line:** the name and title stay above the stage, so a recruiter sees who Sohan is without
  interacting.

**Mobile, below 768px (flag on):**

```
plain layout                      Launch cluster mode (/#cluster)
┌ top bar ──────────────┐         ┌ sohan-cluster (Ready) [Back] ┐
│ Sohan Patil           │         │ [capgemini]  [northeastern]   │
│ title, location       │         │ [mastercontrol]               │
│ [ Launch cluster ]    │  ───►   ├ bottom sheet (max 50dvh) ─────┤
│ experience cards (3)  │         │ describe node/mastercontrol   │
│ [Full portfolio]      │         │ [Details] [Source]            │
└───────────────────────┘         ├ chip bar ─────────────────────┤
                                  │ [get pods] [top skills] [...] │
                                  └───────────────────────────────┘
```

- `Launch cluster` is a link to `#cluster`. CSS `:target` turns on cluster mode, so it needs no JS, and the
  browser's Back button (or the visible `Back` link) leaves it.
- The bottom sheet is static in Stage 2 (scrolls inside, respects the safe areas). Stage 5 adds drag.
- Focus moves to the stage heading when the mode opens (a small enhancement script; without JS the anchor
  scroll does it).

### 4.7 Plain view (`/plain/`)

- **Jump chips** (`src/components/plain/JumpChips.astro`, replaces the mobile use of `SectionNav`):
  - Below 1024px: a sticky row under the top bar (`--z-sticky`, `bg`, bottom border). It's a
    horizontally scrolling chip list inside its own container, so the page never scrolls sideways.
  - At 1024px and up: the existing sticky sidebar.
  - Both mark the current section with `aria-current="location"`, using a small IntersectionObserver
    script. Without JS the links still work.
  - Sections get `scroll-margin-top: var(--jumpbar-h)`.
- **Experience:** summary plus the first 2 highlights. The rest sit in an Expander ("Show 3 more
  highlights"). Tech tags stay visible.
- **Projects:** featured cards as today. "More projects" becomes one Expander ("Show 13 more projects",
  with the count computed).
- **Updates:** the latest 3 (was 5), plus "All updates".
- **Rhythm:** section gap goes from 3rem to 2rem; article gap from 2.5rem to 1.5rem; card padding stays.
- **Print:** expanders print open. The CSS is
  `@media print { details::details-content { content-visibility: visible } details > summary { display: none } }`,
  plus a `beforeprint`/`afterprint` script that sets `open`, for browsers without `::details-content`.
  Print still hides the top bar and the jump chips.
- **Crawlability:** all text stays in the HTML, so nothing loads late.

### 4.8 Feature flag

`src/config/features.ts` gains `clusterDashboard`.

- Flags stay `false` by default. A build turns flags on through `ENABLED_FLAGS` (a comma-separated list),
  which the PR preview, dev, and CI's second dashboard build set. `release.yml` doesn't, so production
  stays off.
- Resolution is a pure function in `lib/` with unit tests: unknown names fail the build, and the variable
  is ignored when empty.
- After deploy, the release smoke test checks that production `/` shows the hero and not the dashboard.

### 4.9 Motion

Chrome uses only color, opacity, and transform transitions at `--duration-fast` or `--duration-ui`. There is
no infinite animation in chrome. The existing global reduced-motion rule stays. Scene motion tokens are
defined now and used from Stage 4.

### 4.10 Accessibility checklist (UI UX Pro Max review)

- Status is shown by text plus shape, never color alone. The selected node uses a border, `aria-current`,
  and the "selected" text in the panel header.
- Targets are ≥ 44px with ≥ 8px gaps; chips and expanders included.
- Focus ring: 2px `accent-soft` with an offset on every interactive element; never removed.
- Landmarks:
  - `header`;
  - `main`;
  - labelled regions for the cluster map, the details, and the terminal;
  - the skip link stays first.
- Heading order: h1 is the name, h2 per region or section, h3 per card.
- Sticky bars never cover focused content (`scroll-margin`, `scroll-padding-top`).
- Inputs (none new this stage) stay ≥ 16px.
- Reviewed against UI UX Pro Max §1 to §3 and §5. We ignored its generic "portfolio grid" suggestion (light
  background, orange CTA, Google Fonts) because SPEC §5 and ADR 0002 win.

### 4.11 Content rules for the mockups

- Use public slugs (`deployment-gating-bot`, `ai-migration-agents`), never internal tool names.
- No `·` separators or dashes in copy; use spacing or commas.
- The location reads "San Francisco Bay Area".
- The version always comes from `buildInfo`.

### 4.12 Cluster data rules (from the builder check)

- **Nodes:** the map shows `capgemini`, `northeastern`, and `mastercontrol`, newest first (Sohan,
  2026-11-25).
  - `mumbai` (Bachelor's) and `sparks-foundation` (2020 internship) are older eras. Their content entries
    get an optional `cluster: false` field (schema default `true`) and stay off the map and out of
    `kubectl get nodes`.
  - They remain in the plain view: Education keeps the degree, and Experience keeps the internship.
  - Their projects aren't drawn on the map. They stay in "More projects" and keep their own pages.
  - Nodes use the real node status, `Ready`.
  - Running, Pending, and Completed are pod phases, mapped from project status.
  - The stage header counts from data, e.g. `3/3 nodes ready` and the pod count of the shown nodes.
- **Unscheduled projects** (no `node`, e.g. this site) sit in a labelled `unscheduled` row under the nodes,
  with their real phase. They're never dropped and never faked onto a node.
- **The legend** explains pod phases (shape plus text). The top bar's `Ready` is the cluster's own status.
- **`kubectl get experience`** placeholder columns: `NAME ROLE NODE STATUS AGE`.
  - `NAME` is the entry id.
  - `STATUS` is `Active`, or `Completed` once the role has an end date.
  - `AGE` is the time since the start date, using the kubectl short format (`7mo` isn't kubectl, so
    `220d`, `2y`, `4y210d`).

  The helper lives in `lib/` with unit tests, and Stage 3 reuses it.

- **Pre-selected role:** the most recent role with `type: work` on a cluster node (MasterControl today),
  chosen by Sohan over the newest role by date.
- **Mobile experience cards:** the roles on cluster nodes, newest first (three today), with no fixed count.
  The full list lives on the plain view.
- **The flag-off production `/` on phones** keeps the restyled hero. The card layout and Launch cluster
  ship with the flag.

## 5. Testing

- **Unit:**
  - token contrast pairs;
  - scene scope;
  - flag resolution;
  - recipes (variant to classes);
  - kubectl table formatting helpers, if any land in `lib/`.
- **e2e (Playwright and axe, all projects):**
  - the top bar at 320, 375, 768, 1280, and 1920px: controls visible, no overflow;
  - `/` with the flag on: regions present; at 1280px stage and detail sit side by side; at 768px stacked;
  - below 768px: plain layout and `Launch cluster` opens and closes cluster mode (Back works);
  - plain view:
    - the jump chips are sticky and mark the current section;
    - expander counts are correct, and open and close work by keyboard;
    - print media shows the expanded content (Chromium);
  - axe on every changed page; no console errors.
- **Both flag states in CI:**
  - The main e2e and Lighthouse runs use the default build (flag off), which is what production serves.
  - A second, smaller build with `ENABLED_FLAGS=clusterDashboard` runs only the dashboard e2e specs
    (tagged `@dashboard`) and Lighthouse on `/`.
  - PR previews build with the flag on, so reviewers see the dashboard. Budgets are unchanged.
- **Visual baselines (`tests/visual/`):** not this stage. Cross-OS font rendering would make them flaky. We
  revisit in Stage 7.

## 6. Delivery (PRs)

1. ADR 0002, SPEC §5 and §11 updates, this design, the Stage 2 plan (docs only).
2. Tokens, recipes, primitives, contrast and scope tests, Lucide.
3. Mark, favicon, and top bar on every page.
4. Plain view: jump chips, expanders, rhythm, print.
5. Dashboard shell behind `clusterDashboard`: the stage, detail panel, terminal dock, mobile cluster mode,
   and the flag plumbing in workflows.
6. Stage 2 wrap-up: STATUS, README, retrospective, release v0.3.0.

## 7. Left to the builder

- Exact tint values for the soft and scene tokens, as long as the contrast test passes.
- Spacing details inside components, on the 4px grid.
- How the chips scroll horizontally on small screens (snap or not).
- The mark's exact geometry. Sohan reviews it on the preview.
