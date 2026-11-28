import { PERSONAL_NODE } from './cluster';
import { slug } from './schemas/common';

import type { Entry } from './sort';

/** Every collection, reduced to the fields the cross-entry checks need. */
export interface ContentSnapshot {
  profile: Entry<unknown>[];
  experience: Entry<{ node: string }>[];
  education: Entry<{ node?: string | undefined }>[];
  projects: Entry<{
    node?: string | undefined;
    status: 'running' | 'completed' | 'pending';
    featured: boolean;
  }>[];
  skills: Entry<unknown>[];
  certifications: Entry<unknown>[];
  achievements: Entry<{ node?: string | undefined }>[];
  updates: Entry<{ node?: string | undefined; project?: string | undefined }>[];
}

/**
 * Checks that schemas can't express on a single entry: one profile, slug ids, projects on
 * declared nodes (or `personal`), no running or completed project without a node, featured projects
 * with a description, and updates and achievements that point at real nodes and projects. Returns
 * human-readable problems.
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
    const { node, status, featured } = project.data;
    if (node !== undefined && node !== PERSONAL_NODE && !nodes.has(node)) {
      problems.push(
        `projects/${project.id}: node "${node}" is not declared by any experience or education entry`,
      );
    }
    if (node === undefined && status !== 'pending') {
      problems.push(`projects/${project.id}: ${status} but has no node`);
    }
    if (featured && !project.body?.trim()) {
      problems.push(`projects/${project.id}: featured projects need a description`);
    }
  }

  const clusterNodes = new Set([...nodes, PERSONAL_NODE]);
  const projects = new Set(content.projects.map((project) => project.id));
  const pointsAt = (
    collection: string,
    entry: Entry<{ node?: string | undefined; project?: string | undefined }>,
  ) => {
    const { node, project } = entry.data;
    if (node !== undefined && !clusterNodes.has(node)) {
      problems.push(`${collection}/${entry.id}: node "${node}" is not a cluster node`);
    }
    if (project !== undefined && !projects.has(project)) {
      problems.push(`${collection}/${entry.id}: project "${project}" does not exist`);
    }
  };
  for (const update of content.updates) pointsAt('updates', update);
  for (const achievement of content.achievements) pointsAt('achievements', achievement);

  return problems;
}

/** Throws one error listing every integrity problem, so a broken build shows them all at once. */
export function assertIntegrity(content: ContentSnapshot): void {
  const problems = checkIntegrity(content);
  if (problems.length > 0) {
    throw new Error(`Content integrity check failed:\n${problems.map((p) => `- ${p}`).join('\n')}`);
  }
}
