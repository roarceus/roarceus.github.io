import { slug } from './schemas/common';

import type { Entry } from './sort';

/** Every collection, reduced to the fields the cross-entry checks need. */
export interface ContentSnapshot {
  profile: Entry<unknown>[];
  experience: Entry<{ node: string }>[];
  education: Entry<{ node?: string | undefined }>[];
  projects: Entry<{ node?: string | undefined; featured: boolean }>[];
  skills: Entry<unknown>[];
  certifications: Entry<unknown>[];
  achievements: Entry<unknown>[];
  updates: Entry<unknown>[];
}

/**
 * Checks that schemas can't express on a single entry: one profile, slug ids, projects on
 * declared nodes, featured projects with a description. Returns human-readable problems.
 */
export function checkIntegrity(content: ContentSnapshot): string[] {
  const problems: string[] = [];

  if (content.profile.length !== 1) {
    problems.push(`profile: expected exactly 1 entry, found ${String(content.profile.length)}`);
  }

  for (const [collection, entries] of Object.entries(content)) {
    for (const entry of entries as Entry<unknown>[]) {
      if (collection !== 'profile' && !slug.safeParse(entry.id).success) {
        problems.push(`${collection}/${entry.id}: id must be a kebab-case slug`);
      }
    }
  }

  const nodes = new Set(
    [...content.experience, ...content.education].flatMap((entry) => entry.data.node ?? []),
  );
  for (const project of content.projects) {
    const { node, featured } = project.data;
    if (node !== undefined && !nodes.has(node)) {
      problems.push(
        `projects/${project.id}: node "${node}" is not declared by any experience or education entry`,
      );
    }
    if (featured && !project.body?.trim()) {
      problems.push(`projects/${project.id}: featured projects need a description`);
    }
  }

  return problems;
}

/** Throws one error listing every integrity problem, so a broken build shows them all at once. */
export function assertIntegrity(content: ContentSnapshot): void {
  const problems = checkIntegrity(content);
  if (problems.length > 0) {
    throw new Error(`Content integrity check failed:\n${problems.map((p) => `- ${p}`).join('\n')}`);
  }
}
