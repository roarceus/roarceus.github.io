# Runbook: rolling back production

First response to a bad release (SPEC §10b Incidents): **roll back, then fix forward.**

## Steps

1. Find the last good tag: Releases page, or `gh release list -R roarceus/roarceus.github.io`.
2. Actions → **Release** → **Run workflow** → branch **`main`** → `tag`: e.g. `v0.1.0` → Run.
   (CLI: `gh workflow run release.yml -R roarceus/roarceus.github.io -f tag=v0.1.0`.)
3. The run validates the tag (`vX.Y.Z`, must exist), checks out that tag, rebuilds it with its own version
   and commit, deploys it to `gh-pages` (keeping PR previews), and runs smoke tests against production.
4. Confirm the site shows the old version. The `smoke` job only passes once the live page reports it.

The run must start from `main`: the `github-pages` environment only allows `main` and `gh-pages`.

## Afterwards

1. Fix the problem on a new `fix/...` branch with a failing test first, through a normal PR
   ([hotfixing.md](hotfixing.md)). The next release replaces the rolled-back version.
2. If production was broken for visitors, write a postmortem in `docs/postmortems/` using
   [`0000-template.md`](../postmortems/0000-template.md).
3. If the weekly `Scheduled` run opened an `ops` issue, it closes itself on the next passing run.

## Notes

- A rollback doesn't touch tags, releases, or `main`; it only changes what `gh-pages` serves.
- Release-please's next release PR still builds on `main`, so the bad change stays until the fix merges.
