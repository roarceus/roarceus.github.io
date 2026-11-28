# Stage 4: 3D cluster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Port the approved 3D concept to production as the desktop cluster view, with a 2D map for everyone
else, in five sub-stage PRs (4a to 4e), shipping v0.5.0 behind flags.

**Architecture:** A pure layout model in `src/lib/scene/` feeds both renderers: a server-rendered SVG map
(2D) and a plain three.js scene in a thin React island (3D, lazy). Commands stay the only way state changes
(`runCommand` to stores); one adapter is the only bridge from the stores to three.js objects.

**Execution:** native (chosen 2026-11-27): implemented in-session task by task, then one fresh reviewer
checks each sub-stage branch before its PR is marked ready.

**Tech Stack:** Astro 7, React 19 islands, nanostores, TypeScript 6, Tailwind 4 tokens, three `0.187.0`
(npm, pinned), Vitest 5, Playwright 1.65 + axe.

**Spec:** [`docs/plans/stage-4-design.md`](stage-4-design.md) (approved 2026-11-27); ADR 0005; SPEC §4, §7,
§9, §11. Read the design before any task.
[Milestone: Stage 4 — 3D cluster](https://github.com/roarceus/roarceus.github.io/milestone/5), issues #97 to
#109 (one per task) plus #81 (folded into Task 4).

## Global Constraints

- three is pinned exactly at `0.187.0`; named imports from `three` and
  `three/addons/controls/OrbitControls.js` only. No CDN, CSP stays `'self'`.
- No `innerHTML`, `outerHTML`, `dangerouslySetInnerHTML`, `eval`, or `set:html` anywhere (static test).
- `lib/` never imports three.js, React, or Astro. three.js code lives in `src/components/cluster/scene3d/`.
- Only `scene3d/adapter.ts` touches three.js objects from store state; components and commands never do.
- Flags: `clusterDashboard` gates the dashboard, new `cluster3d` gates the scene; on in previews, off in
  production.
- 3D loads only at 1024x700 or larger with WebGL; DPR capped at 2; render on demand; pause when hidden.
- Budgets: 3D chunk about 155 KB gzipped (141 KB measured + 10%); dashboard startup and island limits
  re-baselined in 4a to measured + 10%, stop and ask if the total increase is over about 5 KB gzipped;
  phone and plain-view budgets unchanged.
- `exec` and `exit` never run from `?run=`; base64 is called an encoding, never encryption.
- Content facts only from content files or me; unknowns stay `TODO(sohan)`. Copy: no em or en dashes, no
  `·`, no curly quotes; first person (we, I) in docs.
- Every internal URL through `url()`; dark theme tokens only (`--scene-*` in the scene); WCAG AA.

## Review Focus

- **Crowded nodes:** a node with more pods than the concept's 12 slots must not overlap or drop pods
  silently (test in Task 3: 20 pods on one node all get distinct positions inside the platform).
- **Odd names:** mixed case, short component names (`etcd`), `pod/<slug>` and `<slug>` forms, unknown
  names with a suggestion (tests in Task 2).
- **Crossing 1024x700 mid-session, and 200% zoom:** switch renderer without losing selection or leaving a
  dead canvas (e2e in 4b Task 7 and 4e Task 13).
- **`?run=` to something that doesn't exist, or a privileged verb:** shows the kubectl error or is ignored,
  never crashes or runs `exec` (tests in Task 2 and 4d Task 11).
- **Hidden tab and StrictMode double mount:** no loop running while hidden, no leaked GPU memory (4b Task
  7).

---

## Sub-stage 4a: data, commands, layout, 2D map

Two PRs if it passes about 500 lines: 4a-1 (Tasks 1 and 2), 4a-2 (Tasks 3 to 5).

### Task 1: Content model for the scene (#97)

**Files:**

- Modify: `src/lib/content/schemas/collections.ts` (updates: optional `node`, `project`; achievements:
  optional `node`; certifications: optional `id`)
- Modify: `src/lib/content/cluster.ts` (`ClusterNode`, `clusterNodes`, `unscheduledPods`)
- Modify: `src/lib/content/integrity.ts`, `src/lib/content/snapshot.ts`
- Modify content: `src/content/updates/*.md` (confirmed links), projects moved to `personal` after I confirm
- Test: `cluster.test.ts`, `integrity.test.ts`, `snapshot.test.ts`, `schemas/collections.test.ts`

**Interfaces:**

- Produces: `ClusterNode` gains `cordoned: boolean` and `role: 'work' | 'education' | 'teaching' |
'personal'`; `PERSONAL_NODE = 'personal'` (built in, label `Personal projects`, on the map only when a
  project uses it); `clusterNodes()` now returns cordoned nodes (`cluster: false`) last with
  `cordoned: true` instead of dropping them; `unscheduledPods()` returns only `pending` projects.
- Produces: `SNAPSHOT_VERSION = 2`; snapshot `projects[].story: string[]` (plain-text paragraphs of the
  body), `achievements[].id` and `.node`, `certifications[].id`, `updates[].node` and `.project`.

- [ ] **Step 1: Write failing tests**
  - `clusterNodes` keeps `mumbai` with `cordoned: true` after live nodes; live nodes `cordoned: false`.
  - A project with `node: personal` creates the `personal` node (`role: 'personal'`); no project, no node.
  - `unscheduledPods` returns only `pending` projects.
  - Integrity: a `running` or `completed` project without a node fails with
    `project "<slug>" is <status> but has no node`; `node: personal` passes.
  - Achievements: `node` from the field, else from matching `org` to an experience or education org
    (`MasterControl` to `mastercontrol`, `University of Mumbai` to `mumbai`), else `undefined`.
  - Updates: `node`, `project` pass through; an unknown `project` or `node` fails integrity.
  - Ids: certification `id` from the field, else the slug of its name; achievement `id` is the slug of
    its title (`Labs Intern Award` to `labs-intern-award`); duplicate ids fail integrity.
  - Snapshot: `story` has no Markdown markup or HTML; version 2; gzipped size under 30720 bytes.
- [ ] **Step 2: Run** `pnpm exec vitest run src/lib/content` and see them fail.
- [ ] **Step 3: Implement** the schema fields, `clusterNodes`/`unscheduledPods` changes, integrity rule,
      and snapshot fields. Story paragraphs: split the body on blank lines, strip Markdown syntax to text.
- [ ] **Step 4: Content:** set `node`/`project` on the seven linked updates (design §7, including
      `launched-personal-website` to `roarceus-github-io`); set `node: personal` on `roarceus-github-io`
      and `meeting-notes-react`, and `node: mumbai` on `book-review-system`.
- [ ] **Step 5: Run** `pnpm exec vitest run src/lib/content` and see them pass; fix any existing test that
      expected cordoned nodes to be dropped (map callers filter `cordoned` until Task 4).
- [ ] **Step 6: Commit** `feat(content): add cordoned and personal nodes and scene links`

### Task 2: Commands for the new objects (#98)

**Files:**

- Modify: `src/lib/commands/get.ts`, `describe.ts`, `types.ts`, `run.ts` (completion), `fallback.ts`
- Create: `src/lib/commands/kube-system.ts` (components, names, copy), `src/lib/state/scene.ts`
- Modify: `src/lib/state/selection.ts` (kinds), `src/lib/state/run.ts` (filter results)
- Test: next to each file

**Interfaces:**

- Produces: `Selection.kind` adds `'component' | 'certificate' | 'achievement' | 'home'`.
- Produces: `$sceneFilter = atom<{ skill: string } | undefined>()` in `src/lib/state/scene.ts`.
- Produces: `CommandResult` gains `{ kind: 'filter'; skill: string; rows: ...; lines?: Line[] }` or reuses
  `table` plus a `filter` field (implementer's choice, one shape); `runCommand` sets `$sceneFilter`.
- Produces: `COMPONENTS` in `kube-system.ts`: `{ name: 'kube-apiserver-control-plane', short:
'kube-apiserver', description: string }` and the same for `etcd`, `kube-scheduler`,
  `kube-controller-manager`.

- [ ] **Step 1: Write failing tests** (exact kubectl shapes):
  - `get nodes` lists `mumbai` with `Ready,SchedulingDisabled` and `personal` with ROLES `personal`; the
    header count line counts both.
  - `get pods -n kube-system` lists the four static pod names, all `Running`.
  - `describe pod etcd -n kube-system` and `describe pod etcd-control-plane -n kube-system` give the same
    view and select `{ kind: 'component', name: 'etcd-control-plane' }`; `describe pod etcd` without
    `-n kube-system` is `Error from server (NotFound): pods "etcd" not found` with a suggestion.
  - `get cs` and `get componentstatuses` print `Warning: v1 ComponentStatus is deprecated in v1.19+` as the
    first line, then `NAME STATUS MESSAGE ERROR` rows for `scheduler`, `controller-manager`, `etcd-0`.
  - `describe pod <pending-slug>` shows `Status: Pending` and the event `Warning FailedScheduling ...
0/<n> nodes are available` with reason `Unschedulable` (fixture keeps one pending project).
  - `describe certificate <id>` and `describe achievement <id>` select them; unknown ids suggest.
  - `get pods -l skill=terraform -n projects` lists matching pods and sets `$sceneFilter` to
    `{ skill: 'terraform' }`; any other command that selects something clears it; case-insensitive.
  - Tab completes short and long component names after `-n kube-system`, certificate and achievement ids,
    and skill names after `-l skill=`.
  - `?run=` allowlist accepts all of these (read-only).
- [ ] **Step 2: Run** `pnpm exec vitest run src/lib` and see them fail.
- [ ] **Step 3: Implement** in the files above; copy in `kube-system.ts` describes only what exists now.
- [ ] **Step 4: Run** `pnpm exec vitest run src/lib` and see them pass.
- [ ] **Step 5: Commit** `feat(commands): add kube-system, cs, certificate, and skill selector commands`

### Task 3: Layout model (#99)

**Files:**

- Create: `src/lib/scene/layout.ts`, `src/lib/scene/layout.test.ts`

**Interfaces:**

- Produces:

  ```ts
  type Vec3 = readonly [number, number, number];
  interface SceneLayout {
    nodes: { name: string; position: Vec3; radius: number; cordoned: boolean; kubelet: Vec3 }[];
    controlPlane: {
      position: Vec3;
      radius: number;
      components: { name: string; position: Vec3; shape: 'prism' | 'cylinder' | 'octahedron' | 'torus' }[];
    };
    pods: {
      slug: string;
      node: string | undefined;
      position: Vec3;
      size: number;
      phase: PodPhase;
      faded: boolean;
    }[];
    markers: { kind: 'certificate' | 'achievement'; id: string; position: Vec3 }[];
    labels: { id: string; text: string; anchor: Vec3; priority: 0 | 1 | 2 | 3 }[];
  }
  function sceneLayout(snapshot: ClusterSnapshot): SceneLayout;
  function arc(from: Vec3, to: Vec3, segments: number): Vec3[];
  ```

  Label priority: 0 selection, 1 nodes, 2 pods, 3 components and markers.

- [ ] **Step 1: Write failing tests:**
  - control plane at `[0, 0, 0]`; live nodes on a ring ordered by recency; cordoned nodes on the outer
    edge; `personal` placed like a live node.
  - Today's fixture snapshot gives the pinned positions (snapshot test of the rounded layout), tuned so the
    arrangement matches the concept's `LAYOUT`.
  - 20 pods on one node all inside its radius with pairwise distance at least `size`.
  - pending pods sit next to the scheduler component; cordoned pods `faded: true`.
  - deterministic: two calls return deep-equal results; no node overlaps another or the control plane.
  - `arc` starts and ends at its points and peaks above both.
- [ ] **Step 2: Run** `pnpm exec vitest run src/lib/scene` and see them fail.
- [ ] **Step 3: Implement** `sceneLayout` and `arc` (pure math, no three.js).
- [ ] **Step 4: Run** and see them pass. **Step 5: Commit** `feat(cluster): add the scene layout model`

### Task 4: The 2D map (#100)

Starts with a short design proposal (desktop, tablet, 1024x700 sizes, selection and filter states, no-JS)
and waits for my go. Covers #81: pod names are the most prominent text with a short tech hint under each,
status pills are quieter, and nodes are sized to their pods.

**Files:**

- Create: `src/components/cluster/ClusterMap.astro` (SVG from `sceneLayout`, top-down),
  `src/components/cluster/map-sync.ts` (store to attribute sync)
- Modify: `ClusterStage.astro` (map from 768px; phones keep the role cards), `Terminal.tsx` (start sync)
- Test: `map-sync.test.ts`, `tests/e2e/dashboard.spec.ts`

**Interfaces:**

- Consumes: `sceneLayout`, `$selection`, `$sceneFilter`, the existing delegated `startPageRunLinks()`.
- Produces: SVG objects as `<a href={plainHref} data-run={command} data-object={kind:name}>`;
  `startMapSync(root: Element): () => void` sets `data-selected` and `data-dimmed` attributes.

- [ ] **Step 1: Write failing tests:** `map-sync` marks the selected object and dims non-matching pods
      for a filter, clears on unmount; e2e: every object type is present, clicking a pod runs `describe pod`
      in place and keeps `/`, no-JS links go to plain sections, no scroll at 1024x700, axe clean, no empty
      boxes 768 to 2560px.
- [ ] **Step 2: Run** them and see them fail.
- [ ] **Step 3: Implement** the SVG map and the sync; delete the Stage 2 cards above 768px.
- [ ] **Step 4: Run** them and see them pass, then the budgets: `node .github/scripts/check-budgets.mjs
dist dist-dashboard`. Re-baseline startup and island to measured + 10% only if the total increase is
      under about 5 KB gzipped; otherwise stop and ask.
- [ ] **Step 5: Commit** `feat(cluster): replace the placeholder cards with the 2d map`

### Task 5: Docs for 4a (#101)

- [ ] SPEC §11 (Stage 4 takes boot and pod interior; Stage 5 keeps transitions, states, OG images, phone
      tap-first), SPEC §7 (new commands), README (features, map), STATUS, this plan ticked. Commit
      `docs(docs): update the spec for stage 4`.

---

## Sub-stage 4b: the static 3D scene

Starts with a design proposal for the one-screen proportions at 1024x700 (design §11) and waits for my go.

### Task 6: ADR, dependency, flag, loader (#102)

- Files: `docs/adr/0006-plain-three-js.md` (numbers and test setup from design §4; ADR 0002's library
  choice marked superseded with a link), `package.json` (`three` `0.187.0` exact, `@types/three` matching),
  `src/config/features.ts` (`cluster3d`), `src/components/cluster/scene3d/load.ts`
  (`canUse3d(win: Window): boolean` for size and WebGL; `loadScene(): Promise<typeof import('./Scene3D')>`),
  `.github/budgets.json` (3D chunk entry, about 155 KB), `.github/scripts/check-budgets.mjs` (measure it).
- Tests: `canUse3d` false below 1024x700, without WebGL, or with the flag off; e2e: the 3D chunk never
  requested on phones, the plain view, or production; a failed import falls back to the 2D map.
- Commit `feat(cluster): add the cluster3d flag and lazy scene loader`.

### Task 7: Scene build, adapter, cleanup (#103)

- Files: `scene3d/build.ts` (`buildScene(layout: SceneLayout, tier: Tier): SceneObjects`),
  `scene3d/adapter.ts` (`connectScene(objects: SceneObjects, stores): () => void`), `scene3d/loop.ts`
  (`startLoop(renderer, scene, camera): Loop` with `invalidate()`, `pause()`, `dispose()`),
  `scene3d/Scene3D.tsx`.
- Tests: adapter with a fake scene (selection recolors only the selected object, filter dims the rest,
  unsubscribes on dispose); e2e (`fixtures` test hook): mount and unmount five times, `renderer.info.memory`
  geometries and textures back to baseline; StrictMode double mount leaves one canvas; hidden tab stops
  frames; crossing 1024x700 switches renderer and keeps the selection.
- Commit `feat(cluster): render the static 3d scene`.

### Task 8: Picking, labels, breadcrumbs, Home, mirrored list (#104)

- Files: `scene3d/pick.ts`, `scene3d/Labels.tsx`, `scene3d/Crumbs.tsx`, `scene3d/ObjectList.tsx`,
  `scene3d/camera.ts` (clamps: min and max distance, max polar angle below the horizon, bounded pan; `home()`).
- Tests: a click on a pod runs `kubectl describe pod <slug>` (echoed in the terminal); drag does not;
  keyboard list reaches every object and Enter runs its command; labels never overlap each other or leave
  the scene box at 1024x700 (declutter by priority); camera can't go under the ground.
- Commit `feat(cluster): add picking, labels, and the keyboard object list`.

## Sub-stage 4c: motion

Starts with a short proposal (timings, reduced-motion behavior) and waits for my go.

### Task 9: Boot, packets, heartbeats, pulses, glide, floating label, skill filter (#105)

- Files: `scene3d/motion.ts`, `scene3d/boot.ts`, `src/lib/state/boot.ts` (session flag in try/catch).
- Tests: boot streams `kubectl get nodes --watch` lines, skips on any key or click, skipped under reduced
  motion, on repeat visits, and with `?run=`; after boot the most recent role is selected; every command
  sends one packet (count in the adapter's fake scene); reduced motion: no packets, heartbeats, glides, or
  boot, instant state; skill filter lights the right pods in 3D.
- Commit `feat(cluster): add boot, packets, camera glide, and skill filter`.

## Sub-stage 4d: pod interior

Starts with a short proposal (interior layout and panel views) and waits for my go.

### Task 10: Interior commands and parser (#106)

- Files: `src/lib/parser/parse.ts` (only the pipeline `get secret <slug>-story -o jsonpath='{.data.story}'
| base64 -d`), `src/lib/commands/exec.ts`, `get.ts` (configmap, secret, events `--for`), `describe.ts`
  (svc), `src/lib/state/scene.ts` (`$sceneLevel`).
- Tests: kubectl-accurate output for each; `exec` prints `Defaulted container "main" in pod "<slug>"`;
  `exit` outside a pod is a no-op line; the decode output starts with the note that base64 is an encoding;
  any other pipe is a parse error; `exec` and `exit` refused by the `?run=` allowlist.
- Commit `feat(commands): add exec, configmap, secret, svc, and events`.

### Task 11: Interior scene (#107)

- Files: `scene3d/interior.ts`, `Crumbs.tsx`, panel views in `DetailPanel.tsx`.
- Tests: Step inside, double click, and `exec` all enter; Esc, `exit`, and the breadcrumb leave; every
  interior object shows real content; Service links open in a new tab with `noopener noreferrer`.
- Commit `feat(cluster): add the pod interior`.

## Sub-stage 4e: performance, fallbacks, polish

### Task 12: Tiers, low-fps and context-loss fallback (#108)

- Files: `scene3d/tier.ts` (`pickTier(probe): 'high' | 'low'`), `scene3d/fps.ts`
  (`watchFps(onLow: () => void, { below: 30, forMs })`), `src/lib/state/scene.ts` (`$sceneMode`).
- Tests: low tier has no shadows; sustained low fps switches to 2D with the notice in the live region;
  `webglcontextlost` switches to 2D and `webglcontextrestored` offers to return; "Try 3D again" works.
- Commit `feat(cluster): add performance tiers and automatic 2d fallback`.

### Task 13: Accessibility audit and concept side-by-side (#109)

- axe on 3D and 2D at 1024x700, 1280x800, 1920x1080, 2560x1440; 200% zoom falls back to the scrolling
  page; side-by-side with the concept, listing each deliberate difference (AA fixes) in the PR.
- STATUS sign-off and retrospective; README; release PR for v0.5.0 is mine to merge.
- Commit `docs(docs): wrap up stage 4`.
