import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection } from 'astro:content';

import {
  achievementSchema,
  certificationSchema,
  educationSchema,
  experienceSchema,
  profileSchema,
  projectSchema,
  skillCategorySchema,
  updateSchema,
} from '@/lib/content/schemas/collections';

// Content "CRDs" (SPEC §6). Schemas live in src/lib/content/schemas so they're unit-tested;
// how to add content: docs/content-guide.md.
const dir = (name: string) => `./src/content/${name}`;

export const collections = {
  profile: defineCollection({
    loader: glob({ pattern: '*.md', base: dir('profile') }),
    schema: profileSchema,
  }),
  experience: defineCollection({
    loader: glob({ pattern: '*.yaml', base: dir('experience') }),
    schema: experienceSchema,
  }),
  education: defineCollection({
    loader: glob({ pattern: '*.yaml', base: dir('education') }),
    schema: educationSchema,
  }),
  projects: defineCollection({
    loader: glob({ pattern: '*.md', base: dir('projects') }),
    schema: projectSchema,
  }),
  updates: defineCollection({
    loader: glob({ pattern: '*.md', base: dir('updates') }),
    schema: updateSchema,
  }),
  skills: defineCollection({ loader: file(dir('skills.yaml')), schema: skillCategorySchema }),
  certifications: defineCollection({
    loader: file(dir('certifications.yaml')),
    schema: certificationSchema,
  }),
  achievements: defineCollection({
    loader: file(dir('achievements.yaml')),
    schema: achievementSchema,
  }),
  /** Test pages built only with the `fixtures` flag (src/pages/fixtures/). Not portfolio content. */
  fixtures: defineCollection({
    loader: glob({ pattern: '*.md', base: './tests/fixtures/content' }),
    schema: z.object({ title: z.string() }),
  }),
};
