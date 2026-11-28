# Stage 4 design: the 3D cluster

_Status: approved (2026-11-27). Builds on [ADR 0005](../adr/0005-3d-cluster-one-screen.md), SPEC §4,
§7, §9, §11 Stage 4, and the concept page [`concepts/cluster-3d-concept.html`](../concepts/cluster-3d-concept.html)._

## 1. Intent

The dashboard's placeholder cards become the real cluster. On a capable desktop, visitors land in a 3D
Kubernetes cluster that _is_ the portfolio: nodes are the places I worked and studied, pods are the projects,
the control plane shows how every click becomes a request. It has to "woo everyone" while I'm job hunting,
so it ships in small PRs, each with a preview.

**The concept page is the target, not a loose reference.** We keep its scene, interactions, and feel as
close as we can. What changes is how it's built: production code, no CDN, no `innerHTML`, real data, tests,
accessibility, and performance safeguards.

Success: on a 1024x700 or larger desktop with WebGL, the scene matches the concept and everything in it is
clickable and keyboard reachable; every click echoes a real command in the terminal; nothing on the
one-screen layout scrolls; everyone else gets a 2D map with the same data and behavior; the phone, plain
view, and startup budgets don't move.

## 2. Goals, non-goals, anti-goals

- **Goals (from the concept):** hex nodes; the control plane (apiserver, etcd, scheduler,
  controller-manager) with their concept shapes; cordoned past eras (`SchedulingDisabled`); unscheduled
  pods by the scheduler; gold certificate and achievement markers; arcing request packets and kubelet
  heartbeats; the `kubectl get nodes --watch` boot; breadcrumbs; the paged detail panel; skill filtering;
  the floating label on the selected pod; a pulse on a node when one of its updates or achievements is
  shown (ADR 0005 §5); "Step inside" a pod with its container, ConfigMap (the stack),
  Secret (the story, base64 decoded), Service (links), and Events.
- **Goals (production):** a 2D map fallback with the same data; performance tiers and an automatic 2D
  fallback on low frame rate or WebGL context loss; clamped camera with a Home button; label decluttering
  at 1024x700; a mirrored keyboard list; reduced motion; a separate 3D chunk budget.
- **Non-goals:** the game layer from the concept (delete, self-healing, `CrashLoopBackOff`, `scale`,
  `rollout restart`, chaos: Stage 6); 3D on phones or tablets (ADR 0005); turning the dashboard on in
  production (stays behind `clusterDashboard`, and the scene behind `cluster3d`); Open Graph images and
  the phone tap-first polish (Stage 5).
- **Anti-goals:** a scene that drifts from the concept's look and feel; any change to the phone,
  plain-view, or startup JavaScript; `innerHTML` or unescaped content anywhere; a blank, frozen, or lost
  scene (camera under the ground, labels on top of the panel); copy that promises features we don't have
  yet; calling base64 "encryption".

## 3. Constraints

- **Flags:** `clusterDashboard` still gates the dashboard. New flag `cluster3d` gates the scene; both are on
  in PR previews and off in production.
- **CSP stays `'self'`** with hashed inline scripts (ADR 0004). three.js comes from npm, bundled, pinned
  exactly at `0.187.0` (published 2026-10-30, more than 14 days ago). No CDN, no new external endpoints.
- **No `innerHTML`:** the static test that bans it (and `outerHTML`, `dangerouslySetInnerHTML`, `eval`,
  `set:html`) stays and covers every new file. Panel, breadcrumbs, labels, and tags are React elements.
- **Content stays in `src/content/`**, schema-validated. Nothing from the concept's hard-coded data or its
  regex mappings (`ORG_NODE`, `UPDATE_NODE`, `UPDATE_POD`, `LAYOUT`) is copied; the same links come from
  content fields and pure helpers.
- **One playground (ADR 0005):** with JavaScript on, nothing loads another page. The no-JS `/` and the
  plain view are untouched.
- **Accessibility:** WCAG AA, keyboard reachable, visible focus, `aria-live` output, reduced motion.
- **Dependency direction (SPEC §3):** `lib/` stays framework-free and never imports three.js; three.js code
  lives under `components/cluster/scene3d/`.

## 4. Approaches

We measured both library options in a scratch folder (three `0.187.0`, `@react-three/fiber` `9.8.2`,
`@react-three/drei` `10.7.9`), bundled with esbuild `0.28.2`, minified, ES modules, React external (the
dashboard already ships it as a shared chunk), gzip level 9:

| Option                                                              | Gzipped |
| ------------------------------------------------------------------- | ------- |
| **A. Plain three.js** (everything the concept uses + OrbitControls) | 141 KB  |
| B. React Three Fiber + drei, minimal (`Canvas`, `OrbitControls`)    | 249 KB  |
| B. React Three Fiber + drei, typical (+ `Html`, `Edges`, `Line`)    | 258 KB  |

- **A. Plain three.js with a thin React wrapper (chosen).** An imperative scene module, a small React island
  that mounts it, and one adapter between the stores and the scene. It is a near-direct port of the
  concept (about 590 lines of plain three.js r128), so the feel survives, and it's the smallest chunk. We
  own the render loop, which makes render on demand, pausing, and the frame-rate fallback simple. The cost:
  we keep scene objects in sync with the stores ourselves (the adapter, §6).
- **B. React Three Fiber + drei (ADR 0002's earlier pick).** Declarative JSX that fits React, but about 108
  to 117 KB more, and the concept would be rewritten rather than ported, which makes "as close as
  possible" harder.
- **Dropped:** React Three Fiber without drei (still about 245 KB; it pulls in all of three.js for its JSX
  catalogue) and a 2D-only Stage 4 (ADR 0005 rules it out).

A new ADR (4b) records these numbers and the test setup, and marks ADR 0002's library choice as superseded.

## 5. Sub-stages (one PR each, each with a preview)

| PR  | Scope                                                                                                                                                                                                          | Done when                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 4a  | Data model, scene layout model, new commands, the 2D map (replaces the Stage 2 cards), SPEC §11 update                                                                                                         | 2D map shows every object type, clicks run commands, new commands match kubectl, layout model unit-tested                     |
| 4b  | ADR for three.js; `cluster3d` flag; lazy loader (1024x700 + WebGL gate, 2D on failure); static scene: nodes, control plane, pods, markers, picking, labels, breadcrumbs, Home, mirrored list, adapter, cleanup | Scene matches the concept's static look; clicks and keyboard select; StrictMode-safe cleanup test passes; 3D chunk budget set |
| 4c  | Motion: boot (`get nodes --watch`), request packets, heartbeats, camera glide, floating label, skill filter                                                                                                    | Every command sends its packet; reduced motion turns all motion off; skill filter lights the right pods                       |
| 4d  | Pod interior: `exec` / Step inside / double click, container, ConfigMap, Secret with decode, Service, Events, `exit` / Esc / crumb                                                                             | Every interior object shows real content; exec stays off `?run=`; decode copy says it's encoding                              |
| 4e  | Performance tiers, low-fps and context-loss fallback, label decluttering pass, accessibility audit, polish against the concept                                                                                 | Fallbacks proven in e2e; no overlap at 1024x700; axe clean; concept side-by-side reviewed                                     |

Each UI sub-stage starts with a short design proposal (states, sizes) before building, per CLAUDE.md.
If a sub-stage passes about 500 changed lines, it splits further (for example 4a-1 data and commands,
4a-2 the 2D map).

## 6. Architecture

```
content -> lib/content (snapshot) -> lib/scene (layout model, pure) -+-> 2D map (React SVG island)
                                                                     +-> scene3d/build (three objects)
runCommand -> parser -> commands -> stores ($terminal, $selection, $sceneFilter, $sceneLevel, $sceneMode)
stores -> scene3d/adapter (the only bridge) -> scene objects, camera, packets, label positions
scene picks / keyboard list -> runCommand (never the stores or three objects directly)
```

- **`src/lib/scene/` (new, pure, no three.js):** the layout model built from the snapshot: node positions
  and radii, pod slots, cordoned and unscheduled placement, marker positions, control plane component
  positions, packet paths as plain point lists, label priorities. Deterministic: same content, same
  positions. Positions use plain `[x, y, z]` tuples. Fully unit-tested (TDD).
  - The concept hand-tuned `LAYOUT` for today's four nodes. Production computes positions (control plane at
    the center, live nodes on a ring by recency, cordoned eras on the outer edge, radius by pod count) and
    is tuned to reproduce the concept's arrangement for today's content. A test pins today's layout so it
    can't drift unnoticed.
- **`src/components/cluster/scene3d/` (new):**
  - `build.ts`: turns the layout model into three.js objects (hex platforms, components, pods, markers,
    edges, ground grid), with shared geometries and materials.
  - `adapter.ts`: **the one bridge.** Subscribes once to the stores, diffs against the last state, and
    updates objects (selection colors, filter dimming, camera target, packets, level). Nothing else (no
    component, no command) touches three.js objects. Unit-tested with a fake scene.
  - `loop.ts`: render on demand (only while something moves or the camera changes), paused when the tab is
    hidden, DPR capped at 2, frame-time monitor for the low-fps fallback.
  - `Scene3D.tsx`: the island wrapper: mounts the canvas, the label layer, the Home button, and the
    keyboard list; owns cleanup.
  - `Labels.tsx`: label elements as React; the adapter writes their screen positions through refs each
    frame (no React re-render per frame).
- **Picking:** a raycaster on pointer up (not a drag) maps the hit object to its command and calls
  `runCommand(cmd, 'link')`. Selection then flows back through the stores like any other command, so a
  click, a typed command, a chip, and a `?run=` link all end in the same state.
- **Stores (nanostores, ADR 0003):** `$selection` gains kinds `component`, `certificate`, `achievement`, and
  `home`. New: `$sceneFilter` (skill label selector), `$sceneLevel` (`cluster` or `pod:<slug>`), and
  `$sceneMode` (`3d`, `2d`, with a reason for the notice).
- **Cleanup:** on unmount, dispose every geometry, material, and texture, remove every listener, stop the
  loop, and release the renderer (`dispose` plus `forceContextLoss`). Safe under React StrictMode's double
  mount. An e2e test mounts and unmounts the scene several times and checks `renderer.info.memory` returns
  to baseline (read through a test hook that exists only in the `fixtures` build).
- **WebGL context loss:** `webglcontextlost` switches `$sceneMode` to `2d` with a short notice;
  `webglcontextrestored` rebuilds the scene and switches back if it can.
- **Imports:** named ES-module imports from `three` and `three/addons/controls/OrbitControls.js`, so unused
  parts tree-shake.

## 7. Data model and commands (4a)

- **Snapshot additions** (stays under its 30 KB gzipped limit; today's project bodies are about 10.7 KB
  raw):
  - each project's write-up as plain text paragraphs (for the Secret), never HTML;
  - each achievement's node, from a new optional `node` field in `achievements.yaml`, falling back to
    matching `org` against experience and education orgs (data, not regexes);
  - each update's related node and pod, from new optional `node` and `project` fields on updates (today's
    tags don't name pods, so tags can't carry this). Confirmed values: `completed-aws-iaas` to
    `aws-iaas`, `completed-safehaven` to `safehaven`, `launched-asktrace` to `asktrace` (projects);
    `joined-mastercontrol` to `mastercontrol`, `relocated-to-usa` and `started-teaching-assistantship` to
    `northeastern` (nodes); `launched-design-portfolio` and `started-leetcode` link to nothing;
    `launched-personal-website` stays unlinked until I confirm it (§16);
  - each certification's stable `id` (a slug of its name, or a new optional `id` field).
- **A `personal` node (accuracy):** a pod without a node can't be Running or Completed. Side projects get a
  `personal` node (`role=personal`), a new content entry. Only genuinely planned, unstarted projects sit by
  the scheduler, as `Pending` with reason `Unschedulable` in `describe`. Today three projects have no node:
  `roarceus-github-io` (running), `book-review-system` and `meeting-notes-react` (completed); 4a moves them
  to `personal` once I confirm they are side projects, so nothing is unscheduled today. The layout model,
  the 2D map, and their tests cover both cases (a fixture keeps a Pending pod).
- **Control plane names:** kubeadm-style static pod names: `kube-apiserver-control-plane`,
  `etcd-control-plane`, `kube-scheduler-control-plane`, `kube-controller-manager-control-plane`. The short
  names (`kube-apiserver`, `etcd`, ...) are accepted too, in `describe` and Tab completion.
- **Control plane copy:** the four components' one-line descriptions are site UI text, kept next to the
  commands (like `help`), and they only describe what exists now. The concept's "watch it work when you
  scale" and "delete a pod and it brings it back" wait for Stage 6.
- **New commands (TDD, kubectl-accurate output):**
  - `get pods -l skill=<name>` sets the skill filter (and `get pods -l skill-` style clear via `clear` or
    selecting elsewhere; exact clear gesture decided in 4c);
  - `get pods -n kube-system`, `describe pod <component> -n kube-system`;
  - `get componentstatuses` / `get cs`, printing kubectl's real deprecation warning
    (`Warning: v1 ComponentStatus is deprecated in v1.19+`) before the table;
  - `describe certificate <id>`, `describe achievement <id>`;
  - 4d: `exec -it <pod> -- sh`, `exit`, `get configmap <slug>-config -o yaml`, `get secret <slug>-story
-o yaml`, the decode line `get secret <slug>-story -o jsonpath='{.data.story}' | base64 -d` (the parser
    accepts that one pipeline form and nothing else), `describe svc <slug>`, `get events --for pod/<slug>`.
- **`?run=` allowlist:** read-only commands only. `exec` and `exit` stay off it (a privileged verb under
  RBAC, matching the read-only visitor rule). `get secret ... | base64 -d` is read-only and allowed.

## 8. The 2D map (4a)

- A server-rendered SVG (Astro) from the same layout model (top-down projection of the 3D positions), so
  the no-JS page shows a real map and the scene and map never disagree. Every object is a link to its
  plain-view section with a `data-run` command; one delegated listener runs it in place with JavaScript.
  Selection and the skill filter are shown by toggling attributes from the stores in that same small
  script, not by per-object components.
- Shows every object type: nodes (sized to their pods), pods with phase, the control plane components,
  cordoned eras, unscheduled pods, certificate and achievement markers, selection, and the skill filter.
- Replaces the Stage 2 placeholder cards from 768px to 2560px with no empty boxes. Below 768px nothing
  changes in Stage 4: phones keep the plain view first and the Stage 2 cluster mode with its role cards
  (the tap-first phone map is Stage 5).
- With `clusterDashboard` on, the no-JS `/` shows the server-rendered map instead of the cards; production
  (flag off) is unchanged.
- Fits its box on the one-screen layout (scales, never scrolls).
- From the Stage 3 review (#81): pod names are the most prominent text, with a short tech hint under
  each; status pills are quieter; nodes are sized to their pods.

## 9. The 3D scene (4b to 4d)

Everything here ports from the concept; numbers below are the concept's and may be tuned to match it.

- **Scene:** dark background with fog, a hex ground with a faint hex grid, hemisphere and directional
  light, the camera at the concept's home view (`fov` 38). Clicking empty ground or Home goes back to it.
- **Camera clamps:** OrbitControls min and max distance and max polar angle (never under the ground, never
  lost far away), panning bounded to the cluster. A Home button resets to the home view.
- **Nodes:** hex platforms with edges; selected nodes turn blue. Cordoned eras are faded with dashed gold
  edges and a `SchedulingDisabled` label. Each live node has a kubelet the packets and heartbeats visit.
- **Control plane:** a larger hex in the middle with the apiserver (hex prism), etcd (cylinder), scheduler
  (octahedron), and controller-manager (hex torus); each runs `describe pod <name> -n kube-system`.
- **Pods:** cubes in the concept's slot pattern, green for Running and grey for Completed, faded on
  cordoned nodes. Only Pending (planned) pods wait next to the scheduler; side projects sit on the
  `personal` node.
- **Markers:** gold hex coins for certificates on the control plane and gold cones for achievements on
  their nodes; each runs its `describe`.
- **Labels and declutter (4b, tuned in 4e):** node names and the selection always show; component and
  marker tags fade unless hovered or selected; pod names show on hover and selection. A priority pass
  hides lower-priority labels that would overlap a higher one or leave the scene box, so tags never cover
  the panel or each other at 1024x700.
- **Breadcrumbs:** `sohan-cluster / <node> / pod/<slug>` (and the interior level), each part clickable.
- **Floating label (4c):** on the selected pod: `pod/<slug>`, phase, node, following it on screen.
- **Packets and heartbeats (4c):** every command sends a packet along arcs kubectl to apiserver to etcd
  and back, then to the node's kubelet for a describe. Live kubelets send small heartbeats to the
  apiserver. Skipped under reduced motion.
- **Camera glide (4c):** selecting glides the camera to the object (about 900 ms); reduced motion cuts.
- **Boot (4c):** the concept's look with SPEC §9's rules. About 2 to 3 seconds: the control plane comes
  up, nodes join (`NotReady` then `Ready`, cordoned eras `Ready,SchedulingDisabled`), pods start, while
  `kubectl get nodes --watch` lines stream in the terminal. Skip button; any key, click, or input skips
  it. Content is never blocked: the panel shows the home view from the first frame. Skipped under
  reduced motion and on repeat visits in the same session (a `sessionStorage` flag, wrapped in
  try/catch). After boot, the most recent role is selected (today's pre-selection), unless a `?run=` link
  is present: then boot is skipped and the link's command runs. The 2D map has no boot.
- **Skill filter (4c):** a skill chip or `get pods -l skill=<name>` lights pods that used it and dims the
  rest, in 3D and 2D.
- **Pod interior (4d):** `kubectl exec -it <pod> -- sh`, a double click, or "Step inside" flies the camera
  into the pod. Inside: container `main`, ConfigMap `<slug>-config` (the stack as YAML keys; a key selects
  that skill across the cluster), Secret `<slug>-story` (base64 at first; Decode runs the decode line and
  the panel says plainly that base64 is an encoding anyone can reverse, not encryption), Service `<slug>`
  (ports for each link, opening in a new tab; ClusterIP only when there are none), and Events. Esc,
  `exit`, or the breadcrumb goes back out.

## 10. Performance (4b sets the base, 4e finishes it)

- **Lazy loading:** the 3D chunk loads only when `cluster3d` is on, the window is at least 1024x700, and a
  WebGL context can be created. It never loads on phones, tablets, the plain view, or production.
- **Tiers:** a quick capability check (renderer max texture size, `MAX_SAMPLES`, a short frame-time probe)
  picks a tier: high gets soft shadows and antialiasing; low gets no shadows or a cheap fake contact
  shadow. DPR is capped at 2 on every tier.
- **Render on demand** when idle; **pause** while the tab is hidden.
- **Low frame rate:** if the frame rate stays below about 30 fps for a few seconds after the boot, switch
  to the 2D map with a short notice. The exact window and threshold are tuned in 4e.
- **Switching back (my call):** after a low-fps or context-loss fallback the page stays 2D, and the notice
  offers "Try 3D again" (one button, no permanent toggle). Window size is checked live with a debounce:
  shrinking below 1024x700 switches to 2D, growing back returns to 3D unless a fallback happened. The
  current mode is never stored across visits.
- **2D map budget:** the map is server-rendered SVG with one delegated click listener (data attributes to
  `runCommand`) and no per-object components, so its JavaScript stays minimal. 4a raises the dashboard
  startup and island limits to the measured size plus 10%, with the numbers in the PR. If the increase is
  more than about 5 KB gzipped in total, I stop and ask before raising.
- **Budgets:** a new `.github/budgets.json` entry for the 3D chunk (three.js plus our scene code):
  141 KB measured for three.js plus about 10% headroom, so about 155 KB gzipped. If our scene code pushes it
  over, I come back with the numbers instead of raising the limit quietly. The startup, island, phone,
  and plain-view budgets stay where they are (the loader stub in startup is tiny).
- **Lighthouse mobile** keeps running on the phone layout, where the chunk never loads.

## 11. The one-screen layout at 1024x700

The panel is cramped there today (a pod takes 5 pages). 4b proposes new proportions for the scene, panel,
and terminal at 1024x700 before building (the concept's layout is the reference), and fixes the known
issue in STATUS.

## 12. Accessibility

- The canvas is `aria-hidden`. A **mirrored list** of buttons, one per object (nodes, components, pods,
  markers, and interior objects at the pod level), sits next to it in the same order the scene presents
  them. It is visually hidden until it takes focus, then shows as a compact overlay strip with a visible
  focus ring. Focusing an item highlights its object and shows its label; Enter runs its command.
- The 2D map's objects are real links and buttons in the tab order.
- Reduced motion: no boot, glides, packets, heartbeats, or idle motion; state changes are instant.
- Notices (2D fallback, context loss) go through the existing `aria-live` region.
- The decode moment and every new panel view are plain text, readable by screen readers.

## 13. Testing

- **Unit (TDD):** layout model (positions, slots, cordoned and unscheduled, markers, label priorities,
  today's layout pinned), new commands and their kubectl output, parser support for the one decode
  pipeline, snapshot additions, the adapter against a fake scene (selection, filter, level, packets,
  cleanup), the frame-rate monitor, the tier picker.
- **Component:** 2D map (render, selection, filter, no-JS links), breadcrumbs, label layer, new panel
  views, the mirrored list.
- **e2e `@dashboard`:** the scene loads at 1280x800 in Chromium (headless WebGL) and the 2D map when WebGL
  is unavailable (an init script removes it); clicks echo commands; keyboard list selects; mount and
  unmount several times with memory back to baseline; context loss switches to 2D; reduced motion; no
  scroll at 1024x700; `exec` refused from `?run=`. WebKit and Firefox run the 2D paths at least; 3D on
  them where headless WebGL works in CI. The production and phone e2e stay unchanged.

## 14. SPEC and docs changes

- **4a:** SPEC §11: Stage 4 takes the 3D boot and the pod interior (from Stage 5); Stage 5 keeps
  transitions, empty, loading, and error states, Open Graph images, and the phone tap-first cluster
  mode. SPEC §7 gains the new commands as they land.
- **4b:** the new ADR (library choice with measurements and test setup); ADR 0002's library choice marked
  superseded with a link.
- Every PR keeps README, STATUS, and the plan current.

## 15. Calls I made (check these)

- Concept versus rules: where the concept's colors or small label text fail WCAG AA or have no token, the
  rules win (SPEC §5, CLAUDE.md); the change is the smallest one that passes, and the 4e side-by-side
  review notes each one.
- Achievements link to nodes by `org` (matching experience and education orgs), with an optional `node`
  field as an override.
- The 2D map has no boot; `?run=` skips the boot; fallback recovery is a single "Try 3D again".
- Phones and below 768px don't change in Stage 4.

## 16. Open, needs me

- **`launched-personal-website`:** this site (project `roarceus-github-io`) or my old site (no link).
- **Side projects on `personal`:** confirm `book-review-system` and `meeting-notes-react` are side
  projects (asked in the 4a PR before moving them).

## 17. Left to the builder

- Exact geometry sizes, colors (mapped to `--scene-*` tokens), and timings, matched to the concept by eye.
- The capability probe details and the low-fps window.
- File splits inside `scene3d/` beyond the ones named here, as long as the adapter stays the only bridge.
- How the mirrored list orders interior objects.
