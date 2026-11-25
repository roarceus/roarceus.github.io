# Stage 1 — Content and plain view Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A complete, shippable, recruiter-friendly portfolio as pre-rendered HTML: schema-validated content,
`/plain/`, project and update pages, RSS, contact form, resume link, SEO metadata, sitemap, and a themed 404,
released as **v0.2.0** within every budget.

**Architecture:** Content lives in `src/content/` as YAML + Markdown, validated by Zod schemas registered in
`src/content.config.ts`. Pages and components read it only through `src/lib/content/` helpers. Everything is
static Astro (no React islands this stage); the contact form is a plain HTML form that works without JS, with a
small bundled script for inline validation and status messages.

**Tech Stack:** Astro 7.4.13 content layer (`glob`/`file` loaders, `astro/zod`), @astrojs/rss, @astrojs/sitemap,
Web3Forms (contact), Vitest, Playwright + axe, Lighthouse CI.

**Spec:** `docs/SPEC.md` §2, §3 (structure), §4, §6, §10 Tests, §10b Secure, §11 Stage 1. Rules: `CLAUDE.md`.

**Status:** Approved 2026-11-24 with Sohan's answers (see "Answers"). Issues #32–#40 on milestone Stage 1.

## Global Constraints

- Every internal URL through `url()`; canonical/OG/RSS/sitemap URLs are absolute production URLs built from
  `site.url` (never the preview base).
- Components never hardcode portfolio content; they read it only via `@/lib/content/*`.
- `lib/` stays free of React and the DOM. `lib/content` may import `astro:content` (the only allowed
  Astro import in `lib/`), so pure logic (sorting, date formatting, validation) lives in separate pure modules.
- Facts come only from the old site, SPEC §6 "Current facts", or Sohan. Anything else is `TODO(sohan)`.
  The current-facts list wins over the old site.
- Dark only, tokens only. Stage 1 styling is deliberately plain (tokens, system font stacks, simple layout);
  Stage 2 owns fonts, components, and the visual direction (see "Design note").
- Mobile-first, 320–2560px, no horizontal scroll; inputs ≥ 16px; `dvh`; long words wrap.
- CSP stays strict: Stage 1 adds only the Web3Forms endpoint (`connect-src` and `form-action`), after approval.
- New deps: @astrojs/rss 4.0.19, @astrojs/sitemap 3.7.6 (verified on npm 2026-11-24), exact pins, reasons in PRs.
- Coverage: `src/lib/**` ≥ 90% lines/branches, overall ≥ 80%.

## Review Focus

1. **Preview builds leak into search/SEO** — a preview's canonical, sitemap, and RSS must point at production,
   and preview pages get `<meta name="robots" content="noindex">`. e2e asserts both under a `BASE_PATH` build.
2. **Broken cross-references in content** — a project's `node` that names no experience entry, duplicate slugs,
   `end` before `start`, a `featured` project with no description. Content integrity tests fail the build.
3. **Contact form failure modes** — empty/invalid fields, Web3Forms 4xx/5xx, offline, double submit, and no JS
   at all. Each has an e2e case with the network mocked; no-JS posts directly and redirects back.
4. **Long and odd content** — 40-char tech names, long URLs, missing optional fields (no demo link, no
   end date, no metric). Fixture entries exercise these at 320px with the overflow assertion.
5. **TODO placeholders reaching production** — a `TODO(sohan)` must render as a visible "coming soon"-style
   gap, never a broken link; a test lists remaining TODOs and the release checklist requires reviewing it.

---

## Decisions

- **D1 Config path.** Astro 7 reads `src/content.config.ts`, not SPEC's `src/content/config.ts`.
  Update the SPEC §6 wording in PR 1 (no ADR; it's a framework convention, not a choice).
- **D2 File formats.** Collections with long prose are Markdown with frontmatter (profile, projects, updates)
  so Astro renders the body natively and we add no Markdown dependency. The rest are YAML.
- **D3 Nodes.** A node is declared by the `node` field of an `experience` or `education` entry:
  `capgemini`, `mastercontrol` (work), `northeastern` (Master's, plus the TA role as its own `experience`
  entry with `type: teaching`), `mumbai` (Bachelor's, for the 2019–21 projects), and `sparks-foundation` (2020 internship, added in PR 2). `mumbai` is a fourth node
  beyond SPEC §7's three; PR 1 updates §7. A project's `node` is optional: the portfolio itself runs on no
  past org, so it's unscheduled for now and Stage 4 decides how the map shows it.
- **D4 `/` in Stage 1.** Pre-rendered hero (name, title, tagline, links to every `/plain/` section, Resume,
  Contact). This is the no-JS fallback Stage 2+ builds on.
- **D5 Contact form.** Vanilla HTML form + small script, not a React island: works with JS off, keeps the plain
  view near-zero JS. Validation rules live in `src/lib/contact/` (pure, unit-tested).
- **D6 Canonical.** Always the production URL. Preview builds are `noindex`; the sitemap integration only
  emits on production builds (`BASE_PATH` unset).
- **D7 Analytics.** GoatCounter waits for Stage 6 (SPEC lists it there with command events); no analytics
  endpoint in the CSP yet.

## Design note

Stage 1 is content and structure, not the look. The plain view gets a clean, readable single column with
the §5 tokens and system font stacks, so Stage 2 can apply the chosen visual direction (Sohan wants real
flair: 3D, gamey, fun) without rewriting markup. Section components take content props and expose semantic
HTML only, which keeps a later reskin cheap. The plain view stays recruiter-first in every direction.

---

## PR split

| #   | Branch                          | Title                                                     | Tasks | Issues   |
| --- | ------------------------------- | --------------------------------------------------------- | ----- | -------- |
| 1   | `feat/stage-1-content-schemas`  | `feat(content): add content schemas and query helpers`    | 1–2   | #32, #33 |
| 2   | `feat/stage-1-content-data`     | `feat(content): add portfolio content and content review` | 3     | #34      |
| 3   | `feat/stage-1-plain-view`       | `feat(plain): add plain portfolio page and home hero`     | 4–5   | #35, #36 |
| 4   | `feat/stage-1-projects-updates` | `feat(plain): add project pages, updates, and rss feed`   | 6     | #37      |
| 5   | `feat/stage-1-contact-form`     | `feat(plain): add contact form`                           | 7     | #38      |
| 6   | `feat/stage-1-seo-404`          | `feat(seo): add metadata, sitemap, and themed 404 page`   | 8     | #39      |
| 7   | `docs/stage-1-wrap-up`          | `docs(docs): close out stage 1 in status and plan`        | 9     | #40      |

Each PR updates README/STATUS for what it changes and ticks this file.

---

### Task 1: Content schemas (PR 1) — done

**Files:** `src/content.config.ts`; `src/lib/content/schemas/{common,collections}.ts` + tests; empty content
dirs and lists in `src/content/`. SPEC §3/§6/§7 updated (D1, D3); ESLint and dependency-cruiser allow
`astro/zod` in `lib/` (re-exported Zod) and `astro:content` only in `lib/content/queries.ts`.

**Produces:** `profileSchema`, `experienceSchema`, `educationSchema`, `projectSchema`, `skillCategorySchema`,
`certificationSchema`, `achievementSchema`, `updateSchema`; primitives `slug`, `nodeName`, `yearMonth`,
`endDate`, `httpsUrl`, `linkUrl`. Ids come from file names / `id`, not the schemas.

- [x] Failing schema tests first: valid entries pass; required fields, bad enums, `2025-13`, `25-01`,
      non-kebab slugs, non-https URLs, `end < start`, issued certs without a date all fail.
- [x] Implement schemas; register collections with `glob`/`file` loaders.
- [x] `pnpm check` green. Deviation: no fixture seed in `src/content/` (fake entries could leak); the
      collections are empty until PR 2 (Astro only warns).

### Task 2: Content helpers and integrity check (PR 1) — done

**Files:** `src/lib/content/{queries,integrity,sort}.ts`, `src/lib/utils/dates.ts`, tests next to each.

**Produces:** `getProfile()`, `getExperience()`, `getEducation()` (newest first), `getProjects({ featured? })`
(by `order`), `getProject(slug)`, `getProjectsByNode(node)`, `getSkills()`, `getCertifications()` (in-progress
first), `getAchievements()`, `getUpdates()` (newest first, no drafts); `formatYearMonth('2025-06') → 'Jun 2025'`,
`formatRange('2021-05', 'present') → 'May 2021 – Present'`, `compareEnd`.

- [x] Failing tests first for sort order, id tie-breaks, `present` first, range formatting, invalid input.
- [x] Integrity check (`checkIntegrity`/`assertIntegrity`): one profile, kebab-case ids, every project `node`
      declared, featured projects have a body. Deviation: Vitest has no content data store, so instead of a
      test over real content, `queries.ts` runs the check on every load and the build fails on bad content.
      Duplicate ids can't be detected after loading (loaders key by id); `start ≤ end` is in the schemas.
- [x] Coverage: `src/lib/content` 98% lines / 93% branches.
- Deferred to Stage 3 (YAGNI until commands need them): `getTimeline()` and a kubectl-style `AGE` helper.

### Task 3: Content extraction and review (PR 2) — done

**Files:** `src/content/**` (1 profile, 4 roles, 2 degrees, 16 projects, 5 skill groups, 2 certs, 4 awards,
10 updates), `docs/content-review.md`; updated `docs/content-guide.md`, `docs/runbooks/adding-content.md`,
SPEC §6 (CKAD) and §7 (nodes).

- [x] Mapped the old site's `public/data/sections/*.json` with current facts winning; scope per A1, A2, A4,
      A5; the portfolio itself is a featured, unscheduled project.
- [x] The two MasterControl tools: details from Sohan; public names only ("Deployment gating bot",
      "AI migration agent framework"), never the internal names.
- [x] Found on the old site and kept: a 2020 **Web Development Intern** role at The Sparks Foundation, which
      becomes a fifth node (`sparks-foundation`) running Credit Management System. Flagged for Sohan.
- [x] `docs/content-review.md`: must-answer items (dates, degree names, locations, Sparks, bots,
      SafeHaven), numbers wanted, and the conflicts current facts resolved.
- [x] Content guide writing rules and the adding-content runbook filled in. Closes #30 (A8).
- [x] Verified with a throwaway page: every query loads in the expected order, and a project on an unknown
      node fails the build with the integrity message.

### Task 4: Plain view sections (PR 3) — done

**Files:** `src/components/plain/{Intro,SectionNav,Section,Experience,Projects,Skills,Education,
Certifications,Awards,Updates,Contact}*.astro`, `src/components/ui/{StatusPill,TagList,ExternalLink}.astro`,
`src/components/layout/{SiteHeader,SiteFooter}.astro`, `src/config/sections.ts`, `src/pages/plain/index.astro`,
`tests/e2e/plain.spec.ts`, `tests/support/checks.ts`; `renderEntry()` in `lib/content/queries.ts`.

- [x] Failing e2e first: every section has a heading, a `section#id`, and an on-this-page link; header
      controls are tappable (44px); no overflow; axe clean; print hides header and nav; resume serves a PDF;
      external links are `noopener noreferrer`; no `TODO(sohan)` and no AI-style punctuation in the page.
- [x] Header (name, Resume, Contact) and footer (version, source). No Plain/Cluster toggle until the
      cluster view exists (no dead links). Stage 2 replaces both.
- [x] Sections render from helpers only; dates via `formatRange`. Project detail links wait for PR 4.
- [x] `public/resume.pdf` committed (A7). Print stylesheet: light, one column, link URLs printed.
- [x] Found and fixed: Astro's Markdown smart quotes turned `'` into curly quotes; `smartypants` is off and
      the rendered page is checked. White on the accent fill (`--on-accent`) for AA contrast.

### Task 5: Home hero (PR 3) — done

- [x] `/` shows name, title, tagline, location, open-to-work, the main actions (View portfolio, Resume,
      Contact), and links to every `/plain/` section; works without JS. The version line moved to the
      footer on every page (smoke still finds `build-version`).

### Task 6: Project pages, updates, RSS (PR 4) — done

**Files:** `src/pages/projects/[slug].astro`, `src/pages/updates/{index,[slug]}.astro`, `src/pages/rss.xml.ts`,
`src/components/plain/UpdateDate.astro`, `src/lib/markdown/external-links.ts`, `src/lib/content/nodes.ts`,
`productionUrl()` in `src/lib/utils/url.ts`, `getNodeLabel()` in queries, `tests/e2e/projects-updates.spec.ts`.

- [x] Failing e2e first: all 16 project pages return 200 from the plain view's Details links; a project page
      shows status, dates, "Built at" (hidden when unscheduled), tech, links, and the description;
      `/updates/` lists 9 updates newest first; update pages render with safe external links; `/rss.xml` is
      RSS with 9 items and production links only; every page advertises the feed.
- [x] Added @astrojs/rss 4.0.19 (Astro's official feed builder, MIT, build time only).
- [x] Found: Astro 7's default Markdown processor (Sätteri) doesn't run rehype plugins. The external-links
      step is a Sätteri hast plugin, configured with `satteri()` from `@astrojs/markdown-satteri` (already
      installed by Astro, now declared directly). The deprecated `markdown.smartypants` flag became
      `features.smartPunctuation: false`.
- [x] Checked a preview-base build: feed links stay on production, page links use the preview path.

### Task 7: Contact form (PR 5) — done

**Files:** `src/lib/contact/{validate,submit}.ts` (+ tests), `src/components/plain/ContactForm.astro` (the
script lives in the component; no new `src/scripts/` folder), `src/pages/contact/thanks/index.astro`,
`tests/e2e/contact.spec.ts`; `site.contact` in `src/config/site.ts`; CSP in `BaseLayout.astro`;
`expectedConsoleErrors` option in `tests/support/fixtures.ts`.

- [x] Unit tests first: `validateContact` (trimming, all errors at once, email shape, 10 to 5000 characters,
      name cap, honeypot = spam), `contactPayload`, and `toSubmitResult` (sent, invalid, server-error,
      offline).
- [x] E2E first, with Web3Forms mocked: sent and cleared, validation errors with focus on the first,
      errors cleared once fixed, 400, 500 (with a mailto fallback), offline (message kept), double click
      sends once, labels and axe, CSP, no-JS post (fields, access key, redirect), thank-you page.
- [x] CSP adds only `https://api.web3forms.com` to `connect-src` and `form-action` (A6).
- [x] Tests that cause a failed request opt in to the browser's own "Failed to load resource" console
      error with an exact pattern; every other console error still fails the test.

### Task 8: SEO, sitemap, 404 (PR 6) — done

**Files:** Create `src/components/layout/SeoHead.astro`, `src/pages/404.astro`, `tests/e2e/seo.spec.ts`.
Modify `astro.config.mjs` (sitemap), `public/robots.txt` → `src/pages/robots.txt.ts`, `BaseLayout.astro`.

- [x] Failing e2e: every page has unique title/description, canonical to production, OG/Twitter tags, JSON-LD
      `Person` on `/` and `/plain/`; preview build is `noindex` and has no sitemap (D6); `/sitemap-index.xml`
      lists every page and nothing under `pr-preview/`; robots.txt points at it.
- [x] Failing e2e: unknown path shows `Error from server (NotFound): page "<path>" not found` with links home,
      under the preview base too (Pages serves `404.html` only at the site root: document the preview limitation).
- [x] Add @astrojs/sitemap 3.7.6; implement. Also: `src/lib/seo/meta.ts` (+ unit tests), a static share
      image `public/og-image.png` (source `docs/assets/og-image.html`, runbook `share-image.md`),
      `/contact/thanks/` is noindex and out of the sitemap. Checked a preview-base build: noindex, no
      sitemap, canonical and image on production.

### Task 9: Stage wrap-up (PR 7) — done

- [x] Lighthouse budgets on `/`, `/plain/`, a project page, `/updates/` (add URLs to `lighthouserc.json`).
      Also `/404.html`, with the noindex budget set from PR 6. All four pages 100/100/100/100 locally; the
      weekly production check still overrides the URL list.
- [x] Checked at 320/375/768/1280/1920 on the production build (7 page types, no sideways scroll; screenshots
      at 375, 768, 1920); README status, STATUS sign-off and retrospective; release PR #42 → v0.2.0.

---

## Manual steps for Sohan (each done before the PR that needs it)

| #   | When        | Step                                                                                                                                          | Status                                           |
| --- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| M11 | before PR 3 | Put the current resume at `public/resume.pdf`.                                                                                                | Done 2026-11-24                                  |
| M12 | before PR 3 | Answer `docs/content-review.md` (dates, metrics, links) so the plain view ships with real facts; answers land in PR 2 or a `fix(content)` PR. | Done 2026-11-25 (older project dates still open) |
| M13 | before PR 5 | Create a Web3Forms access key for your email at web3forms.com and paste it in chat (public-safe; goes in `src/config/site.ts`).               | Done 2026-11-25                                  |

## Answers (2026-11-24)

- **A1 Projects:** featured = askTRACE, this portfolio (`roarceus-github-io`), SafeHaven (featured for now;
  "maybe", flagged in content review). Everything else non-featured: AWS IaaS, the two MasterControl tools,
  Grade Calculator, HuskyHub, Book Review System, and the 2019–21 web projects (travel site, maps clone,
  analog clock, both meeting-notes apps, credit management, Kounsellor).
- **A2 Contact details:** email, GitHub, LinkedIn. No phone, no Instagram.
- **A3 Testimonials:** none.
- **A4 Certifications:** CKA and CKAD, both `in-progress` (2020 Coursera certs dropped). All four awards as
  achievements. SPEC §6 current facts gain CKAD in PR 2.
- **A5 Spoken languages and "fun facts":** dropped.
- **A6 Contact provider:** Web3Forms; `api.web3forms.com` approved for the CSP.
- **A7 Resume:** `public/resume.pdf` supplied; linked in PR 3.
- **A8 Issue #30:** closed by PR 2.
