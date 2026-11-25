import { describe, expect, it } from 'vitest';

import {
  achievementSchema,
  certificationSchema,
  educationSchema,
  experienceSchema,
  profileSchema,
  projectSchema,
  skillCategorySchema,
  updateSchema,
} from './collections';

const profile = {
  name: 'Test Person',
  title: 'Software Engineer',
  location: 'Somewhere, CA',
  tagline: 'Builds things.',
  links: {
    github: 'https://github.com/example',
    linkedin: 'https://www.linkedin.com/in/example/',
    email: 'person@example.com',
  },
  resume: 'resume.pdf',
  openToWork: true,
};

const experience = {
  org: 'Example Corp',
  role: 'Software Engineer',
  type: 'work',
  location: 'Remote',
  start: '2021-05',
  end: '2023-10',
  summary: 'Built APIs.',
  highlights: [{ text: 'Cut latency', metric: '~25%' }, { text: 'Wrote docs' }],
  tech: ['TypeScript'],
  node: 'example-corp',
};

const project = {
  name: 'Example',
  tagline: 'Does a thing',
  status: 'running',
  tech: ['Go'],
  order: 1,
};

const without = (obj: Record<string, unknown>, key: string) =>
  Object.fromEntries(Object.entries(obj).filter(([name]) => name !== key));

describe('profileSchema', () => {
  it('accepts a complete profile', () => {
    expect(profileSchema.safeParse(profile).success).toBe(true);
  });

  it.each(['name', 'title', 'tagline', 'links', 'resume', 'openToWork'])('requires %s', (key) => {
    expect(profileSchema.safeParse(without(profile, key)).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const bad = { ...profile, links: { ...profile.links, email: 'not-an-email' } };
    expect(profileSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a resume path with a leading slash (it must go through url())', () => {
    expect(profileSchema.safeParse({ ...profile, resume: '/resume.pdf' }).success).toBe(false);
  });
});

describe('experienceSchema', () => {
  it('accepts a complete entry', () => {
    expect(experienceSchema.safeParse(experience).success).toBe(true);
  });

  it('accepts an open-ended role', () => {
    expect(experienceSchema.safeParse({ ...experience, end: 'present' }).success).toBe(true);
  });

  it.each(['org', 'role', 'type', 'start', 'end', 'summary', 'node'])('requires %s', (key) => {
    expect(experienceSchema.safeParse(without(experience, key)).success).toBe(false);
  });

  it('rejects an unknown type', () => {
    expect(experienceSchema.safeParse({ ...experience, type: 'freelance' }).success).toBe(false);
  });

  it('rejects an end before the start', () => {
    expect(experienceSchema.safeParse({ ...experience, end: '2020-01' }).success).toBe(false);
  });

  it('rejects an empty tech list', () => {
    expect(experienceSchema.safeParse({ ...experience, tech: [] }).success).toBe(false);
  });

  it('puts a role on the cluster map unless it opts out (SPEC §7)', () => {
    expect(experienceSchema.parse(experience).cluster).toBe(true);
    expect(experienceSchema.parse({ ...experience, cluster: false }).cluster).toBe(false);
    expect(experienceSchema.safeParse({ ...experience, cluster: 'no' }).success).toBe(false);
  });
});

describe('educationSchema', () => {
  const education = {
    school: 'Example University',
    degree: "Master's",
    field: 'Information Systems',
    location: 'Boston, MA',
    start: '2024-01',
    end: '2026-05',
  };

  it('accepts an entry without highlights or node, defaulting highlights to []', () => {
    const parsed = educationSchema.parse(education);
    expect(parsed.highlights).toEqual([]);
    expect(parsed.node).toBeUndefined();
  });

  it('rejects an end before the start', () => {
    expect(educationSchema.safeParse({ ...education, end: '2023-01' }).success).toBe(false);
  });

  it('puts a degree on the cluster map unless it opts out (SPEC §7)', () => {
    expect(educationSchema.parse(education).cluster).toBe(true);
    expect(educationSchema.parse({ ...education, cluster: false }).cluster).toBe(false);
  });
});

describe('projectSchema', () => {
  it('fills defaults for optional fields', () => {
    const parsed = projectSchema.parse(project);
    expect(parsed).toMatchObject({ featured: false, highlights: [], links: {} });
    expect(parsed.node).toBeUndefined();
  });

  it.each(['running', 'completed', 'pending'])('accepts status %s', (status) => {
    expect(projectSchema.safeParse({ ...project, status }).success).toBe(true);
  });

  it('rejects an unknown status', () => {
    expect(projectSchema.safeParse({ ...project, status: 'CrashLoopBackOff' }).success).toBe(false);
  });

  it('rejects non-https links', () => {
    const bad = { ...project, links: { repo: 'http://github.com/x' } };
    expect(projectSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a negative or fractional order', () => {
    expect(projectSchema.safeParse({ ...project, order: -1 }).success).toBe(false);
    expect(projectSchema.safeParse({ ...project, order: 1.5 }).success).toBe(false);
  });

  it('rejects an end before the start when both are given', () => {
    expect(projectSchema.safeParse({ ...project, start: '2025-04', end: '2025-01' }).success).toBe(false);
  });
});

describe('skillCategorySchema', () => {
  const category = { category: 'Cloud', order: 1, items: [{ name: 'AWS', level: 4 }, { name: 'GCP' }] };

  it('accepts items with and without a level', () => {
    expect(skillCategorySchema.safeParse(category).success).toBe(true);
  });

  it('rejects a level outside 1–5', () => {
    const bad = { ...category, items: [{ name: 'AWS', level: 6 }] };
    expect(skillCategorySchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an empty category', () => {
    expect(skillCategorySchema.safeParse({ ...category, items: [] }).success).toBe(false);
  });
});

describe('certificationSchema', () => {
  it('accepts an in-progress cert without a date', () => {
    const cert = { name: 'CKA', issuer: 'The Linux Foundation', status: 'in-progress' };
    expect(certificationSchema.safeParse(cert).success).toBe(true);
  });

  it('requires a date once issued', () => {
    const cert = { name: 'CKA', issuer: 'The Linux Foundation', status: 'issued' };
    expect(certificationSchema.safeParse(cert).success).toBe(false);
    expect(certificationSchema.safeParse({ ...cert, date: '2027-01' }).success).toBe(true);
  });
});

describe('achievementSchema', () => {
  it('accepts an award with an org and no link', () => {
    const award = { title: 'Star Award', org: 'Example Corp', date: '2022-05', description: 'Did well.' };
    expect(achievementSchema.safeParse(award).success).toBe(true);
  });

  it('requires a date', () => {
    expect(achievementSchema.safeParse({ title: 'x', description: 'y' }).success).toBe(false);
  });
});

describe('updateSchema', () => {
  const update = { title: 'Launched a thing', date: new Date('2025-01-22'), summary: 'It is live.' };

  it('defaults tags and draft', () => {
    expect(updateSchema.parse(update)).toMatchObject({ tags: [], draft: false });
  });

  it('accepts an ISO date string', () => {
    const parsed = updateSchema.parse({ ...update, date: '2025-01-22' });
    expect(parsed.date.toISOString()).toBe('2025-01-22T00:00:00.000Z');
  });

  it('rejects an invalid date and non-kebab tags', () => {
    expect(updateSchema.safeParse({ ...update, date: 'yesterday' }).success).toBe(false);
    expect(updateSchema.safeParse({ ...update, tags: ['Big News'] }).success).toBe(false);
  });
});
