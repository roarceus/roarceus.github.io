# Runbook: adding content

Field reference and writing rules: [`docs/content-guide.md`](../content-guide.md).

## Flow (any content: update post, project, role)

1. Open a **Content update** issue (template) with the facts: dates, links, metrics.
2. Branch: `feat/content-<what>`, e.g. `feat/content-update-cka-passed`.
3. Add or edit the file (copy a neighbor as a template):
   - **Update post:** `src/content/updates/<slug>.md` with `title`, `date` (`YYYY-MM-DD`), `tags`,
     `summary`, then the post as the body.
   - **Project:** `src/content/projects/<slug>.md` with `name`, `tagline`, `status`, `node`, `tech`,
     `links`, `featured`, `order` (renumber neighbors if you insert), optional `start`/`end`; body is the
     description.
   - **Role:** `src/content/experience/<slug>.yaml` with `org`, `role`, `type`, `location`, `start`, `end`
     (`present` if ongoing), `summary`, `highlights`, `tech`, `node`. A new org gets a new node name.
   - **Certification passed:** in `src/content/certifications.yaml`, set `status: issued`, add `date` and
     `credentialUrl`.
4. Run `pnpm build`. Schema errors name the file and field; integrity errors (unknown node, featured
   project without a body, bad slug) list every problem at once.
5. `pnpm check`, then open a PR titled `feat(content): <what>` and check the preview in both views (plain
   and cluster).
6. Merge, then merge the release PR when you want it live.

Never put portfolio facts in components or config; everything goes through `src/content/`.
