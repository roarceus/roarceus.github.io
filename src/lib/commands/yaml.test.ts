import { describe, expect, it } from 'vitest';

import { toYaml } from './yaml';

describe('toYaml', () => {
  it('writes maps, nested maps, and kubectl-style sequences', () => {
    expect(
      toYaml({
        name: 'asktrace',
        meta: { order: 1, live: true },
        tech: ['Go', 'Kafka'],
        items: [{ name: 'a', tags: ['x'] }, 'plain'],
      }),
    ).toBe(
      [
        'name: asktrace',
        'meta:',
        '  order: 1',
        '  live: true',
        'tech:',
        '- Go',
        '- Kafka',
        'items:',
        '- name: a',
        '  tags:',
        '  - x',
        '- plain',
        '',
      ].join('\n'),
    );
  });

  it('quotes strings with ":" or "#" and anything YAML would read as another type', () => {
    expect(
      toYaml({ a: 'Kafka: fast', b: 'C# code', c: 'true', d: '42', e: '', f: ' padded', g: '- dash' }),
    ).toBe(
      [
        'a: "Kafka: fast"',
        'b: "C# code"',
        'c: "true"',
        'd: "42"',
        'e: ""',
        'f: " padded"',
        'g: "- dash"',
        '',
      ].join('\n'),
    );
  });

  it('escapes quotes and newlines inside quoted strings', () => {
    expect(toYaml({ a: 'say "hi": now\nok' })).toBe('a: "say \\"hi\\": now\\nok"\n');
  });

  it('skips undefined keys and writes empty collections and null inline', () => {
    expect(toYaml({ a: undefined, b: [], c: {}, d: null })).toBe('b: []\nc: {}\nd: null\n');
  });

  it('writes a nested sequence under a dash', () => {
    expect(toYaml({ a: [['x', 'y']] })).toBe('a:\n-\n  - x\n  - y\n');
  });
});
