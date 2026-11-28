import { describe, expect, it } from 'vitest';

import { plainParagraphs } from './plain-text';

describe('plainParagraphs', () => {
  it('splits on blank lines and keeps each list item as its own line', () => {
    expect(plainParagraphs('One line\nwrapped here.\n\n- First.\n- Second.\n\nLast.')).toEqual([
      'One line wrapped here.',
      '- First.',
      '- Second.',
      'Last.',
    ]);
  });

  it('strips headings, emphasis, code, and links down to their text', () => {
    expect(
      plainParagraphs('## How it works\n\nIt **gates** _risky_ `main` deploys with [Probot](https://x.dev).'),
    ).toEqual(['How it works', 'It gates risky main deploys with Probot.']);
  });

  it('turns numbered and starred items into dashes, and drops images and HTML', () => {
    expect(plainParagraphs('1. One.\n* Two.\n\n![diagram](a.png)\n\n<br>Text')).toEqual([
      '- One.',
      '- Two.',
      'Text',
    ]);
  });

  it('drops fenced code blocks, blank lines and comments included', () => {
    expect(plainParagraphs('Before.\n\n```ts\n# not a heading\n\nconst a = 1;\n```\n\nAfter.')).toEqual([
      'Before.',
      'After.',
    ]);
  });

  it('keeps underscores inside words and returns nothing for an empty body', () => {
    expect(plainParagraphs('snake_case_name stays.')).toEqual(['snake_case_name stays.']);
    expect(plainParagraphs(undefined)).toEqual([]);
    expect(plainParagraphs('  \n\n ')).toEqual([]);
  });
});
