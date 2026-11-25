# Content review

Everything in `src/content/` that is a guess, outdated, conflicting, vague, or missing a number. Content
came from the old site (`roarceus/portfolio`, `public/data/sections/*.json`) and SPEC §6 "Current facts";
where they disagree, current facts won. Nothing here was invented: unknowns are `TODO(sohan)` or are
listed below with the value currently in the file.

**How to answer:** reply in chat or edit this file. Each answer lands in this PR or a `fix(content)` PR,
and the item is ticked here. Needed before PR 3 (the plain view) so it ships with real facts.

## Must answer (wrong or missing in the site today)

- [ ] **Northeastern dates.** Old site says Jan 2024 – Dec 2025; current facts say you graduated in
      spring 2026. File has `2024-01` → `2026-05` (May is a guess). Exact start and graduation months?
      (`education/northeastern.yaml`)
- [ ] **Degree names.** File says "Master of Science, Information Systems" and "Bachelor of Engineering,
      Computer Engineering" (old site: "Master's" / "Bachelor's"). Correct official names?
- [ ] **MasterControl location** (`TODO(sohan)`): city, or "Remote"? (`experience/mastercontrol.yaml`)
- [ ] **Capgemini location:** file says "India". City? (`experience/capgemini.yaml`)
- [ ] **The Sparks Foundation** (web development intern, Aug–Sep 2020, old site): keep it as a role and a
      cluster node, or drop it (and move Credit Management System to another node)? Location
      (`TODO(sohan)`)?
- [ ] **TA dates:** old site has Jan 2026 – Apr 2026. Exact? Also the date of the "Started a teaching
      assistantship" update (file: 2026-01-01).
- [ ] **Bay Area move date:** current facts say August 2026; the update is dated `2026-08-01` (day is a
      guess).
- [ ] **PromotionBot and BoringBot:** only one line each from the current facts. Need: 2–4 sentences on
      what each does and why, your role, results/metrics, status (`completed` assumed), dates (file uses
      the co-op dates), and whether there's a public link. Are those the names to use publicly?
- [ ] **Featured: SafeHaven** — you said "maybe". It's featured for now; keep it?

## Numbers and specifics (makes the content stronger)

- [ ] **MasterControl results:** any metrics (deploy time, pipeline speed, teams or repos served, rollout
      effort saved by BoringBot)? The role currently has no numbers.
- [ ] **Capgemini:** the ~40% and ~25% figures are in. Team size, scale (users, images, hospitals), or
      anything about the real-time dashboard?
- [ ] **askTRACE:** your part on the team, scale, and a demo or write-up link. The repo link points to the
      GitHub org (`trace-survey-analysis`), not one repo: is that right?
- [ ] **AWS infrastructure project:** the link points to an org/profile (`user-profile-terraform-iac`), not
      a repo. Correct URL? The old site said it was for CSYE 6200 (that's not a cloud course): which
      course, if any?
- [ ] **Project dates:** missing for Grade Calculator, HuskyHub, Book Review System, Kounsellor, both
      Meeting Notes apps, Maps Clone, Travel Website, Analog Clock.
- [ ] **Project nodes (eras):** Kounsellor, Meeting Notes, Maps Clone, Travel Website, and Analog Clock
      are on `mumbai` (assumed 2019–21). Book Review System and Meeting Notes (React) have no node
      (unknown era). Correct?
- [ ] **Skill levels (1–5)** for `kubectl top skills` — none set. Also check the list in `skills.yaml`
      (SQL and Bash are inferred from your roles; Go is from askTRACE and the old bio).
- [ ] **Profile tagline and title** (`profile/profile.md`): written from the current facts; reword if you
      like.

## Conflicts resolved by current facts (FYI, no action unless wrong)

- Old bio said "TypeScript, Python and Go"; now "TypeScript and Python, some Java".
- Old location Boston, MA → Santa Clara, CA. Old "Currently pursuing a Master's" → graduated.
- MasterControl "DevOps Intern" (old update) → "DevOps Engineer (Co-op)".
- Old capabilities blurbs, "fun facts", spoken languages, testimonials, phone, Instagram, and the 2020
  Coursera certificates are dropped (your answers A2–A5).
- CKA and CKAD are both listed as in progress.
