// @ts-check
import { readFileSync } from 'node:fs';

/** Types and scopes shared with the PR title check (.github/workflows/pr-title.yml). */
const convention = JSON.parse(
  readFileSync(new URL('./.github/commit-convention.json', import.meta.url), 'utf8'),
);

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', convention.types],
    'scope-enum': [2, 'always', convention.scopes],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100],
    // subject-case comes from config-conventional: no sentence/start/pascal/upper case, so the
    // subject starts lowercase but may contain acronyms ("add ADR for ...").
  },
};
