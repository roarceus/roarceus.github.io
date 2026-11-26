import { kubectlAge, toKubeName } from '@/lib/utils/kubectl';

import { nodeLabels } from './nodes';
import { sortByOrder, sortByRecency, type Entry } from './sort';

/**
 * The cluster view of the content (SPEC §7, design doc §4.12): which nodes are on the map, which
 * pods run on them, the role pre-selected in the detail panel, and the rows of
 * `kubectl get experience`. Pure functions over plain entries, so the static placeholders (Stage 2),
 * the terminal (Stage 3), and the map (Stage 4) all agree.
 */

export interface ClusterExperience {
  org: string;
  role: string;
  type: 'work' | 'education' | 'teaching';
  start: string;
  end: string;
  node: string;
  /** Missing means on the map; only `false` takes the node off (SPEC §7). */
  cluster?: boolean | undefined;
}

export interface ClusterEducation {
  school: string;
  start: string;
  end: string;
  node?: string | undefined;
  /** Missing means on the map; only `false` takes the node off (SPEC §7). */
  cluster?: boolean | undefined;
}

export interface ClusterProject {
  name: string;
  status: 'running' | 'completed' | 'pending';
  node?: string | undefined;
  order: number;
}

export type PodPhase = 'Running' | 'Pending' | 'Completed';

export interface Pod {
  slug: string;
  name: string;
  phase: PodPhase;
}

export interface ClusterNode {
  name: string;
  label: string;
  role: ClusterExperience['type'];
  pods: Pod[];
}

export interface ExperienceRow {
  name: string;
  role: string;
  node: string;
  status: 'Active' | 'Completed';
  age: string;
}

const PHASES: Record<ClusterProject['status'], PodPhase> = {
  running: 'Running',
  pending: 'Pending',
  completed: 'Completed',
};

/** Project status as a Kubernetes pod phase. */
export function podPhase(status: ClusterProject['status']): PodPhase {
  return PHASES[status];
}

const toPod = ({ id, data }: Entry<ClusterProject>): Pod => ({
  slug: id,
  name: data.name,
  phase: podPhase(data.status),
});

/**
 * Nodes on the map, newest first. A node is on the map only if every entry that declares it keeps
 * `cluster: true`; its role and order come from its newest entry. Pods are the node's projects by
 * `order`; projects of off-map nodes are left out.
 */
export function clusterNodes(
  experience: readonly Entry<ClusterExperience>[],
  education: readonly Entry<ClusterEducation>[],
  projects: readonly Entry<ClusterProject>[],
): ClusterNode[] {
  const declared = [
    ...experience.map(({ id, data }) => ({ id, data: { ...data, role: data.type } })),
    ...education.flatMap(({ id, data }) =>
      data.node === undefined ? [] : [{ id, data: { ...data, node: data.node, role: 'education' as const } }],
    ),
  ];
  // Only an explicit `cluster: false` takes a node off the map (a missing flag means on).
  const offMap = new Set(declared.filter(({ data }) => data.cluster === false).map(({ data }) => data.node));
  const labels = nodeLabels(experience, education);
  const ordered = sortByOrder(projects);

  const nodes: ClusterNode[] = [];
  const seen = new Set<string>();
  for (const { data } of sortByRecency(declared)) {
    if (offMap.has(data.node) || seen.has(data.node)) continue;
    seen.add(data.node);
    nodes.push({
      name: data.node,
      label: labels.get(data.node) ?? data.node,
      role: data.role,
      pods: ordered.filter((project) => project.data.node === data.node).map(toPod),
    });
  }
  return nodes;
}

/** Projects with no node (e.g. this site), by `order`. They are shown, never faked onto a node. */
export function unscheduledPods(projects: readonly Entry<ClusterProject>[]): Pod[] {
  return sortByOrder(projects)
    .filter((project) => project.data.node === undefined)
    .map(toPod);
}

/** The role the detail panel opens on (SPEC §9): the newest work role on a node on the map. */
export function preselectedRole<E extends Entry<ClusterExperience>>(
  experience: readonly E[],
  nodes: readonly ClusterNode[],
): E | undefined {
  const onMap = new Set(nodes.map((node) => node.name));
  return sortByRecency(experience).find(({ data }) => data.type === 'work' && onMap.has(data.node));
}

/** Rows of `kubectl get experience`: roles on the map, newest first. */
export function experienceRows(
  experience: readonly Entry<ClusterExperience>[],
  nodes: readonly ClusterNode[],
  now: Date,
): ExperienceRow[] {
  const onMap = new Set(nodes.map((node) => node.name));
  return sortByRecency(experience)
    .filter(({ data }) => onMap.has(data.node))
    .map(({ id, data }) => ({
      name: id,
      role: toKubeName(data.role),
      node: data.node,
      status: data.end === 'present' ? 'Active' : 'Completed',
      age: kubectlAge(data.start, now),
    }));
}
