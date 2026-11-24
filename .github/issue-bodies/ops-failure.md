The weekly production check failed. This issue is opened (or updated) automatically by
`.github/workflows/scheduled.yml` and closes itself when a later run passes.

**Run:** {{RUN_URL}}
**Failed checks:** {{FAILED}}

## What to do

- **Smoke tests failed:** the live site is broken or unreachable. Follow `docs/runbooks/rolling-back.md`
  (Actions → Release → Run workflow with the previous tag), then fix forward with a `fix/...` PR.
- **Link check failed:** an external link in the content has rotted. Update or remove it in a
  `fix(content): ...` PR.
- **Lighthouse failed:** a budget regressed on production (perf ≥ 90 mobile, a11y/best practices/SEO ≥ 95).
  Download the `lighthouse-production` artifact from the run to see which audits dropped.

If production was down, write a postmortem in `docs/postmortems/` (SPEC §10b).
