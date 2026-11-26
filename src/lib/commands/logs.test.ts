import { describe, expect, it } from 'vitest';

import { as, exec } from './test-utils';

describe('logs updates', () => {
  it('prints updates newest first, each linking to its post', async () => {
    const result = as(await exec('kubectl logs updates'), 'lines');
    expect(result.stream).toBeUndefined();
    expect(result.lines).toEqual([
      { text: '2026-11-20  Terminal online: Type commands.', href: '/updates/stage-3/' },
      { text: '2026-10-01  Dashboard: A cluster view.', href: '/updates/stage-2/' },
    ]);
  });

  it('streams with -f', async () => {
    expect(as(await exec('kubectl logs -f updates'), 'lines').stream).toBe(true);
    expect(as(await exec('kubectl logs updates --follow'), 'lines').stream).toBe(true);
  });

  it('asks for a target and rejects unknown ones', async () => {
    expect(await exec('kubectl logs')).toEqual({
      kind: 'error',
      message: 'error: expected POD or TYPE/NAME argument',
      suggestion: 'kubectl logs updates',
    });
    expect(await exec('kubectl logs update')).toEqual({
      kind: 'error',
      message: 'Error from server (NotFound): pods "update" not found',
      suggestion: 'kubectl logs updates',
    });
  });
});
