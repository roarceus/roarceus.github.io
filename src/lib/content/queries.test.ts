import { beforeEach, describe, expect, it, vi } from 'vitest';

// Vitest can resolve astro:content but has no content data store, so the adapter is tested
// against in-memory collections. The pure logic it calls is tested on its own.
const collections: Record<string, { id: string; data: Record<string, unknown>; body?: string }[]> = {};

vi.mock('astro:content', () => ({
  getCollection: vi.fn((name: string) => Promise.resolve(collections[name] ?? [])),
  render: vi.fn((entry: { id: string }) => Promise.resolve({ Content: `rendered:${entry.id}` })),
}));

const {
  getAchievements,
  getCertifications,
  getEducation,
  getExperience,
  getProfile,
  getProject,
  getProjects,
  getProjectsByNode,
  getSkills,
  getUpdates,
  renderEntry,
} = await import('./queries');

const ids = (entries: { id: string }[]) => entries.map((entry) => entry.id);

beforeEach(() => {
  Object.assign(collections, {
    profile: [{ id: 'profile', data: { name: 'Test Person' } }],
    experience: [
      { id: 'old-job', data: { node: 'old', start: '2021-05', end: '2023-10' } },
      { id: 'new-job', data: { node: 'new', start: '2025-06', end: 'present' } },
    ],
    education: [{ id: 'degree', data: { node: 'school', start: '2016-08', end: '2020-10' } }],
    projects: [
      { id: 'side', data: { node: 'old', featured: false, order: 2 } },
      { id: 'main', data: { node: 'new', featured: true, order: 1 }, body: 'About main.' },
      { id: 'unscheduled', data: { featured: false, order: 3 } },
    ],
    skills: [
      { id: 'web', data: { order: 2 } },
      { id: 'cloud', data: { order: 1 } },
    ],
    certifications: [
      { id: 'old-cert', data: { date: '2020-07' } },
      { id: 'cka', data: {} },
    ],
    achievements: [
      { id: 'award-2020', data: { date: '2020-10' } },
      { id: 'award-2025', data: { date: '2025-12' } },
    ],
    updates: [
      { id: 'older', data: { date: new Date('2024-03-17'), draft: false } },
      { id: 'draft', data: { date: new Date('2026-01-01'), draft: true } },
      { id: 'newer', data: { date: new Date('2025-01-22'), draft: false } },
    ],
  });
});

describe('content queries', () => {
  it('returns the single profile', async () => {
    expect((await getProfile()).id).toBe('profile');
  });

  it('returns experience and education newest first', async () => {
    expect(ids(await getExperience())).toEqual(['new-job', 'old-job']);
    expect(ids(await getEducation())).toEqual(['degree']);
  });

  it('returns projects in order, optionally only featured ones', async () => {
    expect(ids(await getProjects())).toEqual(['main', 'side', 'unscheduled']);
    expect(ids(await getProjects({ featured: true }))).toEqual(['main']);
    expect(ids(await getProjects({ featured: false }))).toEqual(['side', 'unscheduled']);
  });

  it('finds a project by slug and projects by node', async () => {
    expect((await getProject('side'))?.id).toBe('side');
    expect(await getProject('missing')).toBeUndefined();
    expect(ids(await getProjectsByNode('new'))).toEqual(['main']);
  });

  it('sorts skills by order, certifications and achievements newest first', async () => {
    expect(ids(await getSkills())).toEqual(['cloud', 'web']);
    expect(ids(await getCertifications())).toEqual(['cka', 'old-cert']);
    expect(ids(await getAchievements())).toEqual(['award-2025', 'award-2020']);
  });

  it('returns published updates newest first', async () => {
    expect(ids(await getUpdates())).toEqual(['newer', 'older']);
  });

  it('fails loudly when content is inconsistent', async () => {
    collections.projects?.push({ id: 'ghost', data: { node: 'nowhere', featured: false, order: 9 } });
    await expect(getProjects()).rejects.toThrow('projects/ghost: node "nowhere"');
  });

  it('renders an entry body through astro:content', async () => {
    const profile = await getProfile();
    expect(await renderEntry(profile)).toEqual({ Content: 'rendered:profile' });
  });
});
