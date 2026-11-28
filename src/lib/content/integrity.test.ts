import { describe, expect, it } from 'vitest';

import { assertIntegrity, checkIntegrity, type ContentSnapshot } from './integrity';

const valid = (): ContentSnapshot => ({
  profile: [{ id: 'profile', data: {} }],
  experience: [
    { id: 'capgemini', data: { node: 'capgemini', org: 'Capgemini' } },
    { id: 'northeastern-ta', data: { node: 'northeastern', org: 'Northeastern University' } },
  ],
  education: [
    { id: 'northeastern', data: { node: 'northeastern', school: 'Northeastern University' } },
    { id: 'mumbai', data: { node: 'mumbai', school: 'University of Mumbai', cluster: false } },
    { id: 'no-node', data: { school: 'Online' } },
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

  it('reserves the personal node name for side projects', () => {
    const content = valid();
    content.experience.push({ id: 'side-gig', data: { node: 'personal', org: 'Side Co' } });
    expect(checkIntegrity(content)).toEqual([
      'experience/side-gig: node "personal" is reserved for side projects',
    ]);
  });

  it('reports a running project on a cordoned era', () => {
    const content = valid();
    content.projects.push({ id: 'old-live', data: { node: 'mumbai', status: 'running', featured: false } });
    expect(checkIntegrity(content)).toEqual(['projects/old-live: running on cordoned node "mumbai"']);
  });

  it('reports a link to the personal node when no project runs on it', () => {
    const content = valid();
    content.projects = content.projects.filter((project) => project.data.node !== 'personal');
    content.updates = [{ id: 'side-note', data: { node: 'personal' } }];
    expect(checkIntegrity(content)).toEqual(['updates/side-note: node "personal" has no projects']);
  });

  it('reports an achievement whose org matches more than one node', () => {
    const content = valid();
    content.experience.push({ id: 'capgemini-us', data: { node: 'capgemini-us', org: 'Capgemini' } });
    content.achievements.push({ id: 'star', data: { org: 'Capgemini' } });
    expect(checkIntegrity(content)).toEqual([
      'achievements/star: org "Capgemini" matches nodes capgemini, capgemini-us; set node',
    ]);
    content.achievements[content.achievements.length - 1] = {
      id: 'star',
      data: { org: 'Capgemini', node: 'capgemini' },
    };
    expect(checkIntegrity(content)).toEqual([]);
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
