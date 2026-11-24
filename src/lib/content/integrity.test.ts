import { describe, expect, it } from 'vitest';

import { assertIntegrity, checkIntegrity, type ContentSnapshot } from './integrity';

const valid = (): ContentSnapshot => ({
  profile: [{ id: 'profile', data: {} }],
  experience: [
    { id: 'capgemini', data: { node: 'capgemini' } },
    { id: 'northeastern-ta', data: { node: 'northeastern' } },
  ],
  education: [
    { id: 'northeastern', data: { node: 'northeastern' } },
    { id: 'mumbai', data: { node: 'mumbai' } },
    { id: 'no-node', data: {} },
  ],
  projects: [
    { id: 'asktrace', data: { node: 'northeastern', featured: true }, body: 'Details.' },
    { id: 'travel-website', data: { node: 'mumbai', featured: false } },
    { id: 'this-site', data: { featured: false } },
  ],
  skills: [{ id: 'cloud', data: {} }],
  certifications: [{ id: 'cka', data: {} }],
  achievements: [{ id: 'star-award', data: {} }],
  updates: [{ id: 'launched-site', data: {} }],
});

describe('checkIntegrity', () => {
  it('returns no problems for consistent content', () => {
    expect(checkIntegrity(valid())).toEqual([]);
  });

  it('requires exactly one profile', () => {
    expect(checkIntegrity({ ...valid(), profile: [] })).toEqual([
      'profile: expected exactly 1 entry, found 0',
    ]);
  });

  it('reports a project scheduled on an undeclared node', () => {
    const content = valid();
    content.projects.push({ id: 'ghost', data: { node: 'nowhere', featured: false } });
    expect(checkIntegrity(content)).toEqual([
      'projects/ghost: node "nowhere" is not declared by any experience or education entry',
    ]);
  });

  it('reports a featured project without a description body', () => {
    const content = valid();
    content.projects.push({ id: 'empty', data: { featured: true }, body: '  \n' });
    expect(checkIntegrity(content)).toEqual(['projects/empty: featured projects need a description']);
  });

  it('reports ids that are not kebab-case slugs', () => {
    const content = valid();
    content.updates.push({ id: 'Launched_Site', data: {} });
    expect(checkIntegrity(content)).toEqual(['updates/Launched_Site: id must be a kebab-case slug']);
  });
});

describe('assertIntegrity', () => {
  it('passes consistent content through', () => {
    expect(() => {
      assertIntegrity(valid());
    }).not.toThrow();
  });

  it('throws one error listing every problem', () => {
    const content = { ...valid(), profile: [] };
    content.projects = [{ id: 'x', data: { node: 'nowhere', featured: false } }];
    expect(() => {
      assertIntegrity(content);
    }).toThrow(
      'Content integrity check failed:\n- profile: expected exactly 1 entry, found 0\n- projects/x: node "nowhere"',
    );
  });
});
