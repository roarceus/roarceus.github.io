---
name: This portfolio
tagline: 'This site: my career as a Kubernetes cluster you can explore with kubectl or a click.'
status: running
node: personal
tech: [Astro, React, TypeScript, Tailwind CSS, GitHub Actions, Playwright, Vitest]
links:
  repo: https://github.com/roarceus/roarceus.github.io
  demo: https://roarceus.github.io/
featured: true
order: 2
start: 2026-11
---

The site you're on. My career is modeled as a Kubernetes cluster: organizations are nodes, projects are
pods, and you can explore it with `kubectl`-style commands, a clickable cluster map, or a plain view.

- Static Astro site with React islands; content is YAML and Markdown validated by Zod schemas.
- Every pull request gets a preview deployment; releases are versioned by release-please.
- CI runs lint, type checks, unit and end-to-end tests on three browser engines, accessibility checks,
  Lighthouse budgets, and link checks.
