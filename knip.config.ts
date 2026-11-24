import type { KnipConfig } from 'knip';

// Fails CI on unused files, exports, and dependencies (SPEC §3 "Enforced in CI").
const config: KnipConfig = {
  // .css is listed so knip follows @import of Tailwind and the Fontsource packages.
  project: ['src/**/*.{ts,tsx,astro,css}', 'tests/**/*.ts'],
};

export default config;
