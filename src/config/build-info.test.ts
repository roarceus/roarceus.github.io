import { describe, expect, it } from 'vitest';

import { resolveBuildInfo } from './build-info';

const SHA = '0123456789abcdef0123456789abcdef01234567';

describe('resolveBuildInfo', () => {
  it('uses the injected version and commit', () => {
    expect(resolveBuildInfo({ PUBLIC_VERSION: '0.1.0', PUBLIC_COMMIT_SHA: SHA }, '0.0.0')).toEqual({
      version: '0.1.0',
      commit: SHA,
      shortCommit: '0123456',
    });
  });

  it('strips a leading "v" from release tags', () => {
    expect(resolveBuildInfo({ PUBLIC_VERSION: 'v1.2.3' }, '0.0.0').version).toBe('1.2.3');
  });

  it('falls back to the package version and "dev" when nothing is injected', () => {
    expect(resolveBuildInfo({}, '0.0.0')).toEqual({ version: '0.0.0', commit: 'dev', shortCommit: 'dev' });
  });

  it('treats empty and whitespace-only values as missing', () => {
    expect(resolveBuildInfo({ PUBLIC_VERSION: ' ', PUBLIC_COMMIT_SHA: '' }, '0.0.0')).toEqual({
      version: '0.0.0',
      commit: 'dev',
      shortCommit: 'dev',
    });
  });
});
