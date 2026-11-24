// @ts-check
import js from '@eslint/js';
import eslintReact from '@eslint-react/eslint-plugin';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import astro from 'eslint-plugin-astro';
import { flatConfigs as importX } from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// eslint-plugin-react and eslint-plugin-jsx-a11y don't support ESLint 10 yet, so this config uses
// @eslint-react and jsx-a11y-x instead (ADR-0001). @eslint-react also implements the rules of hooks,
// so eslint-plugin-react-hooks isn't needed.

const TS = ['**/*.{ts,tsx}'];
const TSX = ['**/*.tsx'];

export default defineConfig(
  {
    ignores: ['dist/', '.astro/', 'coverage/', 'playwright-report/', 'test-results/', 'node_modules/'],
  },

  js.configs.recommended,
  importX.recommended,
  importX.typescript,
  {
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ alwaysTryTypes: true })],
    },
    rules: {
      'import-x/no-cycle': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // Astro virtual modules and JSON imports are resolved by Vite, not the import resolver.
      'import-x/no-unresolved': ['error', { ignore: ['^astro:'] }],
    },
  },

  // TypeScript with type information.
  {
    files: TS,
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // React islands.
  {
    files: TSX,
    extends: [eslintReact.configs['recommended-type-checked'], jsxA11y.configs.recommended],
  },

  // Astro components (with JSX a11y rules).
  ...astro.configs['flat/recommended'],
  ...astro.configs['flat/jsx-a11y-recommended'],

  // Dependency direction (SPEC §3): lib/ stays framework-free so it's unit-testable without a DOM.
  {
    files: ['src/lib/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'src/lib must not import React.',
            },
            {
              group: ['@/components/*', '@/layouts/*', '@/pages/*'],
              message: 'src/lib must not import UI code.',
            },
            { group: ['astro:*'], message: 'src/lib must not depend on Astro modules.' },
          ],
        },
      ],
    },
  },

  // Node-side config files and tests.
  {
    files: ['*.{js,mjs,cjs,ts}', 'tests/**'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    // Plugin packages export `configs` both as a default member and a named export; that's fine here.
    rules: { 'import-x/no-named-as-default-member': 'off' },
  },

  prettier,
);
