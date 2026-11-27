// @ts-check
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { satteri } from '@astrojs/markdown-satteri';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { site as siteConfig } from './src/config/site.ts';
import { codeTheme, styleToClass } from './src/lib/markdown/code-highlight.ts';
import { externalLinkRel } from './src/lib/markdown/external-links.ts';
import { cspDirectives, hoistCspMeta } from './src/lib/seo/csp.ts';

/**
 * Moves Astro's CSP meta tag to right after <meta charset> in every built page (ADR 0004): a meta CSP
 * only applies to what follows it. The hashes cover script and style contents, so they still match.
 * @returns {import('astro').AstroIntegration}
 */
function hoistCsp() {
  return {
    name: 'hoist-csp',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const root = fileURLToPath(dir);
        const files = await readdir(root, { recursive: true });
        for (const file of files.filter((name) => name.endsWith('.html'))) {
          const path = `${root}/${file}`;
          await writeFile(path, hoistCspMeta(await readFile(path, 'utf8')));
        }
      },
    },
  };
}

// Production builds at "/", PR previews at "/pr-preview/pr-<N>/" (set by CI). See SPEC §2.
const base = process.env.BASE_PATH || '/';
const isProduction = base === '/';

export default defineConfig({
  site: 'https://roarceus.github.io',
  base,
  output: 'static',
  // The CSP meta tag on every built page (ADR 0004): Astro adds script-src and style-src with a
  // SHA-256 hash of each inline script and style it emits, so islands load without 'unsafe-inline'.
  // Build only: the dev server injects its own inline code.
  security: { csp: { directives: cspDirectives(siteConfig.contact.endpoint) } },
  trailingSlash: 'always',
  integrations: [
    react(),
    hoistCsp(),
    // Production only (plan D6): previews are noindex and must never be listed. The thank-you page
    // is only reached after sending a message; Astro already leaves out the 404 page.
    ...(isProduction ? [sitemap({ filter: (page) => !page.includes('/contact/thanks/') })] : []),
  ],
  markdown: {
    // Highlighted code with classes instead of style attributes, which the CSP blocks (ADR 0004).
    shikiConfig: { theme: codeTheme, transformers: [styleToClass] },
    processor: satteri({
      // Site copy must read as human-written: no curly quotes or typographic dashes added at
      // build time (tests/static/content-style.test.ts checks the source, the e2e the output).
      features: { smartPunctuation: false },
      // Off-site links in Markdown get rel="noopener noreferrer", like the ExternalLink component.
      hastPlugins: [
        {
          name: 'external-links',
          element: {
            filter: ['a'],
            visit(node, ctx) {
              const rel = externalLinkRel(node.properties);
              if (rel) ctx.setProperty(node, 'rel', rel);
            },
          },
        },
      ],
    }),
  },
  build: {
    // GitHub Pages branch deploys run Jekyll, which hides "_"-prefixed folders like Astro's
    // default "_astro". Use a plain name; public/.nojekyll is the second safeguard.
    assets: 'assets',
    // Keep CSS in files so the CSP can stay at style-src 'self'.
    inlineStylesheets: 'never',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Never inline assets as data: URIs (Vite inlines files under 4 KB by default). A small
      // font subset got inlined and the CSP's font-src 'self' blocked it.
      assetsInlineLimit: 0,
      rolldownOptions: {
        output: {
          // React, react-dom and scheduler go in one shared chunk, so every island reuses it and the
          // budget check can tell island code from the runtime (stage-3 plan, Task 6c). Rolldown
          // replaces Rollup's manualChunks with codeSplitting groups.
          codeSplitting: {
            groups: [
              {
                name: 'react-runtime',
                test: /[\\/]node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?(?:react|react-dom|scheduler)[\\/]/,
              },
            ],
          },
        },
      },
    },
  },
});
