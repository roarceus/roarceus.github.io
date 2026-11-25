# Content guide

> **In progress.** Schemas landed in Stage 1 PR 1; the real content and full field reference arrive in PR 2.

All portfolio content lives in `src/content/` as YAML and Markdown, validated by Zod schemas in
`src/lib/content/schemas/collections.ts` and registered in `src/content.config.ts`. Both the plain view and
the cluster view render from the same data, so updating content never means touching components. An invalid
entry fails the build, and the error names the file and field. Cross-entry rules (one profile, kebab-case
ids, every project `node` declared by an experience or education entry, featured projects have a
description) are checked whenever a page loads content (`src/lib/content/integrity.ts`).

| Collection       | Where                                   | What it holds                                                                            |
| ---------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `profile`        | `profile/profile.md`                    | Name, title, location, tagline, links, resume path, open-to-work; body = about           |
| `experience`     | `experience/<slug>.yaml`                | Org, role, type (work/education/teaching), dates, highlights, tech, node                 |
| `education`      | `education/<slug>.yaml`                 | School, degree, field, dates, highlights, optional node                                  |
| `projects`       | `projects/<slug>.md`                    | Name, tagline, status (running/completed/pending), node, tech, links; body = description |
| `skills`         | `skills.yaml` (list, each with an `id`) | Categories and items with optional levels (1–5)                                          |
| `certifications` | `certifications.yaml`                   | Name, issuer, status (issued/in-progress), date (required once issued), URL              |
| `achievements`   | `achievements.yaml`                     | Title, org, date, description, link                                                      |
| `updates`        | `updates/<slug>.md`                     | Title, date, tags, summary, draft; body = post                                           |

Dates are `YYYY-MM` (`end` may be `present`); update dates are `YYYY-MM-DD`. Links must be `https:`
(or `mailto:`). The file name (or `id`) is the slug and must be lowercase kebab-case.

How to add an update, a project, or a role, step by step:
[`docs/runbooks/adding-content.md`](runbooks/adding-content.md).
