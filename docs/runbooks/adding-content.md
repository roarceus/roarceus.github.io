# Runbook: adding content

> **Stage 1.** Content collections don't exist yet. This runbook gets the exact file paths and fields when
> they land; until then it records the intended flow. See [`docs/content-guide.md`](../content-guide.md).

## Flow (any content: update post, project, role)

1. Open a **Content update** issue (template) with the facts: dates, links, metrics.
2. Branch: `feat/content-<what>`, e.g. `feat/content-update-cka-passed`.
3. Add or edit the YAML/Markdown file under `src/content/<collection>/`. The schema validates it at build
   time; `pnpm build` tells you which field is wrong.
4. `pnpm check`, then open a PR titled `feat(content): <what>` and check the preview in both views (plain
   and cluster).
5. Merge, then merge the release PR when you want it live.

Never put portfolio facts in components or config; everything goes through `src/content/`.
