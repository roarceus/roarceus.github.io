# Content guide

> **Stub.** The content collections and their schemas arrive in Stage 1. This guide is filled in then; the
> outline below is the plan (SPEC §6).

All portfolio content lives in `src/content/` as YAML and Markdown, validated by Zod schemas in
`src/content/config.ts`. Both the plain view and the cluster view render from the same data, so updating
content never means touching components. An invalid entry fails the build, and CI shows which field.

| Collection       | Format            | What it holds                                                                     |
| ---------------- | ----------------- | --------------------------------------------------------------------------------- |
| `profile`        | one YAML file     | Name, title, location, tagline, about, links, resume path, open-to-work flag      |
| `experience`     | YAML per role     | Org, role, type (work/education/teaching), dates, highlights, tech, node label    |
| `education`      | YAML per entry    | School, degree, field, dates, highlights                                          |
| `projects`       | YAML + Markdown   | Name, tagline, description, status (running/completed/pending), node, tech, links |
| `skills`         | YAML              | Categories and items with optional levels                                         |
| `certifications` | YAML              | Name, issuer, status (issued/in-progress), date, credential URL                   |
| `achievements`   | YAML              | Title, date, description, link                                                    |
| `updates`        | Markdown per post | Title, date, tags, summary, body                                                  |

How to add an update, a project, or a role, step by step:
[`docs/runbooks/adding-content.md`](runbooks/adding-content.md).
