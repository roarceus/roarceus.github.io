import { describe, expect, it } from 'vitest';

import { kubectlAge, toKubeName } from './kubectl';

const NOW = new Date('2026-11-25T00:00:00Z');

describe('kubectlAge', () => {
  it('shows days under two years, like kubectl', () => {
    expect(kubectlAge('2025-06', NOW)).toBe('542d');
  });

  it('shows years and leftover days from two to eight years', () => {
    expect(kubectlAge('2021-05', NOW)).toBe('5y209d');
  });

  it('switches to years at exactly two years and drops zero leftover days', () => {
    // 2020-11-01 to 2022-11-01 is 730 days (no leap day in between).
    expect(kubectlAge('2020-11', new Date('2022-10-31T00:00:00Z'))).toBe('729d');
    expect(kubectlAge('2020-11', new Date('2022-11-01T00:00:00Z'))).toBe('2y');
    expect(kubectlAge('2020-11', new Date('2022-11-02T00:00:00Z'))).toBe('2y1d');
  });

  it('shows whole years from eight years on', () => {
    expect(kubectlAge('2016-08', NOW)).toBe('10y');
  });

  it('counts short ages in days', () => {
    expect(kubectlAge('2026-11', new Date('2026-11-03T00:00:00Z'))).toBe('2d');
    expect(kubectlAge('2026-11', new Date('2026-11-01T00:00:00Z'))).toBe('0d');
  });

  it('rejects a start in the future or a malformed month', () => {
    expect(() => kubectlAge('2027-01', NOW)).toThrow(/after/);
    expect(() => kubectlAge('2025-13', NOW)).toThrow(/YYYY-MM/);
  });
});

describe('toKubeName', () => {
  it.each([
    ['DevOps Engineer (Co-op)', 'devops-engineer-co-op'],
    [
      'Teaching Assistant, Network Structures & Cloud Computing (CSYE 6225)',
      'teaching-assistant-network-structures-cloud-computing-csye-6225',
    ],
    ['  Software Engineer  ', 'software-engineer'],
    ['Web Development Intern', 'web-development-intern'],
  ])('turns %j into %j', (input, expected) => {
    expect(toKubeName(input)).toBe(expected);
  });
});
