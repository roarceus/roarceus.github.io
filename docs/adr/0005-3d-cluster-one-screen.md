# 0005. A 3D cluster in v1.0, on one fixed screen

- **Status:** accepted
- **Date:** 2026-11-26
- **Deciders:** Sohan Patil

## Context

[ADR 0002](0002-design-direction-tool-and-game.md) set the direction "the UI is the tool, the cluster is the
game" and put the 3D cluster after v1.0 (Stage 8), with a 2D SVG map first (Stage 4).

Task 6b of Stage 3 then made the desktop dashboard fit one screen (from 1024 by 700 pixels), with the map,
the detail panel, and the terminal output each scrolling inside its own box.

On 2026-11-26 we reviewed a clickable 3D concept
([`docs/concepts/cluster-3d-concept.html`](../concepts/cluster-3d-concept.html)) and asked for:

- the 3D cluster as the main desktop experience, not a post-1.0 extra ("we want to woo everyone");
- the whole portfolio on one fixed desktop screen: no page scroll, no navigation to other pages, and no
  scrolling inside any panel;
- hexagon nodes and a visible control plane (apiserver, etcd, scheduler, controller-manager) that animates
  real request flows;
- clicking a node, pod, or component runs its `describe` command, glides the camera to it, and shows a
  floating label on the selected pod;
- a way to go deeper into each pod, the way a real pod has ConfigMaps, Secrets, and Services attached;
- Contact to open in place on the dashboard.

Constraints that still hold (SPEC §4, §10): the plain view is the default on phones, `/` works without
JavaScript, Lighthouse mobile performance stays at 90 or more, `prefers-reduced-motion` is respected, and
the site meets WCAG AA.

## Decision

### 1. 3D is the desktop cluster view in v1.0

- Stage 4 builds the 3D scene (the work ADR 0002 planned for Stage 8). The 2D map becomes the fallback, not
  a separate stage.
- **3D loads only** on screens at least 1024 by 700 pixels, with WebGL available. It is a lazy chunk that
  never loads on phones.
- **Everyone else gets the 2D map:** phones, tablets, browsers without WebGL, and a scene that fails to
  start. Both renderers read the same data and the same store (ADR 0003), so the terminal, panel, and URL
  behave the same either way.
- **Reduced motion keeps 3D** but drops the boot animation, camera glides, packets, and idle motion. The
  camera cuts instead of gliding.
- **Library:** React Three Fiber and drei, as ADR 0002 chose. Stage 4's design confirms it against measured
  bundle sizes; the concept page uses plain three.js only because it is a single file.
- **Keyboard and screen readers:** the canvas is decorative (`aria-hidden`). Every object in the scene has a
  matching button in an accessible list (and in the panel and chips), so Tab reaches every node, pod, and
  component, and focusing one selects it in the scene.

### 2. One fixed screen on desktop, and nothing scrolls inside it

- From 1024 by 700 pixels, the dashboard fills the window: top bar, scene, detail panel, terminal, status
  line. The page never scrolls.
- **No panel scrolls either:**
  - **Scene:** always drawn to fit its box.
  - **Detail panel:** long content is split into pages, with Previous and Next buttons and a `1 / 2` count.
  - **Terminal:** shows only the latest result. A long result pages like `less` (`-- more (1/2) --`, Space
    or a Next button). Earlier commands come back with the Up arrow, not by scrolling.
- **Smaller windows and browser zoom** (for example 1280 by 800 at 200%, which is 640 by 400 CSS pixels)
  fall back to the normal scrolling page. Content can't be cut off there, because WCAG 1.4.10 (Reflow)
  requires it to stay usable at that size. This is the one exception to "no scrolling".
- Print keeps the normal flow and the footer.

### 3. One playground: the exits

With JavaScript on, nothing on the dashboard loads another page. The only exits are:

- the Plain view button and `kubectl config use-context plain` (the visitor's explicit choice, and the
  no-JavaScript and screen reader fallback);
- Resume (the PDF, in a new tab);
- outside links (`port-forward`, project repos and demos), in a new tab.

Contact runs `kubectl apply -f contact.yaml` and opens the form in the panel, from the chip, the terminal,
and the top bar button.

### 4. The scene

- **Nodes** are hexagon platforms. **Pods** are cubes on them.
- The **control plane** sits in the middle with the apiserver, etcd, the scheduler, and the
  controller-manager, each clickable (`describe pod <name> -n kube-system`).
- **Requests animate:** every command sends a packet from kubectl to the apiserver, on to etcd, back to the
  apiserver, and to the node's kubelet for a describe. Kubelets send small heartbeats.
- **Self-healing runs the full loop:** delete, then controller-manager, scheduler, kubelet, Running.
- **Selecting** a node, pod, or component runs its `describe`, glides the camera to it, and shows a
  floating label on the selected pod.
- The exact look is decided in Stage 4's design. The concept page is a reference, not the final UI.

### 5. Where each kind of content lives

Every kind of content has a thing in the scene, a view in the panel, and a real command.

| Content                       | Scene                                                      | Panel                                       | Command                                  |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| About                         | The cluster; the home view                                 | Name, title, location, open to work, intro  | `cluster-info`                           |
| Experience and education      | Nodes                                                      | Role, org, dates, summary, highlights, pods | `describe node <name>`                   |
| Older eras (`cluster: false`) | Faded, cordoned nodes at the edge (`SchedulingDisabled`)   | Same as a node                              | `describe node mumbai`                   |
| Projects                      | Pods on the node where they were built                     | Tagline, tech, status, dates                | `describe pod <slug>`                    |
| Projects with no node         | Pending pods next to the scheduler ("unscheduled")         | Same as a pod                               | `describe pod <slug>`                    |
| Skills                        | Labels: selecting a skill lights up every pod that used it | Usage bars, by category                     | `top skills`, `get pods -l skill=<name>` |
| Certifications                | Badges on the control plane (cert-manager style)           | Name, issuer, status                        | `get certificates`                       |
| Achievements                  | Markers on the node where they were earned                 | Title, org, date, description               | `get achievements`                       |
| Updates                       | A pulse on the related node                                | Latest entries, paged                       | `logs updates`, `get events`             |
| Contact                       | A packet to the apiserver when sent                        | The YAML manifest form                      | `apply -f contact.yaml`                  |

Chips use plain words ("Experience", "Skills", "Step inside a pod") with the real command under each, so a
recruiter never has to type and an engineer sees the commands.

### 6. Going inside a pod

`kubectl exec -it <pod> -- sh`, a double click, or a "Step inside" button flies the camera into the pod. A
breadcrumb (`sohan-cluster / <node> / pod/<slug>`) shows where you are; Esc, `exit`, or the breadcrumb goes
back out. Inside, the pod's objects are clickable, and each shows real content:

| Object                    | Shows                                                                         | Content field               |
| ------------------------- | ----------------------------------------------------------------------------- | --------------------------- |
| Container `main`          | Name, status, the one-line purpose                                            | `name`, `tagline`, `status` |
| ConfigMap `<slug>-config` | The stack as YAML keys; a key selects that skill across the cluster           | `tech`                      |
| Secret `<slug>-story`     | Base64 at first; Decode reveals the write-up                                  | the project body            |
| Service `<slug>`          | Ports for each link, opening in a new tab; ClusterIP only when there are none | `links`                     |
| Events                    | Scheduled, related updates, Completed                                         | `start`, `end`, updates     |

## Alternatives considered

- **Keep 2D for v1.0 and 3D in v1.1 (ADR 0002's plan).** v1.0 ships sooner, but the first impression is the
  2D map, and I want the 3D experience to be the first impression.
- **Keep the scroll boxes from Task 6b.** Simpler, but a fixed screen whose parts scroll doesn't feel like one
  playground, and paging keeps every view a complete, readable unit.
- **No fallback below 1024 by 700.** Would keep the fixed screen everywhere, but fails WCAG Reflow and cuts
  content off on small windows and at high zoom.
- **3D on phones too.** Hurts the mobile performance budget and battery, and the tap-first phone layout
  works better in 2D.

## Consequences

- SPEC §4, §5, §7, §9, and §11 change in the same PR as this ADR. ADR 0002's roadmap (point 5) is
  superseded; its design rules still hold.
- v1.0 arrives later: Stage 4 is now the 3D scene plus a 2D fallback, and Stages 5 and 6 build on the scene
  (3D boot, pod dive, self-healing, chaos, scale). Stage 4 will likely split into several PRs or sub-stages
  at planning.
- Stage 3 gains Task 6d: the detail panel and terminal output page instead of scrolling. Task 8 also opens
  Contact in place from the top bar.
- New feature flag `cluster3d` (Stage 4), off in production until approved. The `clusterDashboard` flag
  still gates the whole dashboard.
- Budgets: the 3D chunk gets its own limit in `.github/budgets.json` (Task 6c sets up the script). It never
  counts toward the phone or plain-view budgets, and Lighthouse mobile runs on the phone layout.
- Performance rules from ADR 0002 stay: low-poly instanced meshes, render on demand, a capped pixel ratio,
  and pausing while the tab is hidden.
- New commands (`exec`, `exit`, `get pods -l`, `get configmap`, `get secret`, `describe svc`,
  `describe certificate`, `describe achievement`, `get cs`, `scale`, `rollout restart`) land with the stage
  that needs them, not in Stage 3.
