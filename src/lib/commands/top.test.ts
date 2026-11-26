import { describe, expect, it } from 'vitest';

import { as, exec } from './test-utils';

describe('top skills', () => {
  it('shows each skill with its level and a five-step usage bar', async () => {
    const table = as(await exec('kubectl top skills'), 'table');
    expect(table.caption).toBe('kubectl top skills');
    expect(table.columns.map((column) => column.label)).toEqual(['NAME', 'CATEGORY', 'LEVEL', 'USAGE']);
    expect(table.rows).toEqual([
      { name: 'AWS', category: 'Cloud', level: '4/5', usage: '████░' },
      { name: 'GCP', category: 'Cloud', level: '3/5', usage: '███░░' },
      { name: 'Git', category: 'Tools', level: '-', usage: '-' },
    ]);
  });

  it('says the metrics API is missing for nodes and pods', async () => {
    expect(await exec('kubectl top nodes')).toEqual({
      kind: 'error',
      message: 'error: Metrics API not available',
      suggestion: 'kubectl top skills',
    });
  });

  it('rejects anything else', async () => {
    expect(await exec('kubectl top')).toEqual({
      kind: 'error',
      message: 'error: you must specify a resource: skills',
      suggestion: 'kubectl top skills',
    });
    expect(await exec('kubectl top skils')).toEqual({
      kind: 'error',
      message: 'error: unknown command "skils" for "kubectl top"',
      suggestion: 'kubectl top skills',
    });
  });
});
