# Content guide

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

## Writing rules

- Facts only. If you don't know a date, link, or number, write `TODO(sohan)` (text fields) and list it in
  [`content-review.md`](content-review.md); never guess.
- Prose fields (summaries, descriptions, update bodies) are short, first person, and concrete: what you
  built, with what, and the result. Put numbers in a highlight's `metric` (`~40% faster`).
- Write like a person, not a model. No em dashes, en dashes, middle dots, curly quotes, ellipsis or arrow
  characters (`tests/static/content-style.test.ts` fails CI on them); use commas, periods, and plain
  hyphens. Skip filler ("passionate about", "leveraging", tidy three-part slogans). Say the specific thing.
- Internal employer tool names stay private: describe the tool instead (e.g. "Deployment gating bot").
- YAML: quote a value that contains `: ` (`tagline: "This site: …"`). Unquoted `2025-06` stays a string;
  unquoted `2025-06-26` in update front matter becomes a date (both are what the schemas expect).
- Links between pages in Markdown are relative (`../../projects/asktrace/` from an update), so they work
  under PR preview paths. External links must be `https://`.
- A project's `order` sets its position everywhere; `featured: true` puts it in the highlights (needs a
  body). `node` is the org it was built at (`capgemini`, `mastercontrol`, `northeastern`, `mumbai`,
  `sparks-foundation`); leave it out for unscheduled work like this site.

How to add an update, a project, or a role, step by step:
[`docs/runbooks/adding-content.md`](runbooks/adding-content.md).
