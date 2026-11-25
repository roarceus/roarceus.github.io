// @ts-check
import { satteri } from '@astrojs/markdown-satteri';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { externalLinkRel } from './src/lib/markdown/external-links.ts';

// Production builds at "/", PR previews at "/pr-preview/pr-<N>/" (set by CI). See SPEC §2.
const base = process.env.BASE_PATH || '/';
const isProduction = base === '/';

export default defineConfig({
  site: 'https://roarceus.github.io',
  base,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    react(),
    // Production only (plan D6): previews are noindex and must never be listed. The thank-you page
    // is only reached after sending a message; Astro already leaves out the 404 page.
    ...(isProduction ? [sitemap({ filter: (page) => !page.includes('/contact/thanks/') })] : []),
  ],
  markdown: {
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
    },
  },
});
