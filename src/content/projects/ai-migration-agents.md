---
name: AI migration agent framework
tagline: LangGraph and Claude Code agents that migrated about 55 Java services and got 100+ PRs merged.
status: completed
node: mastercontrol
tech: [LangGraph, Claude Code, Java, Gradle, GitHub, Slack]
featured: false
order: 5
start: 2025-06
end: 2025-12
---

The platform team wanted about 55 Java/Gradle services on their standard Gradle plugins (base Java setup,
static analysis, and Sonar). By hand that meant a lot of near-identical PRs, so I built agents to do it.

- LangGraph runs a fixed, auditable workflow for each repo: clone it, check whether it needs the update,
  make the change, open a draft PR, wait for CI, retry with the CI feedback, and post to Slack.
- Claude Code makes the actual edits inside each repo.
- I wrote the prompts (a manager agent plus subagents, 17 to 50 KB each) and revised them about 20
  times, turning each repo that failed into a new rule.
- I also wrote scripts to promote passing PRs and track rollout status for the handoff.

Over three rollouts it made 100 to 150 repo changes and got over 100 PRs merged, from about 350 agent
sessions in 63 repos. People only reviewed PRs that were already green. It's internal to MasterControl,
so the code isn't public.
