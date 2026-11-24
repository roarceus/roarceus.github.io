# YYYY-MM-DD: Short description of what broke

- **Status:** draft | final
- **Severity:** outage | degraded | cosmetic
- **Duration:** start → end (UTC), total minutes
- **Author:** name

Blameless: describe what happened and what the system allowed, not who did it.

## Summary

Two or three sentences: what broke, who was affected, how it was fixed.

## Impact

What visitors saw (broken pages, missing assets, wrong content), for how long, and on which URLs.

## Timeline (UTC)

| Time  | Event                                                                 |
| ----- | --------------------------------------------------------------------- |
| HH:MM | Release vX.Y.Z deployed / change merged                               |
| HH:MM | Problem detected (how: smoke test, ops issue, uptime monitor, report) |
| HH:MM | Rolled back to vX.Y.Z (`release.yml` → Run workflow)                  |
| HH:MM | Fix merged and released                                               |

## Root cause

The technical cause, and why tests, previews, and smoke tests didn't catch it.

## Resolution

What was done to restore service (usually a rollback), then the permanent fix (PR link).

## Follow-ups

- [ ] Test that would have caught this (link issue)
- [ ] Process or tooling change (link issue)
