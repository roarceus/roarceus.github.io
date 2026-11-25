// @ts-check
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// Production builds at "/", PR previews at "/pr-preview/pr-<N>/" (set by CI). See SPEC §2.
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site: 'https://roarceus.github.io',
  base,
  output: 'static',
  trailingSlash: 'always',
  integrations: [react()],
  markdown: {
    // Site copy must read as human-written: no curly quotes or typographic dashes added at build
    // time (tests/static/content-style.test.ts checks the source, the plain e2e the output).
    smartypants: false,
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
