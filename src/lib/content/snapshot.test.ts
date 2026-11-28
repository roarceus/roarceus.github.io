import { describe, expect, it } from 'vitest';

import { buildSnapshot, snapshotHash, SNAPSHOT_VERSION, type SnapshotInput } from './snapshot';

const input = (): SnapshotInput => ({
  build: { version: '0.4.0', commit: 'abc1234' },
  profile: {
    name: 'Sohan Patil',
    title: 'Software Engineer',
    location: 'San Francisco Bay Area',
    tagline: 'I build things.',
    links: { github: 'https://github.com/x', linkedin: 'https://linkedin.com/in/x', email: 'a@b.co' },
    resume: 'resume.pdf',
    openToWork: true,
  },
  experience: [
    {
      id: 'mastercontrol',
      data: {
        org: 'MasterControl',
        role: 'DevOps Engineer (Co-op)',
        type: 'work',
        location: 'Remote',
        start: '2025-06',
        end: '2025-12',
        summary: 'Platform work.',
        highlights: [{ text: 'Shipped a bot.' }],
        tech: ['Kubernetes'],
        node: 'mastercontrol',
        cluster: true,
      },
    },
    {
      id: 'sparks',
      data: {
        org: 'Sparks',
        role: 'Intern',
        type: 'work',
        location: 'Mumbai',
        start: '2020-01',
        end: '2020-03',
        summary: 'Old.',
        highlights: [],
        tech: ['PHP'],
        node: 'sparks-foundation',
        cluster: false,
      },
    },
  ],
  education: [
    {
      id: 'mumbai',
      data: {
        school: 'University of Mumbai',
        degree: 'Bachelor of Engineering',
        field: 'Computer Engineering',
        location: 'Mumbai',
        start: '2016-08',
        end: '2020-10',
        highlights: ['Best Final Year Project'],
        node: 'mumbai',
        cluster: false,
      },
    },
  ],
  projects: [
    {
      id: 'deployment-gating-bot',
      body:
        '# How it works\n\nIt gates **risky** deploys with [Probot](https://probot.github.io).\n\n' +
        '- Checks `main` labels.\n- Posts a _status_.\n',
      data: {
        name: 'deployment-gating-bot',
        tagline: 'Gates deploys.',
        status: 'completed',
        node: 'mastercontrol',
        tech: ['Probot'],
        links: {},
        highlights: [],
        featured: true,
        order: 1,
        start: '2025-07',
        end: '2025-12',
      },
    },
    {
      id: 'roarceus-github-io',
      data: {
        name: 'roarceus.github.io',
        tagline: 'This site.',
        status: 'running',
        node: 'personal',
        tech: ['Astro'],
        links: { repo: 'https://github.com/roarceus/roarceus.github.io' },
        highlights: [],
        featured: false,
        order: 2,
      },
    },
    {
      id: 'old-thing',
      data: {
        name: 'old thing',
        tagline: 'From an off-map era.',
        status: 'completed',
        node: 'sparks-foundation',
        tech: ['PHP'],
        links: {},
        highlights: [],
        featured: false,
        order: 3,
      },
    },
  ],
  skills: [{ id: 'cloud', data: { category: 'Cloud', order: 1, items: [{ name: 'AWS', level: 4 }] } }],
  certifications: [{ id: 'cka', data: { name: 'CKA', issuer: 'CNCF', status: 'in-progress' } }],
  achievements: [
    {
      id: 'labs-award',
      data: { title: 'Award', org: 'MasterControl', date: '2024-05', description: 'Won it.' },
    },
    { id: 'old-prize', data: { title: 'Prize', org: 'Elsewhere', date: '2019-05', description: 'Won.' } },
    {
      id: 'school-prize',
      data: { title: 'Fest', org: 'Elsewhere', node: 'mumbai', date: '2018-05', description: 'Won.' },
    },
  ],
  updates: Array.from({ length: 12 }, (_, i) => ({
    id: `update-${String(i)}`,
    body: '## Post body',
    data: {
      title: `Update ${String(i)}`,
      date: new Date(Date.UTC(2026, 0, i + 1)),
      tags: [],
      ...(i === 10 ? { project: 'roarceus-github-io' } : i === 9 ? { node: 'mastercontrol' } : {}),
      summary: `Summary ${String(i)}`,
      draft: i === 11,
    },
  })),
});

describe('buildSnapshot', () => {
  const snapshot = buildSnapshot(input());

  it('carries the version, build, and profile basics', () => {
    expect(snapshot.version).toBe(SNAPSHOT_VERSION);
    expect(SNAPSHOT_VERSION).toBe(2);
    expect(snapshot.build).toEqual({ version: '0.4.0', commit: 'abc1234' });
    expect(snapshot.profile).toEqual({
      name: 'Sohan Patil',
      title: 'Software Engineer',
      location: 'San Francisco Bay Area',
      tagline: 'I build things.',
      links: { github: 'https://github.com/x', linkedin: 'https://linkedin.com/in/x', email: 'a@b.co' },
      resume: 'resume.pdf',
    });
  });

  it('ships project stories as plain text, and no update bodies', () => {
    expect(snapshot.projects[0]?.story).toEqual([
      'How it works',
      'It gates risky deploys with Probot.',
      '- Checks main labels.',
      '- Posts a status.',
    ]);
    expect(snapshot.projects[1]?.story).toEqual([]);
    const stories = JSON.stringify(snapshot.projects.map((project) => project.story));
    expect(stories).not.toMatch(/[*_`#]|\]\(/);
    expect(JSON.stringify(snapshot)).not.toContain('Post body');
  });

  it('keeps cordoned eras, their roles, schools, and projects, marked cordoned', () => {
    expect(snapshot.nodes.map((node) => [node.name, node.cordoned])).toEqual([
      ['mastercontrol', false],
      ['personal', false],
      ['mumbai', true],
      ['sparks-foundation', true],
    ]);
    expect(snapshot.experience.map((role) => role.name)).toEqual(['mastercontrol', 'sparks']);
    expect(snapshot.education).toEqual([
      {
        name: 'mumbai',
        school: 'University of Mumbai',
        degree: 'Bachelor of Engineering',
        field: 'Computer Engineering',
        node: 'mumbai',
        start: '2016-08',
        end: '2020-10',
        highlights: ['Best Final Year Project'],
      },
    ]);
    expect(snapshot.projects.map((project) => project.slug)).toEqual([
      'deployment-gating-bot',
      'roarceus-github-io',
      'old-thing',
    ]);
    expect(snapshot.unscheduled).toEqual([]);
    expect(snapshot.selected).toBe('mastercontrol');
  });

  it('maps roles and projects to the fields commands need', () => {
    expect(snapshot.experience[0]).toEqual({
      name: 'mastercontrol',
      org: 'MasterControl',
      role: 'DevOps Engineer (Co-op)',
      type: 'work',
      node: 'mastercontrol',
      start: '2025-06',
      end: '2025-12',
      summary: 'Platform work.',
      tech: ['Kubernetes'],
      highlights: ['Shipped a bot.'],
    });
    expect(snapshot.projects[1]).toEqual({
      slug: 'roarceus-github-io',
      name: 'roarceus.github.io',
      summary: 'This site.',
      phase: 'Running',
      node: 'personal',
      tech: ['Astro'],
      start: undefined,
      end: undefined,
      repo: 'https://github.com/roarceus/roarceus.github.io',
      demo: undefined,
      story: [],
    });
  });

  it('keeps the 10 newest published updates with ISO dates', () => {
    expect(snapshot.updates).toHaveLength(10);
    expect(snapshot.updates[0]).toEqual({
      slug: 'update-10',
      title: 'Update 10',
      date: '2026-01-11',
      summary: 'Summary 10',
      node: 'personal',
      project: 'roarceus-github-io',
    });
    expect(snapshot.updates[1]).toMatchObject({ node: 'mastercontrol', project: undefined });
    expect(snapshot.updates[2]).toMatchObject({ node: undefined, project: undefined });
    expect(snapshot.updates.some((update) => update.slug === 'update-11')).toBe(false);
  });

  it('carries skills, certifications, and achievements', () => {
    expect(snapshot.skills).toEqual([{ category: 'Cloud', items: [{ name: 'AWS', level: 4 }] }]);
    expect(snapshot.certifications).toEqual([
      { id: 'cka', name: 'CKA', issuer: 'CNCF', status: 'in-progress', date: undefined },
    ]);
    expect(snapshot.achievements).toEqual([
      {
        id: 'labs-award',
        title: 'Award',
        org: 'MasterControl',
        node: 'mastercontrol',
        date: '2024-05',
        summary: 'Won it.',
        link: undefined,
      },
      expect.objectContaining({ id: 'old-prize', node: undefined }),
      expect.objectContaining({ id: 'school-prize', node: 'mumbai' }),
    ]);
  });
});

describe('snapshotHash', () => {
  it('is 10 hex characters and stable for equal input', () => {
    const hash = snapshotHash(buildSnapshot(input()));
    expect(hash).toMatch(/^[0-9a-f]{10}$/);
    expect(snapshotHash(buildSnapshot(input()))).toBe(hash);
  });

  it('changes when content changes', () => {
    const changed = input();
    const [first] = changed.projects;
    if (first) first.data.name = 'renamed';
    expect(snapshotHash(buildSnapshot(changed))).not.toBe(snapshotHash(buildSnapshot(input())));
  });
});
