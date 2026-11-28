import { kubeRole, kubectlAgeClamped } from '@/lib/utils/kubectl';

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
  role: ClusterExperience['type'] | 'personal';
  /** An older era (`cluster: false`): shown faded, `SchedulingDisabled` (ADR 0005 §5). */
  cordoned: boolean;
  pods: Pod[];
}

/** The built-in node for side projects (design doc stage-4 §7): a pod without a node can't run. */
export const PERSONAL_NODE = 'personal';
const PERSONAL_LABEL = 'Personal projects';

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
 * Every node: live ones newest first, then the built-in `personal` node (when a project runs on it),
 * then cordoned eras. A node is cordoned if any entry that declares it sets `cluster: false`; its order
 * comes from its newest entry. Its role is `education` when a degree declares it (a TA role there still
 * sits on it), otherwise the newest entry's type. Pods are the node's projects by `order`.
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
  const schools = new Set(
    declared.filter(({ data }) => data.role === 'education').map(({ data }) => data.node),
  );
  const labels = nodeLabels(experience, education);
  const ordered = sortByOrder(projects);

  const podsOn = (node: string) => ordered.filter((project) => project.data.node === node).map(toPod);

  const live: ClusterNode[] = [];
  const cordoned: ClusterNode[] = [];
  const seen = new Set<string>();
  for (const { data } of sortByRecency(declared)) {
    if (seen.has(data.node)) continue;
    seen.add(data.node);
    const off = offMap.has(data.node);
    (off ? cordoned : live).push({
      name: data.node,
      label: labels.get(data.node) ?? data.node,
      role: schools.has(data.node) ? 'education' : data.role,
      cordoned: off,
      pods: podsOn(data.node),
    });
  }
  const personal = podsOn(PERSONAL_NODE);
  if (personal.length > 0) {
    live.push({
      name: PERSONAL_NODE,
      label: PERSONAL_LABEL,
      role: 'personal',
      cordoned: false,
      pods: personal,
    });
  }
  return [...live, ...cordoned];
}

/** Pending projects with no node, by `order`: they wait by the scheduler (`Unschedulable`). */
export function unscheduledPods(projects: readonly Entry<ClusterProject>[]): Pod[] {
  return sortByOrder(projects)
    .filter((project) => project.data.node === undefined && project.data.status === 'pending')
    .map(toPod);
}

/** Names of the nodes that take part in the cluster now: not cordoned. */
const liveNodes = (nodes: readonly ClusterNode[]) =>
  new Set(nodes.filter((node) => !node.cordoned).map((node) => node.name));

/** The role the detail panel opens on (SPEC §9): the newest work role on a node on the map. */
export function preselectedRole<E extends Entry<ClusterExperience>>(
  experience: readonly E[],
  nodes: readonly ClusterNode[],
): E | undefined {
  const onMap = liveNodes(nodes);
  return sortByRecency(experience).find(({ data }) => data.type === 'work' && onMap.has(data.node));
}

/** Rows of `kubectl get experience`: roles on the map, newest first. */
export function experienceRows(
  experience: readonly Entry<ClusterExperience>[],
  nodes: readonly ClusterNode[],
  now: Date,
): ExperienceRow[] {
  const onMap = liveNodes(nodes);
  return sortByRecency(experience)
    .filter(({ data }) => onMap.has(data.node))
    .map(({ id, data }) => ({
      name: id,
      role: kubeRole(data.role),
      node: data.node,
      status: data.end === 'present' ? 'Active' : 'Completed',
      age: kubectlAgeClamped(data.start, now),
    }));
}
