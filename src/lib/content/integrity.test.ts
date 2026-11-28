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
    { id: 'asktrace', data: { node: 'northeastern', status: 'completed', featured: true }, body: 'Details.' },
    { id: 'travel-website', data: { node: 'mumbai', status: 'completed', featured: false } },
    { id: 'this-site', data: { node: 'personal', status: 'running', featured: false } },
    { id: 'next-idea', data: { status: 'pending', featured: false } },
  ],
  skills: [{ id: 'cloud', data: {} }],
  certifications: [{ id: 'cka', data: {} }],
  achievements: [{ id: 'star-award', data: {} }],
  updates: [
    { id: 'launched-site', data: { project: 'this-site' } },
    { id: 'moved', data: { node: 'northeastern' } },
  ],
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
    content.projects.push({ id: 'ghost', data: { node: 'nowhere', status: 'completed', featured: false } });
    expect(checkIntegrity(content)).toEqual([
      'projects/ghost: node "nowhere" is not declared by any experience or education entry',
    ]);
  });

  it('reports a running or completed project with no node', () => {
    const content = valid();
    content.projects.push({ id: 'floating', data: { status: 'completed', featured: false } });
    expect(checkIntegrity(content)).toEqual(['projects/floating: completed but has no node']);
  });

  it('accepts the built-in personal node and pending projects with no node', () => {
    expect(checkIntegrity(valid())).toEqual([]);
  });

  it('reports updates and achievements that point at unknown nodes or projects', () => {
    const content = valid();
    content.updates.push({ id: 'bad-link', data: { node: 'nowhere', project: 'missing' } });
    content.achievements.push({ id: 'bad-award', data: { node: 'nowhere' } });
    expect(checkIntegrity(content)).toEqual([
      'updates/bad-link: node "nowhere" is not a cluster node',
      'updates/bad-link: project "missing" does not exist',
      'achievements/bad-award: node "nowhere" is not a cluster node',
    ]);
  });

  it('reports a featured project without a description body', () => {
    const content = valid();
    content.projects.push({
      id: 'empty',
      data: { node: 'personal', status: 'running', featured: true },
      body: '  \n',
    });
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
    content.projects = [{ id: 'x', data: { node: 'nowhere', status: 'completed', featured: false } }];
    expect(() => {
      assertIntegrity(content);
    }).toThrow(
      'Content integrity check failed:\n- profile: expected exactly 1 entry, found 0\n- projects/x: node "nowhere"',
    );
  });
});
