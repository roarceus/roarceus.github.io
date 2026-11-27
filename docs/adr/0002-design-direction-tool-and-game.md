# 0002. Design direction: the UI is the tool, the cluster is the game

- **Status:** accepted; the roadmap in point 5 is superseded by [0005](0005-3d-cluster-one-screen.md) (3D moves into v1.0)
- **Date:** 2026-11-25
- **Deciders:** Sohan Patil

## Context

SPEC §5 asked for a clean "real tool" look (Lens, Grafana, k9s): dark, one accent, no glow, no heavy
gradients. After Stage 1, I asked for more flair: something that feels game-like and explorable, up to a
3D cluster, so the site stands out from the usual terminal portfolio.

Both goals are real. The site exists to get me hired, so a recruiter must understand who I am in about
10 seconds without touching anything, and an infrastructure engineer must find the kubectl details accurate.
An engineer who wants to keep exploring should also enjoy it. The feeling to aim for after 30 seconds:
"this person genuinely knows Kubernetes and builds polished, production-grade things, and exploring it was
fun." Credibility first, delight second.

References I gave: Lens and k9s (credibility, real tool UI), Mini Metro (clean, flat, readable game
visuals), Bruno Simon's portfolio (the "I can explore this" moment), Linear's website (polish, typography,
restraint).

I'm job hunting, so v1.0 has to ship soon. A 3D scene is a lot of work and a real risk to the mobile
performance budget (Lighthouse mobile ≥ 90, SPEC §10).

## Decision

**The UI is the tool, the cluster is the game.**

1. **Chrome stays a tool.** The top bar, panels, tables, terminal, plain view, forms, and every content page
   follow SPEC §5 as written: crisp, dark, one accent (Kubernetes blue), no glow, no gradients, quick and
   purposeful motion.
2. **Flair lives only inside the cluster scene.** In the cluster map, and only there, we allow:
   - subtle status-driven glow or emissive light on pods and packets;
   - continuous motion (packets travelling between nodes, pods restarting);
   - 3D (from Stage 8);
   - game mechanics (Stage 6 onward).

   The scene uses its own `--scene-*` tokens. A test fails the build if a `--scene-*` token, or a glow
   effect (`text-shadow`, a colored `box-shadow`, `filter: drop-shadow`), shows up outside
   `src/components/cluster/` and `src/components/game/`.

3. **The scene looks like Mini Metro, not a sci-fi movie.** That means:
   - flat fills and clear strokes;
   - status shown by shape and text as well as color;
   - generous spacing and no clutter.
4. **Every existing limit stays.** Specifically:
   - Lighthouse mobile ≥ 90;
   - the plain layout is the default on phones;
   - `/` works without JavaScript;
   - `prefers-reduced-motion` is respected (the scene goes still and the packets stop);
   - WCAG AA contrast;
   - kubectl output looks real.
5. **Roadmap.** v1.0 keeps its scope and ships the 2D SVG cluster map (Stage 4). Three post-1.0 stages are
   added to SPEC §11. Each one ships behind a feature flag:
   - **Stage 8 → v1.1: 3D cluster view** (React Three Fiber + drei). It enhances the 2D map rather than
     replacing it:
     - It uses the same data and state.
     - It loads lazily, only when the cluster view opens, and only on desktop and capable devices.
     - It detects WebGL and falls back to 2D automatically, and visitors can switch with a 2D/3D toggle.
     - It stays cheap: low-poly instanced meshes, rendering only on demand, a capped pixel ratio, and
       pausing while hidden.
     - It adds a 3D boot sequence, a camera glide on node click, a physical chaos mode, and a visible
       `kubectl scale`.
   - **Stage 9 → v1.2: missions.** A guided tour ("Take the 60-second tour"), a visitor rank from Intern
     to Cluster Admin, and XP.
   - **Stage 10 → v1.3:** a timed incident mini-game (best time stored locally), a hidden `kube-system`
     namespace, and optional sound effects (off by default).
6. **Stage 2 designs for this now.** It must deliver:
   - scene tokens (status glows, packet color, platform surfaces);
   - motion tokens;
   - a cluster stage in the layout shell that can hold either the SVG map or a WebGL canvas without any
     layout change.

## Alternatives considered

- **Keep SPEC §5 everywhere (all tool, no flair).** Safe and credible, but it looks like many other
  terminal portfolios and drops what I asked for.
- **Flair everywhere (themed chrome, glow, animated backgrounds).** It would be memorable, but it hurts
  credibility and readability for recruiters, makes AA contrast harder, and costs performance on every page.
- **Build the 3D scene for v1.0 instead of the 2D map.** It would be the biggest "wow", but it delays v1.0
  while I'm job hunting. It also risks the mobile budget and still needs a 2D fallback, so the 2D map
  gets built either way.

## Consequences

- SPEC §5 gains a "Cluster scene" subsection and the scene and motion token groups. SPEC §11 gains Stages 8
  to 10. Both change in the same PR as this ADR.
- Design reviews get a simple rule: if it glows or moves for fun, it has to be inside the cluster scene.
- The cluster stage has a fixed slot from Stage 2 on, so Stage 4 (SVG) and Stage 8 (WebGL) only swap what is
  inside it.
- Stage 8 adds `three`, `@react-three/fiber`, and `@react-three/drei`. They are heavy, so they must stay in
  a lazy chunk that never loads on phones or with reduced motion. Lighthouse runs on the default view, which
  stays 2D.
- New feature flags: `clusterDashboard` (Stage 2 to 4), then `cluster3d`, `missions`, and `incidents`
  (Stages 8 to 10).
