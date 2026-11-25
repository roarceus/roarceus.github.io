import { z } from 'astro/zod';

import { endDate, httpsUrl, linkUrl, nodeName, slug, yearMonth } from './common';

// Entry ids (slugs) come from file names (glob loader) or each item's `id` (file loader),
// so they are not part of these schemas. The integrity check validates them.

const text = z.string().trim().min(1);

/** `end` must not be before `start`. `YYYY-MM` strings compare correctly as text. */
const rangeIsOrdered = (value: { start?: string | undefined; end?: string | undefined }) =>
  !value.start || !value.end || value.end === 'present' || value.start <= value.end;
const rangeError = { error: 'end must not be before start', path: ['end'] };

export const profileSchema = z.object({
  name: text,
  title: text,
  location: text,
  tagline: text,
  links: z.object({ github: httpsUrl, linkedin: httpsUrl, email: z.email() }),
  /** Path under `public/`, without a leading slash; rendered through `url()`. */
  resume: z.string().regex(/^[^/].*\.pdf$/, 'relative path to a .pdf in public/'),
  openToWork: z.boolean(),
});

export const experienceSchema = z
  .object({
    org: text,
    role: text,
    type: z.enum(['work', 'education', 'teaching']),
    location: text,
    start: yearMonth,
    end: endDate,
    summary: text,
    highlights: z.array(z.object({ text, metric: text.optional() })).default([]),
    tech: z.array(text).min(1),
    node: nodeName,
    /** false keeps an older era off the cluster map; it stays in the plain view (SPEC §7). */
    cluster: z.boolean().default(true),
  })
  .refine(rangeIsOrdered, rangeError);

export const educationSchema = z
  .object({
    school: text,
    degree: text,
    field: text,
    location: text,
    start: yearMonth,
    end: endDate,
    highlights: z.array(text).default([]),
    node: nodeName.optional(),
    /** false keeps an older era off the cluster map; it stays in the plain view (SPEC §7). */
    cluster: z.boolean().default(true),
  })
  .refine(rangeIsOrdered, rangeError);

export const projectSchema = z
  .object({
    name: text,
    tagline: text,
    status: z.enum(['running', 'completed', 'pending']),
    /** Experience/education node the project "runs on"; absent means unscheduled. */
    node: nodeName.optional(),
    tech: z.array(text).min(1),
    links: z.object({ repo: httpsUrl.optional(), demo: httpsUrl.optional() }).default({}),
    highlights: z.array(text).default([]),
    featured: z.boolean().default(false),
    order: z.int().min(0),
    start: yearMonth.optional(),
    end: endDate.optional(),
  })
  .refine(rangeIsOrdered, rangeError);

export const skillCategorySchema = z.object({
  category: text,
  order: z.int().min(0),
  items: z.array(z.object({ name: text, level: z.int().min(1).max(5).optional() })).min(1),
});

export const certificationSchema = z
  .object({
    name: text,
    issuer: text,
    status: z.enum(['issued', 'in-progress']),
    date: yearMonth.optional(),
    credentialUrl: httpsUrl.optional(),
  })
  .refine((cert) => cert.status !== 'issued' || cert.date !== undefined, {
    error: 'issued certifications need a date',
    path: ['date'],
  });

export const achievementSchema = z.object({
  title: text,
  org: text.optional(),
  date: yearMonth,
  description: text,
  link: linkUrl.optional(),
});

export const updateSchema = z.object({
  title: text,
  /** YAML parses an unquoted `2025-01-22` to a Date; a quoted ISO string is accepted too. */
  date: z.union([z.date(), z.iso.date().transform((value) => new Date(value))]),
  tags: z.array(slug).default([]),
  summary: text,
  draft: z.boolean().default(false),
});
