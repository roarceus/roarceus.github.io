import { describe, expect, it } from 'vitest';

import { ctx } from './fixtures';
import { completions } from './run';
import { exec } from './test-utils';

describe('apply', () => {
  it('opens the contact manifest in the panel, without cluster data', async () => {
    expect(await exec('kubectl apply -f contact.yaml', { snapshot: undefined })).toEqual({
      kind: 'detail',
      target: { kind: 'contact', name: 'sohan' },
      lines: [
        {
          text: 'contact.yaml is open in the details panel. Fill in spec, then press Apply.',
          tone: 'muted',
        },
      ],
    });
  });

  it('takes --filename and any case of the file name', async () => {
    expect(await exec('k apply --filename Contact.YAML')).toMatchObject({ kind: 'detail' });
  });

  it('says any other path does not exist, with a suggestion', async () => {
    expect(await exec('kubectl apply -f deploy.yaml')).toEqual({
      kind: 'error',
      message: 'error: the path "deploy.yaml" does not exist',
      suggestion: 'kubectl apply -f contact.yaml',
    });
  });

  it('needs a file, like kubectl', async () => {
    expect(await exec('kubectl apply')).toEqual({
      kind: 'error',
      message: 'error: must specify one of -f and -k',
      suggestion: 'kubectl apply -f contact.yaml',
    });
    expect(await exec('kubectl apply -f')).toMatchObject({
      kind: 'error',
      message: "error: flag needs an argument: 'f' in -f",
    });
  });

  it('completes the file after -f only', () => {
    expect(completions('kubectl apply -f c', ctx())).toEqual(['kubectl apply -f contact.yaml']);
    expect(completions('kubectl apply --filename ', ctx())).toEqual([
      'kubectl apply --filename contact.yaml',
    ]);
    expect(completions('kubectl logs -f ', ctx())).not.toContain('kubectl logs -f contact.yaml');
  });
});
