// JavaScript budgets (stage-3 plan, Task 6c). Pure functions over built HTML and JS text, so they run
// in unit tests and in .github/scripts/check-budgets.mjs, which reads the files and gzips them.

export interface Measured {
  /** Island component and renderer code with its static imports, minus the shared React runtime. */
  islandBytes: number;
  /** Everything the dashboard page runs at startup (all scripts and their static imports). */
  startupBytes: number;
  /** Startup scripts per production page, keyed by its path in `dist/`. */
  pages: Record<string, number>;
}

export type Budgets = Measured;

const unique = (urls: string[]): string[] => [...new Set(urls)];
const attr = (html: string, pattern: RegExp): string[] =>
  [...html.matchAll(pattern)].map((m) => String(m[1]));

/** Island component and renderer URLs (`<astro-island>` attributes). */
export function islandEntries(html: string): string[] {
  const tags = attr(html, /<astro-island\b([^>]*)>/g);
  return unique(tags.flatMap((tag) => attr(tag, /\b(?:component|renderer)-url="([^"]+)"/g)));
}

/** Every script URL a page loads at startup, and the bodies of its inline scripts (JSON-LD excluded). */
export function startupScripts(html: string): { entries: string[]; inline: string[] } {
  const tags = [
    ...html.matchAll(
      /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"[^>]*>|<script\b[^>]*\bsrc="([^"]+)"[^>]*>/g,
    ),
  ].map((m) => String(m[1] ?? m[2]));
  const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter((m) => !/\bsrc=|application\/ld\+json/.test(String(m[1])))
    .map((m) => String(m[2]));
  return { entries: unique([...tags, ...islandEntries(html)]), inline };
}

/** Static import and re-export specifiers. Dynamic `import()` is left out: those chunks load later. */
export function staticImports(code: string): string[] {
  // The string must follow `import`/`export` directly or after `from`, so `import("x")` never matches.
  const found = [...code.matchAll(/\b(?:import|export)\s*(?:[\w*${}\s,]*?\bfrom\s*)?["']([^"']+)["']/g)];
  return found.filter((m) => code[m.index - 1] !== '.').map((m) => String(m[1]));
}

/** URLs reachable from `entries` through static imports, each once, in the order they are found. */
export function collectGraph(entries: string[], read: (url: string) => string): string[] {
  const seen: string[] = [];
  const queue = [...entries];
  for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
    if (seen.includes(url)) continue;
    seen.push(url);
    for (const spec of staticImports(read(url))) queue.push(new URL(spec, `https://site${url}`).pathname);
  }
  return seen;
}

/** One message per limit that `measured` exceeds; empty when everything fits. */
export function checkBudgets(measured: Measured, budgets: Budgets): string[] {
  const problems: string[] = [];
  if (measured.islandBytes > budgets.islandBytes)
    problems.push(
      `island code is ${String(measured.islandBytes)} bytes gzipped, over the ${String(budgets.islandBytes)} budget`,
    );
  if (measured.startupBytes > budgets.startupBytes)
    problems.push(
      `dashboard startup is ${String(measured.startupBytes)} bytes gzipped, over the ${String(budgets.startupBytes)} budget`,
    );
  for (const [page, bytes] of Object.entries(measured.pages)) {
    const limit = budgets.pages[page];
    if (limit === undefined) problems.push(`${page} has no budget in .github/budgets.json`);
    else if (bytes > limit)
      problems.push(`${page} scripts are ${String(bytes)} bytes gzipped, over the ${String(limit)} budget`);
  }
  return problems;
}
