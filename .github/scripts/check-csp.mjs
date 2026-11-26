// Audits the CSP of every built HTML page (ADR 0004): `node .github/scripts/check-csp.mjs dist [...]`.
// Each page must have the CSP meta tag first in <head>, the directives from src/lib/seo/csp.ts, only
// 'self' and hashes in script-src and style-src, a hash for every inline script and style, and no
// style attributes or inline event handlers. Node strips the TypeScript types on import.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { site } from '../../src/config/site.ts';
import { auditCsp } from '../../src/lib/seo/csp.ts';

const pages = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pages(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });

const dirs = process.argv.slice(2);
if (dirs.length === 0) {
  console.error('usage: check-csp.mjs <build dir> [...]');
  process.exit(2);
}

let failed = 0;
let checked = 0;
for (const dir of dirs) {
  for (const page of pages(dir)) {
    checked++;
    const problems = auditCsp(readFileSync(page, 'utf8'), site.contact.endpoint);
    if (problems.length === 0) continue;
    failed++;
    for (const problem of problems) console.error(`::error file=${page}::${problem}`);
  }
}
console.log(`CSP: ${String(checked - failed)} of ${String(checked)} pages pass in ${dirs.join(', ')}`);
process.exit(failed === 0 ? 0 : 1);
