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
  education: [],
  projects: [
    {
      id: 'deployment-gating-bot',
      body: '# Heading\n\nLong body that must not ship.',
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
  achievements: [{ id: 'award', data: { title: 'Award', date: '2024-05', description: 'Won it.' } }],
  updates: Array.from({ length: 12 }, (_, i) => ({
    id: `update-${String(i)}`,
    body: '## Post body',
    data: {
      title: `Update ${String(i)}`,
      date: new Date(Date.UTC(2026, 0, i + 1)),
      tags: [],
      summary: `Summary ${String(i)}`,
      draft: i === 11,
    },
  })),
});

describe('buildSnapshot', () => {
  const snapshot = buildSnapshot(input());

  it('carries the version, build, and profile basics', () => {
    expect(snapshot.version).toBe(SNAPSHOT_VERSION);
    expect(SNAPSHOT_VERSION).toBe(1);
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

  it('ships no Markdown bodies', () => {
    const json = JSON.stringify(snapshot);
    expect(json).not.toContain('must not ship');
    expect(json).not.toContain('Post body');
  });

  it('keeps off-map eras and their projects out', () => {
    expect(snapshot.nodes.map((node) => node.name)).toEqual(['mastercontrol']);
    expect(snapshot.experience.map((role) => role.name)).toEqual(['mastercontrol']);
    expect(snapshot.projects.map((project) => project.slug)).toEqual([
      'deployment-gating-bot',
      'roarceus-github-io',
    ]);
    expect(snapshot.unscheduled.map((pod) => pod.slug)).toEqual(['roarceus-github-io']);
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
      node: undefined,
      tech: ['Astro'],
      start: undefined,
      end: undefined,
      repo: 'https://github.com/roarceus/roarceus.github.io',
      demo: undefined,
    });
  });

  it('keeps the 10 newest published updates with ISO dates', () => {
    expect(snapshot.updates).toHaveLength(10);
    expect(snapshot.updates[0]).toEqual({
      slug: 'update-10',
      title: 'Update 10',
      date: '2026-01-11',
      summary: 'Summary 10',
    });
    expect(snapshot.updates.some((update) => update.slug === 'update-11')).toBe(false);
  });

  it('carries skills, certifications, and achievements', () => {
    expect(snapshot.skills).toEqual([{ category: 'Cloud', items: [{ name: 'AWS', level: 4 }] }]);
    expect(snapshot.certifications).toEqual([
      { name: 'CKA', issuer: 'CNCF', status: 'in-progress', date: undefined },
    ]);
    expect(snapshot.achievements).toEqual([
      { title: 'Award', org: undefined, date: '2024-05', summary: 'Won it.', link: undefined },
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
