---
name: OCT data API
tagline: Node.js APIs serving the OCT imaging dashboards, with large images in object storage.
status: completed
node: capgemini
tech: [Node.js, PostgreSQL, Redis]
highlights:
  - About 40% faster data retrieval with Redis caching and PostgreSQL indexes tuned with EXPLAIN ANALYZE.
  - About 25% lower API latency by returning only new readings and smaller payloads per update.
featured: false
order: 18
start: 2021-05
---

Node.js APIs that served the OCT imaging dashboards. Large images lived in object storage, and the
database held their metadata and pointers to them.

- About 40% faster data retrieval, from Redis caching and PostgreSQL indexes tuned with EXPLAIN ANALYZE.
- About 25% lower API latency, by returning only new readings and sending smaller payloads per update.

I built them at Capgemini with Node.js, PostgreSQL, and Redis. The code isn't public.
