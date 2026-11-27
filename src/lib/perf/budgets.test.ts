import { describe, expect, it } from 'vitest';

import { checkBudgets, collectGraph, islandEntries, startupScripts, staticImports } from './budgets';

const PAGE = `<!doctype html><html><head>
<script type="application/ld+json">{"@type":"Person"}</script>
<link rel="modulepreload" href="/assets/pre.js">
<script>console.log("inline")</script>
<script type="module" src="/assets/page.js"></script>
</head><body>
<astro-island uid="a" component-url="/assets/Terminal.js" renderer-url="/assets/client.js" props="{}"></astro-island>
</body></html>`;

describe('startupScripts', () => {
  it('lists every script the page loads at startup, and its inline scripts', () => {
    const { entries, inline } = startupScripts(PAGE);
    expect(entries).toEqual([
      '/assets/pre.js',
      '/assets/page.js',
      '/assets/Terminal.js',
      '/assets/client.js',
    ]);
    expect(inline).toEqual(['console.log("inline")']);
  });

  it('matches tags in any case and end tags the way browsers read them', () => {
    const html = `<SCRIPT TYPE="module" SRC="/assets/a.js"></SCRIPT ><Script>run()</Script >
<LINK REL="modulepreload" HREF="/assets/b.js"><ASTRO-ISLAND COMPONENT-URL="/assets/c.js"></ASTRO-ISLAND>
<script>two()</script\t\n bar>`;
    expect(startupScripts(html)).toEqual({
      entries: ['/assets/a.js', '/assets/b.js', '/assets/c.js'],
      inline: ['run()', 'two()'],
    });
  });

  it('skips JSON-LD and does not count a URL twice', () => {
    const html = `${PAGE}<astro-island component-url="/assets/Terminal.js" renderer-url="/assets/client.js"></astro-island>`;
    expect(startupScripts(html).entries).toHaveLength(4);
  });
});

describe('islandEntries', () => {
  it('lists island component and renderer URLs only', () => {
    expect(islandEntries(PAGE)).toEqual(['/assets/Terminal.js', '/assets/client.js']);
  });
});

describe('staticImports', () => {
  it('finds static imports and re-exports in minified code, never dynamic import()', () => {
    const code = `import{a as b}from"./react.js";import"./side.js";export*from"./all.js";export{c}from'./c.js';const l=()=>import("./lazy.js");`;
    expect(staticImports(code)).toEqual(['./react.js', './side.js', './all.js', './c.js']);
  });
});

describe('collectGraph', () => {
  const files: Record<string, string> = {
    '/assets/Terminal.js':
      'import{x}from"./react-runtime.A.js";import"./yaml.js";const y=()=>import("./lazy.js")',
    '/assets/client.js': 'import{x}from"./react-runtime.A.js"',
    '/assets/react-runtime.A.js': '',
    '/assets/yaml.js': 'import"./react-runtime.A.js"',
  };

  it('walks static imports once each and leaves lazy chunks out', () => {
    const graph = collectGraph(['/assets/Terminal.js', '/assets/client.js'], (url) => files[url] ?? '');
    expect(graph).toEqual([
      '/assets/Terminal.js',
      '/assets/client.js',
      '/assets/react-runtime.A.js',
      '/assets/yaml.js',
    ]);
  });

  it('resolves relative imports from the importing file', () => {
    const graph = collectGraph(['/pr-preview/pr-9/assets/a.js'], (url) =>
      url.endsWith('a.js') ? 'import"../b.js"' : '',
    );
    expect(graph).toEqual(['/pr-preview/pr-9/assets/a.js', '/pr-preview/pr-9/b.js']);
  });
});

describe('checkBudgets', () => {
  const budgets = {
    islandBytes: 61440,
    startupBytes: 80000,
    pages: { 'index.html': 1000, 'plain/index.html': 500 },
  };

  it('passes when everything is at or under its limit', () => {
    const measured = {
      islandBytes: 61440,
      startupBytes: 79999,
      pages: { 'index.html': 1000, 'plain/index.html': 0 },
    };
    expect(checkBudgets(measured, budgets)).toEqual([]);
  });

  it('names each limit that is exceeded, with both numbers', () => {
    const measured = {
      islandBytes: 61441,
      startupBytes: 80001,
      pages: { 'index.html': 1200, 'plain/index.html': 500 },
    };
    expect(checkBudgets(measured, budgets)).toEqual([
      'island code is 61441 bytes gzipped, over the 61440 budget',
      'dashboard startup is 80001 bytes gzipped, over the 80000 budget',
      'index.html scripts are 1200 bytes gzipped, over the 1000 budget',
    ]);
  });

  it('fails a page that has no recorded budget', () => {
    const measured = {
      islandBytes: 0,
      startupBytes: 0,
      pages: { 'index.html': 0, 'plain/index.html': 0, 'new.html': 5 },
    };
    expect(checkBudgets(measured, budgets)).toEqual(['new.html has no budget in .github/budgets.json']);
  });
});
