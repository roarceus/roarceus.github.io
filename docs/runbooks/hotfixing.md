# Runbook: hotfixing

Same gates as any change; no shortcuts (SPEC §10b).

1. If production is broken, [roll back](rolling-back.md) first.
2. Branch from the latest `main`: `git switch main && git pull --ff-only && git switch -c fix/<scope>-<what>`.
3. Write a test that reproduces the bug and fails. Then fix it, and confirm the test passes.
4. `pnpm check`, push, open a draft PR titled `fix(<scope>): <what>` (this becomes the changelog entry).
5. Check the PR preview, wait for `ci-ok` and `validate`, mark it ready, merge.
6. release-please updates the release PR with a **patch** bump. Merge it to deploy
   ([releasing.md](releasing.md)).
7. Write a postmortem if visitors were affected.
