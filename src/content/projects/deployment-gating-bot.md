---
name: Deployment gating bot
tagline: A GitHub App that pauses merges or deployments across 60+ GitOps repos with one switch per repo.
status: completed
node: mastercontrol
tech: [TypeScript, Probot, GitHub Apps, Kubernetes, Helm, Argo CD, Vitest, cosign]
featured: false
order: 4
start: 2025-06
end: 2025-12
---

Release managers needed a way to freeze merges to main before a release, or stop dev deployments during
an incident. Before this, that meant editing workflows or branch protection in every repo. This GitHub App
gives them one switch per repo for two gates, merges to main and dev deployments, across 60+
GitOps-deployed repos.

How it works:

- Written in TypeScript on Probot. It hooks into GitHub deployment protection rules and the Checks API.
- Gate state lives in repo custom properties, so there's no database. The bot is stateless, so restarts
  and rollbacks lose nothing.
- It fails open. If the bot is down, teams can still ship.
- Runs on Kubernetes from a Helm chart deployed by Argo CD.

I designed and built it end to end during my co-op at MasterControl: the gates, a token-authenticated
control API, a 15-test Vitest suite, and a CI pipeline that publishes cosign-signed images. I also wrote
the design for extending it to staging and release branches. It's an internal tool, so the code isn't
public.
