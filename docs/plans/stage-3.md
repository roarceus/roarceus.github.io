# Stage 3 — Terminal engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working `kubectl` terminal in the cluster dashboard, plus a detail panel island and `?run=` deep
links, all in place on `/`. Released as **v0.4.0** with `clusterDashboard` still off in production.

**Architecture:**

- **Pure logic in `src/lib/`:** the parser (`lib/parser/`), the command registry and one module per verb
  (`lib/commands/`), the browser snapshot (`lib/content/snapshot.ts`), and the shared nanostores store
  (`lib/state/`). No React, no DOM.
- **Data:** one content-hashed `cluster.<hash>.json` built from the collections, preloaded by `/` and
  fetched by the terminal through `url()`.
- **Islands:** the terminal (`components/terminal/`) and the detail panel (`components/cluster/`), both
  `client:idle`, both server-rendered as today, sharing the store. `runCommand()` is the only way a
  command runs.

**Tech Stack:** Astro 7.4.13, React 19.3.1, `nanostores` + `@nanostores/react` (new), Vitest with
`happy-dom` + React Testing Library (new, dev), Playwright and axe, Lighthouse CI.

**Spec:**

- [`stage-3-design.md`](stage-3-design.md) (approved with changes, 2026-11-25).
- `docs/SPEC.md` §3 (structure), §4 ("One playground"), §7 (commands and terminal behavior), §10 (tests),
  §11 Stage 3. ADR 0003 (nanostores, written in Task 1). Rules: `CLAUDE.md`.

**Status:** approved 2026-11-25 (native execution). Milestone `Stage 3 — Terminal engine` (#68 to #76, one issue per task).

## Global Constraints

- **Flag:** everything new renders only when `isEnabled('clusterDashboard')`. Production (`release.yml`
  sets no flags) must render `/` exactly as v0.3.0, with or without `?run=`.
- **Security:** no `innerHTML`, `dangerouslySetInnerHTML`, `eval`, or `new Function` in `src/` (a static
  test enforces it from Task 6). Input, URLs, and content render only as React text and elements.
- **One path:** only `runCommand(input, source)` runs commands.
- **Structure:** `lib/` imports no React, Astro, or DOM (dependency-cruiser). Islands read content only
  from the snapshot. Every internal URL through `url()`.
- **Copy:** kubectl wording for output; site copy follows `docs/content-guide.md` (no em or en dashes,
  no `·`, no curly quotes); public project slugs only.
- **Tokens and a11y:** dark only, tokens only; visible focus; labeled input; reduced motion respected;
  targets ≥ 44 by 44; no page-level sideways scroll from 320 to 2560px.
- **Budgets:** JSON < 30 KB gzipped; terminal island code (no React runtime) ≤ 60 KB gzipped to start;
  startup JS on the dashboard `/` from the first measurement; production `/` and `/plain/` script weight
  unchanged; Lighthouse mobile perf ≥ 0.9, others ≥ 0.95. Coverage `src/lib/**` ≥ 90%, overall ≥ 80%.
- **Dependencies:** exact pins, each justified in its PR: `nanostores`, `@nanostores/react` (Task 5),
  `happy-dom`, `@testing-library/react` (Task 6).

## Review Focus

1. **Odd input.** Empty input, only spaces, unclosed quotes, 500 characters, Unicode, `kubectl` alone,
   `k get` with no resource: each gives a kubectl-style error line, never a throw or a blank entry.
   Pinned in Task 2.
2. **Snapshot missing or late.** A command typed before `cluster.json` arrives waits for it (shows
   nothing extra), and after a failed fetch every data command prints the connection error; `help`,
   `clear`, `version` still work. Pinned in Task 5.
3. **Hostile `?run=`.** `<script>`, `%00`, 1000 characters, `apply -f contact.yaml`, `logs updates -f`,
   `delete pod x`: ignored silently, page renders normally, nothing in the DOM from the URL. Pinned in
   Task 5 (sanitizer) and Task 7 (e2e).
4. **Back and Forward.** Two `describe` deep links then Back twice returns to the first view, then to the
   pre-selected role, without adding history or duplicating output. Pinned in Task 7.
5. **Screen reader noise.** Trimming at 50 entries, `clear`, and history recall announce nothing; each run
   announces exactly one summary. Pinned in Task 6.

## PR split

| #   | Branch                             | Title                                                         | Tasks | Issues |
| --- | ---------------------------------- | ------------------------------------------------------------- | ----- | ------ |
| 1   | `docs/stage-3-plan`                | `docs(terminal): plan stage 3 and adopt nanostores`           | 1     | #68    |
| 2   | `feat/stage-3-parser`              | `feat(terminal): add command parser and suggestions`          | 2     | #69    |
| 3   | `feat/stage-3-cluster-snapshot`    | `feat(content): add hashed cluster snapshot for the terminal` | 3     | #70    |
| 4   | `feat/stage-3-commands`            | `feat(commands): add command registry and v1 commands`        | 4     | #71    |
| 5   | `feat/stage-3-terminal-state`      | `feat(terminal): add shared store, run path, and deep links`  | 5     | #72    |
| 6   | `feat/stage-3-terminal-island`     | `feat(terminal): add interactive terminal island`             | 6     | #73    |
| 7   | `feat/stage-3-detail-panel-island` | `feat(cluster): add detail panel island and shareable links`  | 7     | #74    |
| 8   | `feat/stage-3-contact-command`     | `feat(commands): add contact manifest command`                | 8     | #75    |
| 9   | `docs/stage-3-wrap-up`             | `docs(docs): close out stage 3 in status, plan, and readme`   | 9     | #76    |

Each PR updates the README and STATUS for what it changes, ticks this file, and closes its issue.

---

### Task 1: Plan and decisions (PR 1) — done (#77)

**Files:** `docs/plans/stage-3-design.md`, this plan, `docs/adr/0003-nanostores-for-island-state.md`,
`docs/SPEC.md` (§4 `?run=` instead of `#pod/<slug>`; §10 happy-dom), `docs/STATUS.md`.

- [x] ADR 0003: context (cross-island state, `lib/state` without React), decision (nanostores +
      `@nanostores/react`), alternatives (Zustand vanilla, one big island), consequences.
- [x] SPEC §4 "One playground": the URL follows along with `?run=<command>` (read-only allowlist, 200
      characters), not a hash, because phones use `#cluster`. §10: happy-dom.
- [x] Milestone `Stage 3 — Terminal engine`; one issue per task with acceptance criteria and test approach;
      fill the Issues column.
- [x] STATUS: Stage 3 in progress. `pnpm check` green; draft PR.

### Task 2: Parser and suggestions (PR 2) — done (#78)

**Files:** Create `src/lib/parser/parse.ts`, `src/lib/parser/parse.test.ts`,
`src/lib/utils/suggest.ts`, `src/lib/utils/suggest.test.ts`.

**Interfaces — Produces:**

```ts
export interface ParsedCommand {
  program: 'kubectl' | 'clear' | 'help'; // `k` → 'kubectl'
  verb: string | undefined; // 'get', 'describe', ... (kubectl only)
  args: string[]; // positional, after the verb
  flags: Record<string, string | true>; // normalized names: n, o, f, help
  raw: string; // trimmed input
}
export type ParseResult = { ok: true; command: ParsedCommand } | { ok: false; error: string };
export const MAX_INPUT = 200;
export function parse(input: string): ParseResult;
export function suggest(word: string, candidates: readonly string[]): string | undefined; // distance ≤ 2
export function levenshtein(a: string, b: string): number;
```

- [x] **Tests first** (`parse.test.ts`):
  - `parse('k get pods -n projects')` → program `kubectl`, verb `get`, args `['pods']`, flags `{ n: 'projects' }`.
  - `--namespace=projects`, `--namespace projects`, `-o wide`, `--output=yaml`, `--help` normalize to `n`,
    `o`, `help: true`.
  - `-f`: takes the next token as its value unless it starts with `-` or is missing (`logs updates -f` →
    `f: true`; `apply -f contact.yaml` → `f: 'contact.yaml'`).
  - Quotes: `describe pod "ask trace"` → args `['ask trace']`; an unclosed quote → `{ ok: false, error:
'error: unterminated quoted string' }`.
  - `''` and `'   '` → `{ ok: false, error: '' }` (the terminal prints a bare prompt).
  - 201 characters → `error: input is too long (max 200 characters)`.
  - `kubectl` alone → program `kubectl`, verb `undefined` (the command layer prints help).
  - `clear`, `help`, `HELP ` → their programs; anything else first → `{ ok: false, error: 'command not
found: <word>' }` with the word escaped as text.
- [x] **Tests first** (`suggest.test.ts`): `levenshtein('kitten','sitting')` is 3; `suggest('gt', ['get',
'describe'])` → `'get'`; `suggest('xyz', ['get'])` → `undefined`; ties pick the first candidate.
- [x] Implement; run `pnpm test src/lib/parser src/lib/utils/suggest` → PASS; coverage for both files 100%.
- [x] Commit `feat(terminal): add command parser and suggestions`.

### Task 3: Cluster snapshot and hashed JSON (PR 3)

**Files:**

- Create: `src/lib/content/snapshot.ts` (+ test), `src/pages/cluster.[hash].json.ts`.
- Modify: `src/lib/content/queries.ts` (add `getSnapshot`), `src/layouts/BaseLayout.astro` (a named `head`
  slot), `src/pages/index.astro` (preload link, flag on only), `.github/workflows/ci.yml` (JSON budget
  step), `tests/e2e/dashboard.spec.ts`.

**Interfaces — Produces:**

```ts
export const SNAPSHOT_VERSION = 1;
export interface ClusterSnapshot {
  version: typeof SNAPSHOT_VERSION;
  build: { version: string; commit: string };
  profile: {
    name: string;
    title: string;
    location: string;
    summary: string;
    links: { github: string; linkedin: string; email: string };
    resume: string;
  };
  nodes: ClusterNode[]; // from clusterNodes()
  unscheduled: Pod[];
  selected: string | undefined; // preselectedRole node
  experience: {
    name: string;
    org: string;
    role: string;
    type: string;
    node: string;
    start: string;
    end: string;
    summary: string;
    tech: string[];
    highlights: string[];
  }[];
  projects: {
    slug: string;
    name: string;
    summary: string;
    phase: PodPhase;
    node: string | undefined;
    tech: string[];
    start: string;
    end: string | undefined;
    repo?: string;
    demo?: string;
  }[];
  skills: { category: string; items: { name: string; level?: number }[] }[];
  certifications: { name: string; issuer: string; status: 'issued' | 'in-progress'; date?: string }[];
  achievements: { title: string; date?: string; summary: string }[];
  updates: { slug: string; title: string; date: string; summary: string }[]; // latest 10
}
export function buildSnapshot(input: SnapshotInput, now: Date): ClusterSnapshot; // pure
export function snapshotHash(snapshot: ClusterSnapshot): string; // first 10 hex of SHA-256
// queries.ts
export async function getSnapshot(): Promise<{ snapshot: ClusterSnapshot; hash: string }>;
```

`SnapshotInput` holds the plain `data` of each collection (same shape `cluster.ts` already takes). Field
names follow the Zod output types; if a schema calls a field differently (e.g. `issuer`), use the schema's
name and update this block in the same PR.

- As built: `buildSnapshot(input)` takes no `now` (nothing in the snapshot depends on the clock, so the
  hash is stable; ages are computed in the browser). `profile` carries `tagline` (no `summary` field in the
  schema), projects map `tagline` to `summary`, achievements map `description` to `summary`, and
  `getSnapshot(build)` takes the build info from the caller (`lib` doesn't import `config`). The JSON is
  3.5 KB gzipped.
- [x] **Tests first:** `buildSnapshot` on fixtures: no Markdown bodies anywhere (`JSON.stringify` contains no
      `\n#`), `cluster: false` nodes absent from `nodes` but their projects absent from `projects` too, updates
      capped at 10 newest, drafts excluded; `snapshotHash` is stable for equal input and changes when one
      project name changes; length 10, `/^[0-9a-f]+$/`.
- [x] Endpoint: `getStaticPaths` returns the one `{ params: { hash } }`; `GET` returns the JSON with
      `content-type: application/json`. Built only when the flag is on (empty paths otherwise), so production
      ships no JSON.
- [x] `index.astro` (flag on): `<link slot="head" rel="preload" as="fetch" crossorigin="anonymous"
href={url(`cluster.${hash}.json`)}>`. The CI base-path grep already fails on a root-relative href.
- [x] CI build job, after the flag build: fail if `gzip -9 -c dist-dashboard/cluster.*.json | wc -c` >
      30720, and print the size to the step summary.
- [x] e2e `@dashboard`: the preload `href` matches `/cluster\.[0-9a-f]{10}\.json$/` and responds 200 with
      `version: 1`; production e2e: no `cluster.*.json` link on `/`.
- [x] `pnpm check`; commit `feat(content): add hashed cluster snapshot for the terminal`.

### Task 4: Command registry and v1 commands (PR 4)

**Files:** Create `src/lib/commands/types.ts`, `registry.ts`, `run.ts`, one module per verb (`get.ts`,
`describe.ts`, `top.ts`, `logs.ts`, `version.ts`, `cluster-info.ts`, `help.ts`, `config.ts`,
`port-forward.ts`), `yaml.ts` (serializer), and a test next to each. `apply.ts` comes in Task 8; until then
`apply` gives the unknown-command error.

**Interfaces — Produces:**

```ts
export type Cell = string | { text: string; run?: string; href?: string };
export interface Line {
  text: string;
  run?: string;
  href?: string;
  tone?: 'muted' | 'error' | 'ok';
}
export type CommandResult =
  | {
      kind: 'table';
      caption: string;
      columns: { key: string; label: string }[];
      rows: Record<string, Cell>[];
    }
  | { kind: 'detail'; target: Selection; lines: Line[] } // panel shows target; lines echo in terminal
  | { kind: 'yaml'; text: string }
  | { kind: 'lines'; lines: Line[]; stream?: boolean } // stream: reveal one by one
  | { kind: 'error'; message: string; suggestion?: string }
  | { kind: 'action'; action: 'clear' | 'navigate' | 'open' | 'contact'; href?: string; lines?: Line[] };
export interface Selection {
  kind: 'node' | 'pod';
  name: string;
}
export interface CommandContext {
  snapshot: ClusterSnapshot;
  base: string; /* url('') */
}
export interface Command {
  verb: string; // 'get', ... ; 'help' and 'clear' as programs map to verbs too
  readOnly: boolean; // deep-link allowlist (design 5.6)
  needsData: boolean; // false for help, clear, version
  run(cmd: ParsedCommand, ctx: CommandContext): CommandResult | Promise<CommandResult>;
  complete(args: string[], ctx: CommandContext): string[];
}
export const registry: ReadonlyMap<string, Command>;
export function execute(cmd: ParsedCommand, ctx: CommandContext): Promise<CommandResult>;
export function completions(input: string, ctx: CommandContext): string[]; // for Tab
```

- [ ] **Tests first, per command,** against one fixture snapshot (`src/lib/commands/fixtures.ts`):
  - `get nodes`: columns `NAME STATUS ROLES AGE VERSION`, one row per node, `STATUS` `Ready`.
  - `get experience`: same columns and rows as `experienceRows()` (reuse it); names `run: 'kubectl
describe node <node>'`.
  - `get pods -n projects` and `get projects`: `NAME READY STATUS RESTARTS AGE`; `-o wide` adds `NODE`
    and `TECH`; names run `describe pod <slug>`. `get pods` without `-n` → `No resources found in default
namespace.`
  - `get <resource> -o yaml` → `kind: 'yaml'`, `yaml.ts` serializer escapes `:` and `#` by quoting.
  - `describe node mastercontrol` / `describe pod asktrace` → `kind: 'detail'`; unknown name →
    `Error from server (NotFound): pods "x" not found` with `suggestion` from `suggest()`.
  - `top skills`: `NAME LEVEL USAGE` with a text bar (`█` × level, `░` padding to 5); no levels → `-`.
  - `get certificates` (`in-progress` for CKA and CKAD), `get achievements`, `get events` (roles,
    projects, updates newest first), `get all` (sections with counts and the first rows).
  - `logs updates` → lines newest first; `-f` → `stream: true`.
  - `cluster-info` → profile lines; `version` → `Client Version: v<build.version>` and the commit.
  - `config use-context plain` → `action: 'navigate'`, `href: url('plain/')`.
  - `port-forward github|linkedin` → `action: 'open'` with the profile link and a `Forwarding from
127.0.0.1 -> <host>` line; anything else → NotFound with suggestion.
  - `help` and `kubectl --help` and bare `kubectl` → lines listing every command, each with `run`.
  - Unknown verb → `error: unknown command "x" for "kubectl"` + `suggestion`; `clear` → `action: 'clear'`.
- [ ] Implement; `pnpm test src/lib/commands` → PASS; `src/lib` coverage ≥ 90%.
- [ ] Commit `feat(commands): add command registry and v1 commands`.

### Task 5: Shared store, run path, and deep links (PR 5)

**Files:** Create `src/lib/state/terminal.ts`, `src/lib/state/selection.ts`, `src/lib/state/run.ts`,
`src/lib/state/deep-link.ts` (+ tests), `src/lib/state/snapshot-loader.ts` (+ test); `package.json`
(`nanostores`, `@nanostores/react` exact pins).

**Interfaces — Produces:**

```ts
export type RunSource = 'input' | 'chip' | 'link' | 'deep-link'; // Stage 4 adds 'map'
export interface Entry {
  id: number;
  input: string;
  source: RunSource;
  result: CommandResult;
}
export const $terminal: MapStore<{ entries: Entry[]; history: string[]; announcement: string }>;
export const $snapshot: MapStore<{ status: 'idle' | 'loading' | 'ready' | 'error'; data?: ClusterSnapshot }>;
export const $selection: WritableAtom<Selection | undefined>;
export const MAX_ENTRIES = 50;
export function runCommand(input: string, source: RunSource): Promise<void>; // the only run path
export function clearTerminal(): void;
export function loadSnapshot(href: string, fetcher?: typeof fetch): Promise<void>; // retry = call again
export function summarize(entry: Entry): string; // the live-region text
export function readRunParam(search: string): string | undefined; // ≤ 200, parses, allowlisted
export function runHref(input: string, location: { pathname: string }): string; // `${pathname}?run=...`
```

- [ ] **Tests first:**
  - `runCommand('get nodes','input')` appends one entry, pushes history, sets `announcement` to
    `summarize(entry)`; the 51st run drops the oldest entry and `announcement` still names only the newest.
  - Blank input appends a bare-prompt entry and announces nothing; history skips blanks and consecutive
    duplicates.
  - A `detail` result sets `$selection`; `clear` empties entries, keeps history, resets `$selection` to
    `snapshot.selected` (as a node), and sets `announcement` to `''`.
  - With `$snapshot.status` `loading`, `runCommand` awaits it; on `error`, data commands append
    `Unable to connect to the server: failed to load cluster data`, while `help`, `clear`, `version` run.
  - `loadSnapshot` with a fetcher that rejects, returns 404, or returns `{ version: 2 }` → `status: 'error'`;
    a second call that succeeds → `ready`.
  - `readRunParam`: `?run=describe+pod+asktrace` → the command; `?run=apply+-f+contact.yaml`,
    `?run=logs+updates+-f`, `?run=delete+pod+x`, `?run=<script>`, 201 characters, `%00`, missing → `undefined`.
  - `runHref('kubectl describe pod asktrace', { pathname: '/pr-preview/pr-9/' })` →
    `/pr-preview/pr-9/?run=kubectl+describe+pod+asktrace`.
- [ ] Implement `runCommand` as the single place that parses, executes, records `source`, and updates both
      stores (a comment marks it as the Stage 6 analytics hook).
- [ ] `pnpm check`; commit `feat(terminal): add shared store, run path, and deep links`.

### Task 6: Terminal island (PR 6)

**Files:**

- Create: `src/components/terminal/Terminal.tsx`, `TerminalInput.tsx`, `ResultView.tsx` (shared with the
  panel), `ResultTable.tsx`, `LiveRegion.tsx`, tests (`*.test.tsx`, `// @vitest-environment happy-dom`),
  `tests/static/no-raw-html.test.ts`, `.github/scripts/check-budgets.mjs`, `.github/budgets.json`.
- Modify: `src/components/terminal/TerminalDock.astro` (renders `<Terminal client:idle>` with the
  snapshot href and the server-rendered table as initial output), `astro.config.mjs` (`manualChunks`:
  `react`, `react-dom`, `scheduler` → `react-runtime`), `vitest.config.ts`, `package.json`, `ci.yml`,
  `tests/e2e/dashboard.spec.ts`.

**Interfaces:** Consumes Tasks 4 and 5. Produces `<ResultView result={CommandResult} />` for Task 7.

- [ ] **Component tests first:** Enter runs via `runCommand(…,'input')`; Up/Down walk history; Tab with one
      match completes, two Tabs list matches; Ctrl+L clears; Ctrl+C prints `^C` and empties the line; a chip
      click calls `runCommand(label,'chip')` and `preventDefault`s the link; table names run their `run`;
      `ResultView` renders every result kind as elements (a `<script>` string shows as text);
      `LiveRegion` changes only when `announcement` changes; the error state shows a `Retry` button that calls
      `loadSnapshot` again; Collapse toggles `aria-expanded` at 768 to 1023px; a `stream` result reveals lines one by one,
      and all at once under `prefers-reduced-motion`.
- [ ] Static test: no `innerHTML`, `dangerouslySetInnerHTML`, `eval(`, `new Function` in `src/`.
- [ ] Budgets script (node, no deps): from `dist-dashboard/index.html`, collect island component and
      renderer URLs and their static `import` graph (skip `import(`), gzip each; report island code (excluding
      `react-runtime-*`) and the startup total; fail over `.github/budgets.json` limits (island 61440 bytes;
      startup set from this PR's measurement + 5%). Also total scripts of `dist/index.html` and
      `dist/plain/index.html` must not exceed their recorded v0.3.0 values. Runs in the build job.
- [ ] e2e `@dashboard`: type `kubectl get nodes` + Enter → table appears; `k get pods -n projects`,
      `top skills`, `help` work; every chip and table name click keeps `page.url()` on `/` (no `framenavigated`
      to another path); `getx nodes` shows `Did you mean this?`; `clear` empties output; axe, no overflow, no
      console errors at every project size; a routed failure of `cluster.*.json` shows the error and Retry
      recovers.
- [ ] `pnpm check`; Lighthouse passes; commit `feat(terminal): add interactive terminal island`.

### Task 7: Detail panel island and shareable links (PR 7)

**Files:** Create `src/components/cluster/DetailPanel.tsx`, `CopyLink.tsx` (+ tests),
`src/components/cluster/deep-link.ts` (browser glue: reads `location`, calls `runCommand`, handles
`pushState`/`replaceState`/`popstate`). Modify `DetailPanel.astro` (wraps the island, keeps the SSR
markup), `src/pages/index.astro`, `tests/e2e/dashboard.spec.ts`, `tests/smoke/smoke.spec.ts`.

- [ ] **Component tests first:** the panel renders the server role until `$selection` changes, then the
      node or pod (header `describe pod/<slug>`, summary, status pill, tech, links to the project page and
      plain section via `url()`); below 768px it renders the latest `$terminal` result with `ResultView`;
      Copy link writes `runHref(...)` and announces `Link copied`; when the Clipboard API rejects, it selects
      a read-only text field with the link.
- [ ] Deep links: on hydrate, `readRunParam(location.search)` → `runCommand(cmd,'deep-link')`; `describe`
      results `pushState`, others `replaceState`; `popstate` re-reads and runs without pushing; on phones a
      valid `?run=` opens cluster mode (sets `location.hash = 'cluster'` via `replaceState`).
- [ ] e2e `@dashboard`: `/?run=kubectl+describe+pod+asktrace` shows the pod; two describe links + Back twice
      restores each view; `?run=%3Cscript%3E` and `?run=apply+-f+contact.yaml` render the default page with no
      console errors; Copy link puts the right URL on the clipboard (Chromium, granted permission).
- [ ] Smoke: production `/?run=kubectl+describe+pod+asktrace` renders no `Cluster map` region and the same
      hero; preview `?run=` shows the pod's details (also proves the JSON loads under the preview base path).
- [ ] `pnpm check`; commit `feat(cluster): add detail panel island and shareable links`.

### Task 8: Contact manifest command (PR 8)

**Files:** Create `src/lib/commands/apply.ts` (+ test), `src/components/terminal/ContactManifest.tsx`
(+ test), loaded with `import()` from `ResultView` on `action: 'contact'`.

- [ ] **Tests first:** `apply -f contact.yaml` → `action: 'contact'`; other files → `error: the path "x"
does not exist`; the manifest form validates with `validateContact` (errors next to fields, kubectl
      style `error: validation failed: spec.email: invalid`), submits with `contactPayload`, shows
      `contactmessage.v1/sohan created` on `sent` and a retry line on `offline` or `server-error`.
- [ ] Budgets: the contact chunk is lazy (not in the startup total).
- [ ] e2e `@dashboard`: fill and submit against a routed Web3Forms mock.
- [ ] `pnpm check`; commit `feat(commands): add contact manifest command`.

### Task 9: Stage 3 wrap-up (PR 9)

- [ ] README: features (commands), architecture diagram (parser, registry, store, islands, snapshot),
      budgets, status; refresh `docs/assets/screenshot-dashboard.png` with terminal output.
- [ ] STATUS: sign-off with measurements and links, retrospective; tighten the island budget to the
      measured size + 10%.
- [ ] This plan ticked; then Sohan merges the release PR for v0.4.0 and production smoke confirms the
      dashboard is still off.
