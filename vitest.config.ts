/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// getViteConfig gives tests the same aliases and env handling as the Astro build.
export default getViteConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        lines: 80,
        branches: 80,
        'src/lib/**': { lines: 90, branches: 90 },
      },
    },
  },
});
