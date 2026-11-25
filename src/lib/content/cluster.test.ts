import { describe, expect, it } from 'vitest';

import {
  clusterNodes,
  experienceRows,
  podPhase,
  preselectedRole,
  unscheduledPods,
  type ClusterEducation,
  type ClusterExperience,
  type ClusterProject,
} from './cluster';

import type { Entry } from './sort';

// Shaped like the real content (SPEC §7): three nodes on the map, two older eras off it.
const work = (
  id: string,
  data: Partial<ClusterExperience> & Pick<ClusterExperience, 'node' | 'start' | 'end'>,
): Entry<ClusterExperience> => ({
  id,
  data: { org: id, role: 'Software Engineer', type: 'work', cluster: true, ...data },
});

const EXPERIENCE: Entry<ClusterExperience>[] = [
  work('capgemini', { org: 'Capgemini', node: 'capgemini', start: '2021-05', end: '2023-10' }),
  work('mastercontrol', {
    org: 'MasterControl',
    role: 'DevOps Engineer (Co-op)',
    node: 'mastercontrol',
    start: '2025-06',
    end: '2025-12',
  }),
  work('northeastern-ta', {
    org: 'Northeastern University',
    role: 'Teaching Assistant',
    type: 'teaching',
    node: 'northeastern',
    start: '2026-01',
    end: '2026-04',
  }),
  work('sparks-foundation', {
    org: 'The Sparks Foundation',
    node: 'sparks-foundation',
    start: '2020-08',
    end: '2020-09',
    cluster: false,
  }),
];

const EDUCATION: Entry<ClusterEducation>[] = [
  {
    id: 'northeastern',
    data: {
      school: 'Northeastern University',
      node: 'northeastern',
      start: '2024-01',
      end: '2026-04',
      cluster: true,
    },
  },
  {
    id: 'mumbai',
    data: {
      school: 'University of Mumbai',
      node: 'mumbai',
      start: '2016-08',
      end: '2020-10',
      cluster: false,
    },
  },
];

const project = (id: string, data: Partial<ClusterProject>): Entry<ClusterProject> => ({
  id,
  data: { name: id, status: 'completed', order: 1, ...data },
});

const PROJECTS: Entry<ClusterProject>[] = [
  project('asktrace', { name: 'askTRACE', node: 'northeastern', order: 1 }),
  project('roarceus-github-io', { name: 'This portfolio', status: 'running', order: 2 }),
  project('deployment-gating-bot', { name: 'Deployment gating bot', node: 'mastercontrol', order: 4 }),
  project('safehaven', { name: 'SafeHaven', node: 'northeastern', order: 3 }),
  project('credit-management-system', { node: 'sparks-foundation', order: 9 }),
  project('analog-clock', { node: 'mumbai', order: 10 }),
];

describe('podPhase', () => {
  it.each([
    ['running', 'Running'],
    ['pending', 'Pending'],
    ['completed', 'Completed'],
  ] as const)('maps %s to %s', (status, phase) => {
    expect(podPhase(status)).toBe(phase);
  });
});

describe('clusterNodes', () => {
  const nodes = clusterNodes(EXPERIENCE, EDUCATION, PROJECTS);

  it('shows only nodes on the map, newest first', () => {
    expect(nodes.map((node) => node.name)).toEqual(['northeastern', 'mastercontrol', 'capgemini']);
  });

  it('labels each node by its organization and role, listing a shared node once', () => {
    expect(nodes[0]).toMatchObject({
      name: 'northeastern',
      label: 'Northeastern University',
      role: 'teaching',
    });
    expect(nodes[1]).toMatchObject({ label: 'MasterControl', role: 'work' });
  });

  it('schedules projects on their node by order, with their phase', () => {
    expect(nodes[0]?.pods).toEqual([
      { slug: 'asktrace', name: 'askTRACE', phase: 'Completed' },
      { slug: 'safehaven', name: 'SafeHaven', phase: 'Completed' },
    ]);
    expect(nodes[1]?.pods.map((pod) => pod.slug)).toEqual(['deployment-gating-bot']);
  });

  it('keeps a node with no projects, with no pods', () => {
    expect(nodes[2]).toMatchObject({ name: 'capgemini', pods: [] });
  });

  it('leaves projects of off-map nodes off the map', () => {
    const slugs = nodes.flatMap((node) => node.pods.map((pod) => pod.slug));
    expect(slugs).not.toContain('credit-management-system');
    expect(slugs).not.toContain('analog-clock');
  });

  it('keeps a node off the map if any of its entries opts out', () => {
    const mixed = [
      ...EXPERIENCE,
      work('capgemini-2', { node: 'capgemini', start: '2019-01', end: '2019-06', cluster: false }),
    ];
    expect(clusterNodes(mixed, EDUCATION, PROJECTS).map((node) => node.name)).not.toContain('capgemini');
  });

  it('ignores a degree that declares no node', () => {
    const noNode = [
      ...EDUCATION,
      { id: 'online', data: { school: 'Online', start: '2026-01', end: 'present', cluster: true } },
    ];
    expect(clusterNodes(EXPERIENCE, noNode, PROJECTS).map((node) => node.name)).toEqual([
      'northeastern',
      'mastercontrol',
      'capgemini',
    ]);
  });

  it('puts an ongoing role first', () => {
    const ongoing = [
      ...EXPERIENCE,
      work('newco', { org: 'NewCo', node: 'newco', start: '2026-09', end: 'present' }),
    ];
    expect(clusterNodes(ongoing, EDUCATION, PROJECTS)[0]?.name).toBe('newco');
  });
});

describe('unscheduledPods', () => {
  it('lists projects with no node, never faking one onto a node', () => {
    expect(unscheduledPods(PROJECTS)).toEqual([
      { slug: 'roarceus-github-io', name: 'This portfolio', phase: 'Running' },
    ]);
  });
});

describe('preselectedRole', () => {
  const nodes = clusterNodes(EXPERIENCE, EDUCATION, PROJECTS);

  it('picks the newest work role on the map (Sohan picked this over the newest role by date)', () => {
    expect(preselectedRole(EXPERIENCE, nodes)?.id).toBe('mastercontrol');
  });

  it('prefers an ongoing work role', () => {
    const ongoing = [...EXPERIENCE, work('newco', { node: 'newco', start: '2026-09', end: 'present' })];
    expect(preselectedRole(ongoing, clusterNodes(ongoing, EDUCATION, PROJECTS))?.id).toBe('newco');
  });

  it('never picks a role whose node is off the map', () => {
    const late = [
      ...EXPERIENCE,
      work('late', { node: 'late', start: '2026-09', end: 'present', cluster: false }),
    ];
    expect(preselectedRole(late, clusterNodes(late, EDUCATION, PROJECTS))?.id).toBe('mastercontrol');
  });

  it('is undefined when the map has no work role', () => {
    const teachingOnly = EXPERIENCE.filter((entry) => entry.data.type === 'teaching');
    expect(preselectedRole(teachingOnly, clusterNodes(teachingOnly, EDUCATION, PROJECTS))).toBeUndefined();
  });
});

describe('experienceRows', () => {
  const now = new Date('2026-11-25T00:00:00Z');
  const rows = experienceRows(EXPERIENCE, clusterNodes(EXPERIENCE, EDUCATION, PROJECTS), now);

  it('lists roles on the map, newest first, as kubectl get experience', () => {
    expect(rows).toEqual([
      {
        name: 'northeastern-ta',
        role: 'teaching-assistant',
        node: 'northeastern',
        status: 'Completed',
        age: '328d',
      },
      {
        name: 'mastercontrol',
        role: 'devops-engineer-co-op',
        node: 'mastercontrol',
        status: 'Completed',
        age: '542d',
      },
      { name: 'capgemini', role: 'software-engineer', node: 'capgemini', status: 'Completed', age: '5y209d' },
    ]);
  });

  it('marks an ongoing role Active', () => {
    const ongoing = [...EXPERIENCE, work('newco', { node: 'newco', start: '2026-09', end: 'present' })];
    const [first] = experienceRows(ongoing, clusterNodes(ongoing, EDUCATION, PROJECTS), now);
    expect(first).toMatchObject({ name: 'newco', status: 'Active', age: '85d' });
  });
});
