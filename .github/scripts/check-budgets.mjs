// JavaScript budgets (stage-3 plan, Task 6c): `node .github/scripts/check-budgets.mjs dist dist-dashboard`.
// Measures, gzipped: the dashboard's island code (components and renderers with their static imports,
// minus the shared react-runtime chunk), everything the dashboard runs at startup, and the startup
// scripts of the production home and plain pages. Fails over the limits in .github/budgets.json.
// `--print` only prints the measurements as JSON (for setting the budgets).
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import { checkBudgets, collectGraph, islandEntries, startupScripts } from '../../src/lib/perf/budgets.ts';

const args = process.argv.slice(2);
const print = args.includes('--print');
const [prod, dashboard] = args.filter((a) => !a.startsWith('--'));
if (!prod || !dashboard) {
  console.error('usage: check-budgets.mjs <production build dir> <dashboard build dir> [--print]');
  process.exit(2);
}

const gz = (text) => gzipSync(text, { level: 9 }).length;
const reader = (dir) => (url) => readFileSync(join(dir, url.replace(/^\//, '')), 'utf8');
const sum = (dir, urls) => urls.reduce((total, url) => total + gz(reader(dir)(url)), 0);
const startup = (dir, page) => {
  const { entries, inline } = startupScripts(readFileSync(join(dir, page), 'utf8'));
  return sum(dir, collectGraph(entries, reader(dir))) + inline.reduce((t, body) => t + gz(body), 0);
};

const home = readFileSync(join(dashboard, 'index.html'), 'utf8');
const island = collectGraph(islandEntries(home), reader(dashboard)).filter(
  (url) => !/\/react-runtime\./.test(url),
);
const measured = {
  islandBytes: sum(dashboard, island),
  startupBytes: startup(dashboard, 'index.html'),
  pages: Object.fromEntries(['index.html', 'plain/index.html'].map((page) => [page, startup(prod, page)])),
};

if (print) {
  console.log(JSON.stringify(measured, null, 2));
  process.exit(0);
}

const budgets = JSON.parse(readFileSync(new URL('../budgets.json', import.meta.url), 'utf8'));
const rows = [
  ['Dashboard island code (no React runtime)', measured.islandBytes, budgets.islandBytes],
  ['Dashboard startup, all scripts', measured.startupBytes, budgets.startupBytes],
  ...Object.entries(measured.pages).map(([page, bytes]) => [
    `Production ${page}`,
    bytes,
    budgets.pages[page],
  ]),
];
const table = [
  '| Budget | Gzipped bytes | Limit |',
  '|---|---|---|',
  ...rows.map(([name, bytes, limit]) => `| ${name} | ${String(bytes)} | ${String(limit ?? 'none')} |`),
].join('\n');
console.log(table);
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### JavaScript budgets\n\n${table}\n`);

const problems = checkBudgets(measured, budgets);
for (const problem of problems) console.error(`::error::${problem}`);
process.exit(problems.length === 0 ? 0 : 1);
