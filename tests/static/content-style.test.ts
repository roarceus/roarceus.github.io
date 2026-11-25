import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

// Site copy must read as written by a person (docs/content-guide.md "Writing rules"). These
// characters are common tells of AI-generated text, so content uses plain words and hyphens instead.
const BANNED: Record<string, string> = {
  '—': 'em dash',
  '–': 'en dash',
  '·': 'middle dot',
  '‘': 'curly quote',
  '’': 'curly quote',
  '“': 'curly quote',
  '”': 'curly quote',
  '…': 'ellipsis character',
  '→': 'arrow',
};

const BANNED_PATTERN = new RegExp(`[${Object.keys(BANNED).join('')}]`, 'gu');

const CONTENT_DIR = join(process.cwd(), 'src', 'content');

function contentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return contentFiles(path);
    return /\.(md|ya?ml)$/.test(entry.name) ? [path] : [];
  });
}

/** Returns `file:line: em dash` style findings for every banned character. */
function findBannedCharacters(file: string, text: string): string[] {
  return text
    .split('\n')
    .flatMap((line, index) =>
      [...line.matchAll(BANNED_PATTERN)].map(
        ([char]) => `${file}:${String(index + 1)}: ${BANNED[char] ?? 'banned character'}`,
      ),
    );
}

describe('content style', () => {
  it('flags banned characters with file and line', () => {
    expect(findBannedCharacters('a.md', 'fine\nsays — this')).toEqual(['a.md:2: em dash']);
  });

  it('finds no AI-style punctuation in src/content', () => {
    const findings = contentFiles(CONTENT_DIR).flatMap((file) =>
      findBannedCharacters(relative(process.cwd(), file), readFileSync(file, 'utf8')),
    );
    expect(findings).toEqual([]);
  });
});
