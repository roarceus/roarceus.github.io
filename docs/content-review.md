# Content review

Everything in `src/content/` that was a guess, outdated, conflicting, vague, or missing a number. Content
came from the old site (`roarceus/portfolio`, `public/data/sections/*.json`), SPEC §6 "Current facts", and
Sohan's answers (2026-11-25). Nothing is invented: unknowns stay `TODO(sohan)` or are listed here.

**How to answer:** reply in chat or edit this file. Answers land in a `fix(content)` PR and get ticked here.

## Open

- [ ] **Older project dates and eras:** no dates for Kounsellor, both Meeting Notes apps, Maps Clone,
      Travel Website, Analog Clock, and Book Review System ("older than 2024"). Five of them sit on the
      `mumbai` node (assumed Bachelor's era); Book Review System and Meeting Notes (React) have no node.
      Fine as is, or do you know any of them?

- [ ] **Capgemini project dates (TODO(sohan)):** "OCT imaging dashboard" and "OCT data API" start in
      2021; the content uses 2021-05 (when the Capgemini role started) and leaves the end out until you
      confirm both months.
- [ ] **Project names:** each project has one display name (prose, project pages, the plain view) and
      one slug (its URL `/projects/<slug>/` and its name in `kubectl get pods`). Check the names against
      your resume. Changing a slug changes the project's URL, so slugs stay unless you say otherwise.

      | Display name                     | Slug                       | Node              |
      | -------------------------------- | -------------------------- | ----------------- |
      | AI migration agent framework     | `ai-migration-agents`      | mastercontrol     |
      | Deployment gating bot            | `deployment-gating-bot`    | mastercontrol     |
      | OCT imaging dashboard            | `oct-imaging-dashboard`    | capgemini         |
      | OCT data API                     | `oct-data-api`             | capgemini         |
      | askTRACE                         | `asktrace`                 | northeastern      |
      | AWS infrastructure for a web app | `aws-iaas`                 | northeastern      |
      | HuskyHub                         | `huskyhub`                 | northeastern      |
      | Grade Calculator                 | `neu-grade-calculator`     | northeastern      |
      | SafeHaven                        | `safehaven`                | northeastern      |
      | This portfolio                   | `roarceus-github-io`       | unscheduled       |
      | Book Review System               | `book-review-system`       | unscheduled       |
      | Meeting Notes (React)            | `meeting-notes-react`      | unscheduled       |
      | Credit Management System         | `credit-management-system` | sparks-foundation |
      | Analog Clock                     | `analog-clock`             | mumbai            |
      | Kounsellor                       | `kounsellor`               | mumbai            |
      | Maps Clone                       | `google-maps-clone`        | mumbai            |
      | Meeting Notes                    | `meeting-notes`            | mumbai            |
      | Travel Website                   | `travel-website`           | mumbai            |

      Names that read differently from their slug: "Maps Clone" (`google-maps-clone`), "AWS
      infrastructure for a web app" (`aws-iaas`), "Grade Calculator" (`neu-grade-calculator`), and "This
      portfolio" (`roarceus-github-io`). The MasterControl names stay generic (answered 2026-11-26).

## Answered (2026-11-25)

- [x] Northeastern: Jan 2024 to Apr 2026, Master of Science in Information Systems. Bachelor of
      Engineering in Computer Engineering, University of Mumbai.
- [x] MasterControl: Salt Lake City, UT (remote). Capgemini: Mumbai, India.
- [x] The Sparks Foundation: kept as a role and node, remote (Mumbai).
- [x] TA: Jan 2026 to Apr 2026.
- [x] Bay Area move: the update post was removed (location is in the profile).
- [x] The two MasterControl tools: full write-ups with numbers, under their public names "Deployment
      gating bot" and "AI migration agent framework". Internal names stay out of public content.
- [x] SafeHaven stays featured.
- [x] MasterControl numbers: 60+ repos (deploy gate), about 55 services and 100+ merged PRs (agents).
      Deploy time saved was never tracked, so it's left out.
- [x] Capgemini: no team size or user counts available; added who used it and the terabytes of data.
- [x] askTRACE: two-person team, 13 repos, demo video linked, org link confirmed. The teammate stays unnamed.
- [x] AWS project: CSYE 6225, solo, three repos; the org link resolves (`tf-aws-infra`, `webapp`,
      `serverless`).
- [x] Grade Calculator Jan to Apr 2025; HuskyHub Jan to Apr 2024.
- [x] Skill levels (1 to 5) set for the 21 skills Sohan rated; the rest show no bar.
- [x] Title kept, written without the middle dot. Tagline shortened to cover backend too: "I build backend
      services, CI/CD pipelines, and Kubernetes tooling." Location shown as "San Francisco Bay Area".

## Conflicts resolved by current facts (FYI)

- Old bio said "TypeScript, Python and Go"; now "TypeScript and Python, some Java".
- Old location Boston, MA, is now the San Francisco Bay Area. Old "currently pursuing a Master's" is now graduated.
- MasterControl "DevOps Intern" (old update) is now "DevOps Engineer (Co-op)".
- Old capabilities blurbs, "fun facts", spoken languages, testimonials, phone, Instagram, and the 2020
  Coursera certificates are dropped (answers A2 to A5).
- CKA and CKAD are both listed as in progress.
