# Stage 3 design: the terminal engine

_Status: approved with changes (2026-11-25). Builds on SPEC §4 ("One playground"), §7, §11 Stage 3,
and [ADR 0002](../adr/0002-design-direction-tool-and-game.md)._

## 1. Intent

The dashboard becomes a single playground: visitors type `kubectl` commands, or tap chips and names, and
the answer shows up in the same place. No page loads, no bouncing between the dashboard and the plain
view. Recruiters can share a link that opens straight to a project's `describe` view.

Success: every v1 command in SPEC §7 works and looks like real kubectl, chips and table names run in place,
a `?run=` link opens the right view, and the plain view and production `/` are exactly as fast as today.

## 2. Goals, non-goals, anti-goals

- **Goals:** parser, command registry, all v1 commands, structured output renderer, history, Tab
  autocomplete, chips, "did you mean", `?run=` deep links with Copy link, a shared store between the
  terminal and the detail panel, phone output in the bottom sheet, the collapsible dock at 768 to 1023px
  (deferred from Stage 2).
- **Non-goals:** the map (Stage 4), the boot sequence (Stage 5), the game layer and easter eggs, GoatCounter
  command events (Stage 6), persisting history across visits.
- **Anti-goals:** the dashboard visible in production; a heavier plain view or no-JS hero; any HTML from
  input, URLs, or content reaching the DOM unescaped; output that doesn't look like kubectl; a blank or
  broken terminal when something fails.

## 3. Constraints (decided together)

- **Flag:** stays `clusterDashboard`. On in PR previews, off in production until Stage 4 flips it. With
  the flag off, `/` renders exactly as today and `?run=` is ignored; production smoke tests check both.
- **Security:** input is parsed, never evaluated. No `innerHTML` or `dangerouslySetInnerHTML` anywhere in
  the terminal or panel. Commands return structured results that React renders as elements.
- **Performance:** the terminal hydrates with `client:idle`. YAML output and the contact flow load through
  dynamic `import()`. The island's initial JS stays small (budget below).
- **Structure (SPEC §3):** `src/lib/parser/`, `src/lib/commands/`, `src/lib/state/` hold framework-free
  TypeScript (no React, no DOM). Islands live in `src/components/terminal/` and `src/components/cluster/`.

## 4. Approaches

1. **Island shape.** _Picked: A._
   - A. Two islands (terminal, detail panel) sharing a store in `src/lib/state/`. The panel still
     pre-renders the selected role, so no-JS is unchanged. Stage 4 adds the map as a third island on the
     same store.
   - B. One island for the whole dashboard: no store, but one large bundle and hydration cost that grows
     every stage.
2. **Store.** _Picked: nanostores_ (with `@nanostores/react` in the islands): framework-agnostic, under
   1 KB, recommended by Astro for cross-island state. Zustand's vanilla store works too but is larger and
   React-first. ADR 0003 records this.
3. **Content in the browser.** _Picked: A._
   - A. One built JSON file, fetched when the terminal starts: cached, keeps `/` HTML the same weight.
   - B. Inline as island props: one less request, but every visit pays for it, including no-JS visitors.

## 5. Design

### 5.1 Data: `cluster.<hash>.json`

- `src/lib/content/snapshot.ts` builds a `ClusterSnapshot` from the collections (pure, typed from the Zod
  schema output types): profile basics and links, nodes and pods (from `cluster.ts`), experience and
  education summaries, projects (slug, name, summary, status, node, tech, links, dates), skills,
  certifications, achievements, the latest updates (title, date, slug, short summary), and the build
  version. No Markdown bodies: `describe` shows a summary and links to the full page or plain-view section.
- `snapshotHash(snapshot)` is a short SHA-256 of the serialized JSON. An endpoint
  `src/pages/cluster.[hash].json.ts` emits `/cluster.<hash>.json`; `index.astro` computes the same hash and
  passes `url(\`cluster.${hash}.json\`)` to the island, so new HTML can never pair with stale data.
- `index.astro` adds `<link rel="preload" as="fetch" crossorigin="anonymous">` for that URL (flag on only),
  so the download starts before the island hydrates. BaseLayout gets a `head` slot for this.
- **Failure:** the island shows a real-looking error line
  (`Unable to connect to the server: failed to load cluster data`) and a `Retry` button. Commands that
  don't need data (`help`, `clear`, `version`) still work. Never a blank terminal.
- **Budgets (CI, a build-job step that reads the build output and gzips each file):**
  - `cluster.<hash>.json`: under 30 KB gzipped.
  - **Terminal island code**, excluding the shared React runtime (`react`, `react-dom`, and Astro's island
    loader): starts at 60 KB gzipped and is tightened after the first measurement.
  - **Startup JS on `/` with the dashboard on**: the runtime, every island, and every chunk those islands
    import statically. Lazily loaded chunks (YAML output, the contact flow) are excluded. The budget is set
    from the first real measurement plus a small margin.
  - The production `/` (no-JS hero) and `/plain/` keep their current JS weight: the step fails if either
    page's script total grows.

### 5.2 Parser and commands (`src/lib/parser/`, `src/lib/commands/`)

- `parse(input)` → `{ ok: true, command }` or `{ ok: false, error }`. Tokenizes on whitespace with quotes,
  resolves `k` to `kubectl`, splits flags (`-n`, `-o`, `-f`, `--help`), caps input at 200 characters.
- Registry: one module per command (`name`, `aliases`, `run(args, snapshot)`, `complete(prefix,
snapshot)`). `run` returns a `CommandResult` union: `table`, `detail`, `yaml`, `lines`, `error`, and
  `action` (`clear`, `navigate` for `use-context plain`, `open` for `port-forward`, `contact` for `apply -f
contact.yaml`). Output is testable without the DOM.
- Errors follow kubectl wording: `error: unknown command "x" for "kubectl"`,
  `Error from server (NotFound): pods "x" not found`, plus `Did you mean this?` from a Levenshtein match
  (distance ≤ 2) against command, resource, and slug names.
- `get <resource> -o yaml` uses a small hand-written serializer (lazy-loaded; no YAML dependency: the data
  is flat).
- `logs updates -f` reveals lines one by one (instant under reduced motion).
- `port-forward github|linkedin` prints `Forwarding from 127.0.0.1 -> github.com/...` with the real link and
  opens it in a new tab (the Enter key or click is the user gesture; the printed link is the fallback).
- `apply -f contact.yaml` renders the contact form as a YAML-styled manifest, reusing `lib/contact`
  validation and submit (lazy-loaded).

### 5.3 State (`src/lib/state/`)

- `$terminal`: output entries (capped at the last 50 to keep the DOM small) and command history.
- `$selection`: what the detail panel shows (`{ kind: 'node' | 'pod', name }`), set by `describe` and by
  clicking names. Stage 4's map reads and writes the same atom.
- `runCommand(input, source)` is the **only** path for running a command: typing, chips, table names, and
  `?run=` all call it, and nothing else runs commands. It echoes the command visibly, so taps teach the
  CLI. `source` (`'input' | 'chip' | 'link' | 'deep-link'`, later `'map'`) is recorded so Stage 6's
  analytics events hook in here; no second path gets added later.
- `clear` (and Ctrl+L) empties the output entries but keeps command history (as a shell does), resets
  `$selection` to the pre-selected role, and drops `run` from the URL with `replaceState`.

### 5.4 Terminal UI (`src/components/terminal/`)

```
┌ Terminal ─────────────────────────────────────────── [Collapse] ┐
│ $ kubectl get experience                                       │
│ NAME            ROLE                  NODE           STATUS  AGE│
│ mastercontrol   devops-engineer-co-op mastercontrol  Completed …│
│ $ kubectl describe pod asktrace                                │
│ → shown in the detail panel                    [Copy link]      │
│ ─────────────────────────────────────────────────────────────── │
│ $ ▌ (labeled input)                                             │
│ [get experience] [get pods -n projects] [top skills] [help]    │
└─────────────────────────────────────────────────────────────────┘
```

- Pre-rendered on the server with today's `kubectl get experience` table, so no-JS and first paint match
  Stage 2. Hydration adds the input and turns chips into commands.
- Output is a `role="log"` region, and the input is a real labeled `<input>`. Screen readers hear only the
  newest result: a separate visually hidden `aria-live="polite"` region holds a text summary of the latest
  entry (for a table, the command plus its row count and first rows), replaced on each run. Trimming old
  entries at the 50 cap and `clear` never announce anything.
  Keys: Enter runs, Up/Down history, Tab completes (a second Tab lists options), Ctrl+L clears, Ctrl+C
  cancels the line (`^C`). Focus stays in the input on desktop.
- Chips and table names stay real `<a>` links to the plain view; the island intercepts the click and runs
  the command instead (no-JS still works).
- **Desktop (≥ 1024px):** docked under the stage, output scrolls inside its own box (`--terminal-h`).
- **Tablet (768 to 1023px):** same, plus a Collapse/Expand button (state kept for the session only).
- **Phones (< 768px):** cluster mode shows the chip bar and a compact input. Output goes into the bottom
  sheet, and the input is not auto-focused, so the keyboard doesn't pop up on its own. The sheet holds the
  detail panel island, so on phones that island renders the latest `$terminal` result (a table, lines, or
  an error); a `describe` result shows as the usual details. The terminal's own output box is hidden there.
- Tables wider than the box scroll inside it; no page scroll at any width.

### 5.5 Detail panel (`src/components/cluster/`)

- Becomes an island that hydrates with `client:idle`, server-rendered with the pre-selected role exactly as
  today. On `$selection` change it renders the node or pod: header `describe pod/<slug>`, summary, status,
  tech tags, links (full project page, plain-view section), and a `Copy link` button.
- Copy link writes the `?run=` URL for that view (Clipboard API with a fallback that selects the text) and
  confirms with a polite live message.

### 5.6 Deep links (`?run=`)

- On load (flag on only), the island reads `run`, caps it at 200 characters, parses it, and runs it only if
  it's on the read-only allowlist: `get`, `describe`, `top`, `logs` (without `-f`), `version`, `help`,
  `cluster-info`. Anything else is ignored silently and the page loads normally.
- Unknown names give the normal NotFound error. All output is React elements.
- `describe` uses `history.pushState`; other commands use `replaceState`. `popstate` re-reads `run` and
  restores the selection and output, without adding history.
- On phones, a `?run=` link opens straight into cluster mode.
- `/` keeps its canonical link (already the production URL), so `?run=` variants aren't indexed.
- SPEC §4 "One playground" changes from `#pod/<slug>` to `?run=` (the `#cluster` hash is taken on phones).

## 6. Tests

- **Unit (`lib/`, TDD):** parser, every command, Levenshtein suggestions, YAML serializer, snapshot and
  hash, store actions, deep-link sanitizer and allowlist. Coverage stays ≥ 90% for `src/lib`.
- **Component (islands):** Vitest with `happy-dom` and React Testing Library (new dev dependencies; SPEC §10
  updated from jsdom to happy-dom): input keys,
  chips, rendering each result kind as elements, failure and retry, Copy link.
- **e2e (`@dashboard`):** core commands; chips, table names, and describe never navigate; `?run=` opens the
  view and Back/Forward restore it; invalid `?run=` loads normally; a failed JSON fetch shows the error and
  Retry works; the preview-base build fetches the JSON under its base path; phone output in the sheet;
  axe, no overflow, no console errors.
- **Smoke:** production renders no dashboard, with and without `?run=`; previews render it.

## 7. Calls I made (check these)

- History lives for the session only (no `localStorage`).
- Output keeps the last 50 entries.
- No runtime Zod in the browser (too heavy); the island checks the snapshot's `version` field and shape.
- Budgets as in 5.1: island code without the React runtime from 60 KB gzipped; startup total from the first
  measurement; lazy chunks excluded; production `/` and `/plain/` unchanged.
- Phones get a compact input in cluster mode, never auto-focused; the sheet (detail panel island) shows
  the latest result, so both islands share one result renderer.
- `port-forward` opens a new tab and also prints the link.

## 8. Left to the builder

Exact column widths and spacing (tokens and `Table` styling apply), the copy of help text and error lines
(kubectl wording, copy rules apply), and internal module boundaries within the folders above.
