# Security policy

## Reporting a vulnerability

Please **don't open a public issue**. Report it privately through GitHub:

**[Report a vulnerability](https://github.com/roarceus/roarceus.github.io/security/advisories/new)**
(Security tab → Advisories → Report a vulnerability).

Include what you found, where (URL or file), how to reproduce it, and the impact you expect. You'll get
an acknowledgement within 7 days. Fixes ship as a normal patch release, and you're credited in the
advisory unless you'd rather not be.

## Supported versions

Only the version currently deployed at https://roarceus.github.io/ (the latest release) is supported.

## Scope

This is a static site on GitHub Pages: no backend, no accounts, no stored user data. In scope:

- Cross-site scripting or content injection on the site, including PR previews
- Content Security Policy bypasses
- Supply-chain issues in this repo's dependencies or GitHub Actions workflows
- Leaked secrets in the repository or its history

Out of scope: GitHub Pages infrastructure itself, third-party services (report to them directly), and
missing security headers that GitHub Pages doesn't let a site set.

## What's in place

Secret scanning with push protection, Dependabot alerts, dependency review on every PR, CodeQL, OpenSSF
Scorecard, SHA-pinned GitHub Actions with least-privilege tokens, and a strict CSP. Details:
[`docs/SPEC.md`](docs/SPEC.md) §10b.
