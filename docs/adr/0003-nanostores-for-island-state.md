# 0003. Nanostores for state shared between islands

- **Status:** accepted
- **Date:** 2026-11-25
- **Deciders:** Sohan Patil

## Context

Stage 3 adds two React islands on `/`: the terminal and the detail panel. Stage 4 adds the map. They must
stay in sync: `describe pod asktrace` typed in the terminal changes the detail panel, and later a click on
the map runs a command in the terminal. Astro islands hydrate separately, so they don't share React
context unless they are one island, and one island for the whole dashboard means one large bundle whose
hydration cost grows every stage (design doc `plans/stage-3-design.md` §4).

SPEC §3 puts shared stores in `src/lib/state/`, and `lib/` must not import React or the DOM, so the store
itself has to be framework-free and unit-testable.

## Decision

Use **nanostores** for the shared state, with **`@nanostores/react`** (`useStore`) inside the islands.

- Stores live in `src/lib/state/` and import nothing from React.
- `runCommand(input, source)` in `src/lib/state/run.ts` is the only way a command runs, and the only
  writer of the terminal and selection stores besides `clearTerminal()` and the snapshot loader.

## Alternatives considered

- **Zustand (vanilla store):** also framework-free, but larger, and its API and docs are React-first.
- **React context in one island:** no store needed, but forces a single big island (above).
- **Custom events on `window`:** no dependency, but no current value to read on hydrate, and no typing.

## Consequences

- Two small runtime dependencies (nanostores core is under 1 KB gzipped), pinned exactly.
- Each island reads the store on hydrate, so whichever hydrates later still shows the current state.
- Store logic is tested without a DOM; islands get component tests (happy-dom).
- Stage 4's map and Stage 6's game layer join the same stores instead of adding new paths.
