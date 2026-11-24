# Runbook: updating visual baselines

> **Stage 2.** Visual regression specs and the first baselines land with the design system (decision D4).
> The config is ready: `pnpm test:visual`, specs in `tests/visual/`, baselines in
> `tests/visual/__screenshots__/<project>/`.

## Rules

- Baselines are generated on **Linux in CI**, never on Windows or macOS (fonts and anti-aliasing differ,
  so local baselines would fail in CI).
- An intentional UI change updates its baselines **in the same PR**, and the PR shows before/after.
- Never update baselines to silence a diff you can't explain; investigate first.

## Steps (to be finalized in Stage 2)

1. Make the UI change; CI's visual job fails and uploads the diff images as an artifact.
2. Review the diffs. If they're all intended, regenerate on Linux (a CI job or the official Playwright
   Docker image at the pinned Playwright version) with `pnpm test:visual --update-snapshots`.
3. Commit the new PNGs under `tests/visual/__screenshots__/` in the same PR, then re-run CI.
