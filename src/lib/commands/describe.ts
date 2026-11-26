import { joinBase } from '@/lib/utils/url';

import { error, field, notFound, period, splitTypeName, unknownType } from './format';

import type { Command, CommandResult, DataContext, Line } from './types';

/** `kubectl describe node|pod <name>` (SPEC §7): selects it in the detail panel and echoes its fields. */

const NODE = ['node', 'nodes', 'no'];
const POD = ['pod', 'pods', 'po'];

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
  const lines: Line[] = [
    field('Name', name),
    field('Roles', found.role),
    field('Labels', `org=${found.label}`),
  ];
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

function pod(slug: string, { snapshot, base }: DataContext): CommandResult {
  const found = snapshot.projects.find((project) => project.slug === slug);
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
  ];
  return { kind: 'detail', target: { kind: 'pod', name: slug }, lines };
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
    const lower = type.toLowerCase();
    const isNode = NODE.includes(lower);
    if (!isNode && !POD.includes(lower)) {
      return unknownType(
        type,
        ['node', 'pod'],
        (m) => `kubectl describe ${m}${name === undefined ? '' : ` ${name}`}`,
      );
    }
    if (name === undefined || name === '') {
      return error(
        'error: resource name may not be empty',
        isNode ? 'kubectl get nodes' : 'kubectl get pods -n projects',
      );
    }
    return isNode ? node(name, ctx) : pod(name, ctx);
  },
  complete: (args, ctx) => {
    if (args.length <= 1) return ['node', 'pod'];
    if (args.length > 2 || !ctx.snapshot) return [];
    const type = (args[0] ?? '').toLowerCase();
    if (NODE.includes(type)) return ctx.snapshot.nodes.map((candidate) => candidate.name);
    if (POD.includes(type)) return ctx.snapshot.projects.map((project) => project.slug);
    return [];
  },
};
