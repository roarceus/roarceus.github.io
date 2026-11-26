import { getCollection, render, type CollectionEntry } from 'astro:content';

import { clusterNodes, experienceRows, preselectedRole, unscheduledPods } from './cluster';
import { assertIntegrity } from './integrity';
import { nodeLabels } from './nodes';
import { buildSnapshot, snapshotHash, type ClusterSnapshot } from './snapshot';
import { sortByDateDesc, sortByOrder, sortByRecency } from './sort';

// The only module that touches astro:content (SPEC §3: components read content only through
// lib/content). Every query loads all collections and runs the integrity check, so any page
// that renders content fails the build on inconsistent content. Astro caches getCollection.

async function load() {
  const [profile, experience, education, projects, skills, certifications, achievements, updates] =
    await Promise.all([
      getCollection('profile'),
      getCollection('experience'),
      getCollection('education'),
      getCollection('projects'),
      getCollection('skills'),
      getCollection('certifications'),
      getCollection('achievements'),
      getCollection('updates'),
    ]);
  const content = {
    profile,
    experience,
    education,
    projects,
    skills,
    certifications,
    achievements,
    updates,
  };
  assertIntegrity(content);
  return content;
}

export async function getProfile(): Promise<CollectionEntry<'profile'>> {
  const { profile } = await load();
  const [entry] = profile;
  // Unreachable: assertIntegrity requires exactly one profile. Narrows the type.
  if (!entry) throw new Error('No profile entry');
  return entry;
}

export async function getExperience(): Promise<CollectionEntry<'experience'>[]> {
  return sortByRecency((await load()).experience);
}

export async function getEducation(): Promise<CollectionEntry<'education'>[]> {
  return sortByRecency((await load()).education);
}

/** Projects by `order`; pass `featured` to filter. */
export async function getProjects(
  options: { featured?: boolean } = {},
): Promise<CollectionEntry<'projects'>[]> {
  const projects = sortByOrder((await load()).projects);
  const { featured } = options;
  return featured === undefined ? projects : projects.filter((p) => p.data.featured === featured);
}

export async function getProject(slug: string): Promise<CollectionEntry<'projects'> | undefined> {
  return (await getProjects()).find((project) => project.id === slug);
}

/** Display name of a node ("Northeastern University"), or undefined for an unknown node. */
export async function getNodeLabel(node: string): Promise<string | undefined> {
  const { experience, education } = await load();
  return nodeLabels(experience, education).get(node);
}

/** Pods scheduled on a node, by `order`. */
export async function getProjectsByNode(node: string): Promise<CollectionEntry<'projects'>[]> {
  return (await getProjects()).filter((project) => project.data.node === node);
}

/**
 * The cluster view (SPEC §7, design doc §4.12): nodes on the map with their pods, unscheduled pods,
 * the pre-selected role, and the `kubectl get experience` rows aged against `now`.
 *
 * @public Rendered by the dashboard shell (Stage 2, Task 7); the logic is unit-tested in cluster.ts.
 */
export async function getCluster(now: Date = new Date()) {
  const { experience, education, projects } = await load();
  const nodes = clusterNodes(experience, education, projects);
  return {
    nodes,
    unscheduled: unscheduledPods(projects),
    selected: preselectedRole(experience, nodes),
    rows: experienceRows(experience, nodes, now),
  };
}

/**
 * The terminal's content snapshot and its hash (design doc stage-3 §5.1). `/` and the
 * `cluster.<hash>.json` endpoint both call this, so the preloaded URL always matches the file.
 */
export async function getSnapshot(build: {
  version: string;
  commit: string;
}): Promise<{ snapshot: ClusterSnapshot; hash: string }> {
  const content = await load();
  const [profile] = content.profile;
  // Unreachable: assertIntegrity requires exactly one profile. Narrows the type.
  if (!profile) throw new Error('No profile entry');
  const snapshot = buildSnapshot({ ...content, profile: profile.data, build });
  return { snapshot, hash: snapshotHash(snapshot) };
}

export async function getSkills(): Promise<CollectionEntry<'skills'>[]> {
  return sortByOrder((await load()).skills);
}

/** In-progress (undated) first, then newest issued. */
export async function getCertifications(): Promise<CollectionEntry<'certifications'>[]> {
  return sortByDateDesc((await load()).certifications);
}

export async function getAchievements(): Promise<CollectionEntry<'achievements'>[]> {
  return sortByDateDesc((await load()).achievements);
}

/** Published updates (no drafts), newest first. */
export async function getUpdates(): Promise<CollectionEntry<'updates'>[]> {
  return sortByDateDesc((await load()).updates.filter((update) => !update.data.draft));
}

/** Renders a Markdown entry's body (profile about, project description, update post). */
export async function renderEntry(
  entry: CollectionEntry<'profile' | 'projects' | 'updates'>,
): ReturnType<typeof render> {
  return render(entry);
}
