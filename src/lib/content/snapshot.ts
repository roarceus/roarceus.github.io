import { createHash } from 'node:crypto';

import {
  clusterNodes,
  podPhase,
  preselectedRole,
  unscheduledPods,
  type ClusterNode,
  type Pod,
  type PodPhase,
} from './cluster';
import { sortByDateDesc, sortByOrder, sortByRecency, type Entry } from './sort';

import type {
  achievementSchema,
  certificationSchema,
  educationSchema,
  experienceSchema,
  profileSchema,
  projectSchema,
  skillCategorySchema,
  updateSchema,
} from './schemas/collections';
import type { z } from 'astro/zod';

/**
 * The compact copy of the content the terminal loads in the browser (design doc stage-3 §5.1): only
 * the fields commands need, no Markdown bodies. Built at build time and served as
 * `cluster.<hash>.json`, so new HTML never pairs with stale data. Nothing here depends on the clock,
 * so equal content always gives the same hash; ages are computed in the browser.
 */

export const SNAPSHOT_VERSION = 1;
const UPDATES = 10;

export interface SnapshotInput {
  build: { version: string; commit: string };
  profile: z.output<typeof profileSchema>;
  experience: Entry<z.output<typeof experienceSchema>>[];
  education: Entry<z.output<typeof educationSchema>>[];
  projects: Entry<z.output<typeof projectSchema>>[];
  skills: Entry<z.output<typeof skillCategorySchema>>[];
  certifications: Entry<z.output<typeof certificationSchema>>[];
  achievements: Entry<z.output<typeof achievementSchema>>[];
  updates: Entry<z.output<typeof updateSchema>>[];
}

interface SnapshotRole {
  name: string;
  org: string;
  role: string;
  type: 'work' | 'education' | 'teaching';
  node: string;
  start: string;
  end: string;
  summary: string;
  tech: string[];
  highlights: string[];
}

interface SnapshotProject {
  slug: string;
  name: string;
  summary: string;
  phase: PodPhase;
  node: string | undefined;
  tech: string[];
  start: string | undefined;
  end: string | undefined;
  repo: string | undefined;
  demo: string | undefined;
}

export interface ClusterSnapshot {
  version: typeof SNAPSHOT_VERSION;
  build: { version: string; commit: string };
  profile: {
    name: string;
    title: string;
    location: string;
    tagline: string;
    links: { github: string; linkedin: string; email: string };
    resume: string;
  };
  nodes: ClusterNode[];
  unscheduled: Pod[];
  /** Node of the pre-selected role (SPEC §9). */
  selected: string | undefined;
  /** Roles on the map, newest first. */
  experience: SnapshotRole[];
  /** Projects on the map or unscheduled, by `order`. */
  projects: SnapshotProject[];
  skills: { category: string; items: { name: string; level?: number | undefined }[] }[];
  certifications: {
    name: string;
    issuer: string;
    status: 'issued' | 'in-progress';
    date: string | undefined;
  }[];
  achievements: {
    title: string;
    org: string | undefined;
    date: string;
    summary: string;
    link: string | undefined;
  }[];
  /** The newest published updates. */
  updates: { slug: string; title: string; date: string; summary: string }[];
}

export function buildSnapshot(input: SnapshotInput): ClusterSnapshot {
  const nodes = clusterNodes(input.experience, input.education, input.projects);
  const onMap = new Set(nodes.map((node) => node.name));
  const { name, title, location, tagline, links, resume } = input.profile;

  return {
    version: SNAPSHOT_VERSION,
    build: input.build,
    profile: { name, title, location, tagline, links, resume },
    nodes,
    unscheduled: unscheduledPods(input.projects),
    selected: preselectedRole(input.experience, nodes)?.data.node,
    experience: sortByRecency(input.experience)
      .filter(({ data }) => onMap.has(data.node))
      .map(({ id, data }) => ({
        name: id,
        org: data.org,
        role: data.role,
        type: data.type,
        node: data.node,
        start: data.start,
        end: data.end,
        summary: data.summary,
        tech: data.tech,
        highlights: data.highlights.map((highlight) => highlight.text),
      })),
    projects: sortByOrder(input.projects)
      .filter(({ data }) => data.node === undefined || onMap.has(data.node))
      .map(({ id, data }) => ({
        slug: id,
        name: data.name,
        summary: data.tagline,
        phase: podPhase(data.status),
        node: data.node,
        tech: data.tech,
        start: data.start,
        end: data.end,
        repo: data.links.repo,
        demo: data.links.demo,
      })),
    skills: sortByOrder(input.skills).map(({ data }) => ({ category: data.category, items: data.items })),
    certifications: sortByDateDesc(input.certifications).map(({ data }) => ({
      name: data.name,
      issuer: data.issuer,
      status: data.status,
      date: data.date,
    })),
    achievements: sortByDateDesc(input.achievements).map(({ data }) => ({
      title: data.title,
      org: data.org,
      date: data.date,
      summary: data.description,
      link: data.link,
    })),
    updates: sortByDateDesc(input.updates.filter(({ data }) => !data.draft))
      .slice(0, UPDATES)
      .map(({ id, data }) => ({
        slug: id,
        title: data.title,
        date: data.date.toISOString().slice(0, 10),
        summary: data.summary,
      })),
  };
}

/** First 10 hex characters of the SHA-256 of the serialized snapshot: the JSON file's name. */
export function snapshotHash(snapshot: ClusterSnapshot): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex').slice(0, 10);
}
