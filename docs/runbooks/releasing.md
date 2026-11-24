# Runbook: releasing

Production only changes when a release PR merges (SPEC §10 Versioning).

## How releases happen

1. Every merge to `main` runs `release.yml`. release-please (authenticated as the
   `roarceus-release-bot` GitHub App) opens or updates **one** release PR titled
   `chore(release): release x.y.z`, with the version bump in `package.json` and
   `.release-please-manifest.json` and the new `CHANGELOG.md` section.
2. The version comes from the Conventional Commit titles since the last release. Pre-1.0: `feat` → minor,
   `fix` → patch. Each stage ships as a minor release (`0.1.0`, `0.2.0`, ...). Changelog shows feat, fix,
   perf, and revert; other types are hidden.
3. **Merging the release PR** creates the tag `vX.Y.Z` and the GitHub Release, then the same workflow
   builds that tag, deploys it to the root of `gh-pages` (keeping `pr-preview/`), and runs smoke tests
   against https://roarceus.github.io/.

## Steps

1. Wait for the stage's last PR to merge. The release PR updates itself.
2. Open the release PR and work through its checklist (CI green on `main`, preview verified, smoke passed,
   README and STATUS current, manual steps listed).
3. Merge it (squash).
4. Watch Actions → **Release**: `release-please` → `deploy` → `smoke`. Smoke waits until the live page
   shows the new version and commit, then checks every asset.
5. Open https://roarceus.github.io/ and confirm the page's version line shows `vX.Y.Z`.

If `smoke` fails, production is broken: follow [rolling-back.md](rolling-back.md).

## Special cases

- **Releasing 1.0.0 (Stage 7):** release-please needs a `Release-As: 1.0.0` footer in a commit on `main`.
  Squash merges keep only what's in the merge dialog, so when merging Stage 7's last PR, edit the
  commit message in GitHub's merge dialog and add a blank line plus `Release-As: 1.0.0` at the end.
  A footer in the PR description or in branch commits is dropped by the squash.
- **The release PR shows the wrong version:** fix `release-please-config.json` in a normal PR; release-please
  rewrites the release PR on the next push. Never merge a wrong one: `v*` tags are protected and can't
  be deleted.
