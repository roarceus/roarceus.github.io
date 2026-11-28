import { joinBase } from '@/lib/utils/url';

import { error, field, notFound, period, splitTypeName, unknownType } from './format';
import { COMPONENTS, findComponent, KUBE_SYSTEM } from './kube-system';

import type { Command, CommandResult, DataContext, Line } from './types';

/**
 * `kubectl describe node|pod|certificate|achievement <name>` (SPEC §7, design doc stage-4 §5): selects it
 * in the detail panel and echoes its fields. `pod <component> -n kube-system` describes the control plane.
 */

const TYPES = {
  node: ['node', 'nodes', 'no'],
  pod: ['pod', 'pods', 'po'],
  certificate: ['certificate', 'certificates', 'cert', 'certs'],
  achievement: ['achievement', 'achievements'],
} as const;
type Type = keyof typeof TYPES;
const TYPE_NAMES = Object.keys(TYPES) as Type[];
const typeOf = (word: string): Type | undefined =>
  TYPE_NAMES.find((type) => (TYPES[type] as readonly string[]).includes(word.toLowerCase()));
const LIST: Record<Type, string> = {
  node: 'kubectl get nodes',
  pod: 'kubectl get pods -n projects',
  certificate: 'kubectl get certificates',
  achievement: 'kubectl get achievements',
};

function node(name: string, { snapshot }: DataContext): CommandResult {
  const found = snapshot.nodes.find((candidate) => candidate.name === name);
  if (!found) {
    return notFound(
      'nodes',
      name,
      snapshot.nodes.map((candidate) => candidate.name),
      (m) => `kubectl describe node ${m}`,
    );
  }
  const roles = snapshot.experience.filter((role) => role.node === name);
  const schools = snapshot.education.filter((school) => school.node === name);
  const lines: Line[] = [
    field('Name', name),
    field('Roles', found.role),
    field('Labels', `org=${found.label}`),
    ...(found.cordoned ? [field('Unschedulable', 'true')] : []),
  ];
  for (const school of schools) {
    lines.push(
      field('Degree', `${school.degree}, ${school.field}`),
      field('Period', period(school.start, school.end)),
    );
    if (school.highlights.length > 0) {
      lines.push({ text: 'Highlights:' }, ...school.highlights.map((text) => ({ text: `  - ${text}` })));
    }
  }
  for (const role of roles) {
    lines.push(
      field('Role', role.role),
      field('Period', period(role.start, role.end)),
      field('Summary', role.summary),
      field('Tech', role.tech.join(', ')),
    );
    if (role.highlights.length > 0) {
      lines.push({ text: 'Highlights:' }, ...role.highlights.map((text) => ({ text: `  - ${text}` })));
    }
  }
  lines.push(found.pods.length === 0 ? field('Pods', '<none>') : { text: 'Pods:' });
  const width = Math.max(...found.pods.map((pod) => pod.slug.length));
  lines.push(
    ...found.pods.map((pod) => ({
      text: `  ${pod.slug.padEnd(width)}  ${pod.phase}`,
      run: `kubectl describe pod ${pod.slug}`,
    })),
  );
  return { kind: 'detail', target: { kind: 'node', name }, lines };
}

const componentNames = COMPONENTS.flatMap(({ short, name }) => [short, name]);

function component(name: string): CommandResult {
  const found = findComponent(name);
  if (!found) {
    return notFound(
      'pods',
      name,
      componentNames,
      (m) => `kubectl describe pod ${findComponent(m)?.name ?? m} -n ${KUBE_SYSTEM}`,
    );
  }
  const lines: Line[] = [
    field('Name', found.name),
    field('Namespace', KUBE_SYSTEM),
    field('Labels', `component=${found.short}, tier=control-plane`),
    field('Status', 'Running'),
    field('Description', found.description),
  ];
  return { kind: 'detail', target: { kind: 'component', name: found.name }, lines };
}

/** kubectl's scheduling failure for a pod no node takes (a planned project). */
function unschedulable({ snapshot }: DataContext): Line[] {
  const total = snapshot.nodes.length;
  const cordoned = snapshot.nodes.filter((node) => node.cordoned).length;
  const reasons = [
    ...(cordoned > 0 ? [`${String(cordoned)} node(s) were unschedulable`] : []),
    ...(total > cordoned
      ? [`${String(total - cordoned)} node(s) didn't match Pod's node affinity/selector`]
      : []),
  ];
  return [
    { text: 'Conditions:' },
    { text: '  Type           Status  Reason' },
    { text: '  PodScheduled   False   Unschedulable' },
    { text: 'Events:' },
    { text: '  Type     Reason            From               Message' },
    {
      text: `  Warning  FailedScheduling  default-scheduler  0/${String(total)} nodes are available: ${reasons.join(', ')}.`,
    },
  ];
}

function pod(slug: string, ctx: DataContext, namespace: string | undefined): CommandResult {
  if (namespace === KUBE_SYSTEM) return component(slug);
  const { snapshot, base } = ctx;
  const found = snapshot.projects.find((project) => project.slug === slug);
  if (!found && findComponent(slug)) {
    return error(
      `Error from server (NotFound): pods "${slug}" not found`,
      `kubectl describe pod ${slug} -n ${KUBE_SYSTEM}`,
    );
  }
  if (!found) {
    return notFound(
      'pods',
      slug,
      snapshot.projects.map((project) => project.slug),
      (m) => `kubectl describe pod ${m}`,
    );
  }
  const page = joinBase(base, `projects/${slug}/`);
  const lines: Line[] = [
    field('Name', slug),
    field('Namespace', 'projects'),
    found.node === undefined
      ? field('Node', '<none>')
      : field('Node', found.node, { run: `kubectl describe node ${found.node}` }),
    field('Status', found.phase),
    field('Period', period(found.start, found.end)),
    field('Summary', found.summary),
    field('Tech', found.tech.join(', ')),
    ...(found.repo === undefined ? [] : [field('Repo', found.repo, { href: found.repo })]),
    ...(found.demo === undefined ? [] : [field('Demo', found.demo, { href: found.demo })]),
    field('Page', page, { href: page }),
    ...(found.phase === 'Pending' ? unschedulable(ctx) : []),
  ];
  return { kind: 'detail', target: { kind: 'pod', name: slug }, lines };
}

function certificate(id: string, { snapshot }: DataContext): CommandResult {
  const found = snapshot.certifications.find((cert) => cert.id === id);
  if (!found) {
    return notFound(
      'certificates',
      id,
      snapshot.certifications.map((cert) => cert.id),
      (m) => `kubectl describe certificate ${m}`,
    );
  }
  const lines: Line[] = [
    field('Name', id),
    field('Title', found.name),
    field('Issuer', found.issuer),
    field('Status', found.status),
    field('Date', found.date ?? '<none>'),
  ];
  return { kind: 'detail', target: { kind: 'certificate', name: id }, lines };
}

function achievement(id: string, { snapshot }: DataContext): CommandResult {
  const found = snapshot.achievements.find((item) => item.id === id);
  if (!found) {
    return notFound(
      'achievements',
      id,
      snapshot.achievements.map((item) => item.id),
      (m) => `kubectl describe achievement ${m}`,
    );
  }
  const lines: Line[] = [
    field('Name', id),
    field('Title', found.title),
    field('Org', found.org ?? '<none>'),
    found.node === undefined
      ? field('Node', '<none>')
      : field('Node', found.node, { run: `kubectl describe node ${found.node}` }),
    field('Date', found.date),
    field('Summary', found.summary),
    ...(found.link === undefined ? [] : [field('Link', found.link, { href: found.link })]),
  ];
  return { kind: 'detail', target: { kind: 'achievement', name: id }, lines };
}

export const describe: Command = {
  verb: 'describe',
  readOnly: true,
  needsData: true,
  run: (cmd, ctx) => {
    const [type, name] = splitTypeName(cmd.args);
    if (type === undefined) {
      const example = ctx.snapshot.selected ?? ctx.snapshot.nodes[0]?.name;
      return error(
        'error: you must specify the type of resource to describe',
        example === undefined ? undefined : `kubectl describe node ${example}`,
      );
    }
    const kind = typeOf(type);
    if (kind === undefined) {
      return unknownType(
        type,
        TYPE_NAMES,
        (m) => `kubectl describe ${m}${name === undefined ? '' : ` ${name}`}`,
      );
    }
    if (name === undefined || name === '') return error('error: resource name may not be empty', LIST[kind]);
    const namespace = typeof cmd.flags.n === 'string' ? cmd.flags.n : undefined;
    switch (kind) {
      case 'node':
        return node(name, ctx);
      case 'pod':
        return pod(name, ctx, namespace);
      case 'certificate':
        return certificate(name, ctx);
      case 'achievement':
        return achievement(name, ctx);
    }
  },
  complete: (args, ctx, namespace) => {
    if (args.length <= 1) return TYPE_NAMES;
    if (args.length > 2 || !ctx.snapshot) return [];
    switch (typeOf(args[0] ?? '')) {
      case 'node':
        return ctx.snapshot.nodes.map((candidate) => candidate.name);
      case 'pod':
        return namespace === KUBE_SYSTEM
          ? componentNames
          : ctx.snapshot.projects.map((project) => project.slug);
      case 'certificate':
        return ctx.snapshot.certifications.map((cert) => cert.id);
      case 'achievement':
        return ctx.snapshot.achievements.map((item) => item.id);
      case undefined:
        return [];
    }
  },
};
