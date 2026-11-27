import type { Pod, PodPhase } from '@/lib/content/cluster';
import type { ClusterSnapshot } from '@/lib/content/snapshot';
import { formatRange } from '@/lib/utils/dates';

import type { Selection } from './types';

/**
 * What the detail panel shows for a selection (design doc stage-3 §5.5), built from the snapshot. The
 * server builds the first view from the same function, so the hydrated panel matches its HTML.
 */

interface PanelRole {
  title: string;
  org: string;
  range: string;
  summary: string;
  highlights: string[];
  tech: string[];
}

export type PanelView =
  | { kind: 'node'; name: string; run: string; label: string; roles: PanelRole[]; pods: Pod[] }
  | {
      kind: 'pod';
      name: string;
      run: string;
      title: string;
      summary: string;
      phase: PodPhase;
      node: string | undefined;
      range: string | undefined;
      tech: string[];
      /** Outside links only: the dashboard never navigates to another page of the site (ADR 0005). */
      links: { label: string; href: string }[];
    };

export function panelView(snapshot: ClusterSnapshot, selection: Selection): PanelView | undefined {
  const run = `kubectl describe ${selection.kind} ${selection.name}`;
  if (selection.kind === 'node') {
    const node = snapshot.nodes.find((n) => n.name === selection.name);
    if (!node) return undefined;
    const roles = snapshot.experience
      .filter((role) => role.node === node.name)
      .map((role) => ({
        title: role.role,
        org: role.org,
        range: formatRange(role.start, role.end),
        summary: role.summary,
        highlights: role.highlights,
        tech: role.tech,
      }));
    return { kind: 'node', name: node.name, run, label: node.label, roles, pods: node.pods };
  }
  const project = snapshot.projects.find((p) => p.slug === selection.name);
  if (!project) return undefined;
  const links = [
    project.repo === undefined ? undefined : { label: 'Source on GitHub', href: project.repo },
    project.demo === undefined ? undefined : { label: 'Demo', href: project.demo },
  ].filter((link) => link !== undefined);
  return {
    kind: 'pod',
    name: project.slug,
    run,
    title: project.name,
    summary: project.summary,
    phase: project.phase,
    node: project.node,
    range: project.start === undefined ? undefined : formatRange(project.start, project.end),
    tech: project.tech,
    links,
  };
}
