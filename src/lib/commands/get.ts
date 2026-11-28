import { experienceRows } from '@/lib/content/cluster';
import type { ParsedCommand } from '@/lib/parser/parse';
import { kubectlAgeClamped } from '@/lib/utils/kubectl';
import { joinBase } from '@/lib/utils/url';

import { error, notFound, unknownType } from './format';
import { COMPONENTS, COMPONENT_STATUSES, CS_WARNING, KUBE_SYSTEM } from './kube-system';

import type { Cell, Column, Command, CommandResult, DataContext, Line } from './types';

/** `kubectl get <resource>` (SPEC §7): tables, `-o wide|yaml|name`, and `get all`. */

interface Item {
  name: string;
  /** Other names `get <type> <name>` accepts (a component's short name). */
  aliases?: readonly string[];
  /** Lowercased skills, for `-l skill=<name>`. */
  skills?: readonly string[];
  row: Record<string, Cell>;
  wide?: Record<string, Cell>;
  manifest: Record<string, unknown>;
}

interface Resource {
  /** The canonical name, used in suggestions and `get all`. */
  plural: string;
  aliases: readonly string[];
  /** YAML `kind` and the `-o name` prefix (lowercased). */
  kind: string;
  /** The namespaces it lives in (`get pods` needs `-n projects` or `-n kube-system`). */
  namespaces?: readonly string[];
  columns: Column[];
  wide?: Column[];
  /** kubectl's warning line, printed above the table. */
  warning?: string;
  items(ctx: DataContext, namespace?: string): Item[];
}

const col = (label: string): Column => ({ key: label.toLowerCase().replace(/ /g, '-'), label });
const cols = (...labels: string[]): Column[] => labels.map(col);
const describeLink = (type: string, name: string, scope = ''): Cell => ({
  text: name,
  run: `kubectl describe ${type} ${name}${scope}`,
});
const age = (start: string | undefined, now: Date): string =>
  start === undefined ? '<unknown>' : kubectlAgeClamped(start, now);
const manifest = (kind: string, name: string, spec: Record<string, unknown>, extra = {}) => ({
  apiVersion: 'v1',
  kind,
  metadata: { name, ...extra },
  spec,
});

const nodes: Resource = {
  plural: 'nodes',
  aliases: ['nodes', 'node', 'no'],
  kind: 'Node',
  columns: cols('NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION'),
  items: ({ snapshot, now, build }) =>
    snapshot.nodes.map((node) => {
      const on = (entry: { node: string | undefined }) => entry.node === node.name;
      const declared = [...snapshot.experience.filter(on), ...snapshot.education.filter(on)];
      // The personal node has no role or degree: it is as old as its oldest project.
      const starts = (declared.length > 0 ? declared : snapshot.projects.filter(on)).flatMap(
        (entry) => entry.start ?? [],
      );
      return {
        name: node.name,
        row: {
          name: describeLink('node', node.name),
          status: node.cordoned ? 'Ready,SchedulingDisabled' : 'Ready',
          roles: node.role,
          age: age(starts.sort()[0], now),
          version: `v${build.version}`,
        },
        manifest: manifest('Node', node.name, { label: node.label, role: node.role }),
      };
    }),
};

const experience: Resource = {
  plural: 'experience',
  aliases: ['experience', 'experiences', 'exp'],
  kind: 'Role',
  columns: cols('NAME', 'ROLE', 'NODE', 'STATUS', 'AGE'),
  items: ({ snapshot, now }) => {
    const roles = snapshot.experience.map(({ name, ...data }) => ({ id: name, data }));
    return experienceRows(roles, snapshot.nodes, now).map((row) => ({
      name: row.name,
      row: { ...row, name: { text: row.name, run: `kubectl describe node ${row.node}` } },
      manifest: manifest('Role', row.name, roles.find((role) => role.id === row.name)?.data ?? {}),
    }));
  },
};

const PROJECT_COLUMNS = cols('NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE');
const projectItems = ({ snapshot, now }: DataContext): Item[] =>
  snapshot.projects.map(({ slug, phase, node, tech, ...spec }) => ({
    name: slug,
    row: {
      name: describeLink('pod', slug),
      ready: phase === 'Running' ? '1/1' : '0/1',
      status: phase,
      restarts: '0',
      age: age(spec.start, now),
    },
    skills: tech.map((skill) => skill.toLowerCase()),
    wide: { node: node ?? '<none>', tech: tech.join(',') },
    manifest: {
      ...manifest('Pod', slug, { nodeName: node, tech, ...spec }, { namespace: 'projects' }),
      status: { phase },
    },
  }));

/** The control plane is as old as the cluster: the first role or degree. */
function clusterStart({ snapshot }: DataContext): string | undefined {
  return [...snapshot.experience, ...snapshot.education].map((entry) => entry.start).sort()[0];
}

const componentItems = (ctx: DataContext): Item[] =>
  COMPONENTS.map(({ name, short, description }) => ({
    name,
    aliases: [short],
    row: {
      name: describeLink('pod', name, ` -n ${KUBE_SYSTEM}`),
      ready: '1/1',
      status: 'Running',
      restarts: '0',
      age: age(clusterStart(ctx), ctx.now),
    },
    wide: { node: '<none>', tech: '' },
    manifest: {
      ...manifest(
        'Pod',
        name,
        { description },
        { namespace: KUBE_SYSTEM, labels: { component: short, tier: 'control-plane' } },
      ),
      status: { phase: 'Running' },
    },
  }));

const pods: Resource = {
  plural: 'pods',
  aliases: ['pods', 'pod', 'po'],
  kind: 'Pod',
  namespaces: ['projects', KUBE_SYSTEM],
  columns: PROJECT_COLUMNS,
  wide: cols('NODE', 'TECH'),
  items: (ctx, namespace) => (namespace === KUBE_SYSTEM ? componentItems(ctx) : projectItems(ctx)),
};

const projects: Resource = {
  plural: 'projects',
  aliases: ['projects', 'project'],
  kind: 'Pod',
  columns: PROJECT_COLUMNS,
  wide: cols('NODE', 'TECH'),
  items: projectItems,
};

const componentStatuses: Resource = {
  plural: 'componentstatuses',
  aliases: ['componentstatuses', 'componentstatus', 'cs'],
  kind: 'ComponentStatus',
  columns: cols('NAME', 'STATUS', 'MESSAGE', 'ERROR'),
  warning: CS_WARNING,
  items: () =>
    COMPONENT_STATUSES.map(({ name, message }) => ({
      name,
      row: { name, status: 'Healthy', message, error: '' },
      manifest: {
        apiVersion: 'v1',
        kind: 'ComponentStatus',
        metadata: { name },
        conditions: [{ type: 'Healthy', status: 'True', message }],
      },
    })),
};

const certificates: Resource = {
  plural: 'certificates',
  aliases: ['certificates', 'certificate', 'certs', 'cert', 'certifications'],
  kind: 'Certificate',
  columns: cols('NAME', 'TITLE', 'ISSUER', 'STATUS', 'DATE'),
  items: ({ snapshot }) =>
    snapshot.certifications.map(({ id, name, issuer, status, date }) => ({
      name: id,
      row: { name: describeLink('certificate', id), title: name, issuer, status, date: date ?? '<none>' },
      manifest: manifest('Certificate', id, { title: name, issuer, status, date }),
    })),
};

const achievements: Resource = {
  plural: 'achievements',
  aliases: ['achievements', 'achievement', 'awards'],
  kind: 'Achievement',
  columns: cols('NAME', 'TITLE', 'ORG', 'DATE'),
  items: ({ snapshot }) =>
    snapshot.achievements.map(({ id, title, org, date, ...spec }) => ({
      name: id,
      row: { name: describeLink('achievement', id), title, org: org ?? '<none>', date },
      manifest: manifest('Achievement', id, { title, org, date, ...spec }),
    })),
};

interface Event {
  date: string;
  reason: string;
  object: Exclude<Cell, string>;
  message: string;
}

const events: Resource = {
  plural: 'events',
  aliases: ['events', 'event', 'ev'],
  kind: 'Event',
  columns: cols('LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE'),
  items: ({ snapshot, now, base }) => {
    const all: Event[] = [
      ...snapshot.experience.map((role) => ({
        date: role.start,
        reason: 'Scheduled',
        object: { text: `node/${role.node}`, run: `kubectl describe node ${role.node}` },
        message: role.role,
      })),
      ...snapshot.projects.flatMap((project) =>
        project.start === undefined
          ? []
          : [
              {
                date: project.start,
                reason: 'Started',
                object: { text: `pod/${project.slug}`, run: `kubectl describe pod ${project.slug}` },
                message: project.name,
              },
            ],
      ),
      ...snapshot.updates.map((update) => ({
        date: update.date,
        reason: 'Published',
        object: { text: `update/${update.slug}`, href: joinBase(base, `updates/${update.slug}/`) },
        message: update.title,
      })),
    ];
    return all
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .map((event) => {
        const object = event.object.text;
        return {
          name: object,
          row: {
            'last-seen': kubectlAgeClamped(event.date, now),
            type: 'Normal',
            reason: event.reason,
            object: event.object,
            message: event.message,
          },
          manifest: manifest('Event', object, {
            reason: event.reason,
            date: event.date,
            message: event.message,
          }),
        };
      });
  },
};

const RESOURCES = [nodes, experience, pods, projects, componentStatuses, certificates, achievements, events];
const NAMES = ['all', ...RESOURCES.map((resource) => resource.plural)];

const find = (word: string): Resource | undefined =>
  RESOURCES.find((resource) => resource.aliases.includes(word.toLowerCase()));

const FORMATS = ['name', 'wide', 'yaml'];

/** A flag given without its value (`-o` at the end of the line). */
const needsValue = (flag: string): CommandResult =>
  error(`error: flag needs an argument: '${flag}' in -${flag}`);

const FIRST = 3;

function all(ctx: DataContext): CommandResult {
  const sections: { title: string; run: string; entries: Line[] }[] = [
    {
      title: 'nodes',
      run: 'kubectl get nodes',
      entries: ctx.snapshot.nodes.map((node) => ({
        text: `  node/${node.name}`,
        run: `kubectl describe node ${node.name}`,
      })),
    },
    {
      title: 'pods -n projects',
      run: 'kubectl get pods -n projects',
      entries: ctx.snapshot.projects.map((p) => ({
        text: `  pod/${p.slug}`,
        run: `kubectl describe pod ${p.slug}`,
      })),
    },
    {
      title: 'experience',
      run: 'kubectl get experience',
      entries: ctx.snapshot.experience.map((role) => ({
        text: `  role/${role.name}`,
        run: `kubectl describe node ${role.node}`,
      })),
    },
    {
      title: 'certificates',
      run: 'kubectl get certificates',
      entries: ctx.snapshot.certifications.map((cert) => ({
        text: `  certificate/${cert.id}`,
        run: `kubectl describe certificate ${cert.id}`,
      })),
    },
    {
      title: 'achievements',
      run: 'kubectl get achievements',
      entries: ctx.snapshot.achievements.map((item) => ({
        text: `  achievement/${item.id}`,
        run: `kubectl describe achievement ${item.id}`,
      })),
    },
    {
      title: 'updates',
      run: 'kubectl logs updates',
      entries: ctx.snapshot.updates.map((update) => ({
        text: `  update/${update.slug}`,
        href: joinBase(ctx.base, `updates/${update.slug}/`),
      })),
    },
  ];
  const lines = sections.flatMap(({ title, run, entries }) => {
    const more = entries.length - FIRST;
    return [
      { text: `${title} (${String(entries.length)})`, run },
      ...entries.slice(0, FIRST),
      ...(more > 0 ? [{ text: `  ... ${String(more)} more`, run, tone: 'muted' as const }] : []),
    ];
  });
  return { kind: 'lines', lines };
}

async function run(cmd: ParsedCommand, ctx: DataContext): Promise<CommandResult> {
  const [type, name] = cmd.args;
  if (type === undefined)
    return error('error: you must specify the type of resource to get', 'kubectl get all');
  if (type.toLowerCase() === 'all') return all(ctx);
  const resource = find(type);
  if (!resource) return unknownType(type, NAMES, (match) => `kubectl get ${match}`);

  const { n: namespace, o: output, l: selector } = cmd.flags;
  if (namespace === true) return needsValue('n');
  if (output === true) return needsValue('o');
  if (selector === true) return needsValue('l');
  if (output !== undefined && !FORMATS.includes(output)) {
    return error(
      `error: unable to match a printer suitable for the output format "${output}", allowed formats are: ${FORMATS.join(',')}`,
    );
  }
  const scoped = resource.namespaces !== undefined;
  const noResources: CommandResult = {
    kind: 'lines',
    lines: [
      { text: scoped ? `No resources found in ${namespace ?? 'default'} namespace.` : 'No resources found' },
    ],
  };
  if (scoped && (namespace === undefined || !resource.namespaces?.includes(namespace))) return noResources;

  let items = resource.items(ctx, namespace);
  if (name !== undefined) {
    const names = items.map((item) => item.name);
    const scope = scoped ? ` -n ${namespace ?? ''}` : '';
    const lower = name.toLowerCase();
    // Components match in any case, by static pod or short name (as `describe` does).
    items = items.filter(
      (item) =>
        item.name === name || (item.aliases !== undefined && [item.name, ...item.aliases].includes(lower)),
    );
    if (items.length === 0) {
      return notFound(
        resource.plural,
        name,
        names,
        (match) => `kubectl get ${resource.plural} ${match}${scope}`,
      );
    }
  }
  let filter: { skill: string } | undefined;
  if (selector !== undefined) {
    const eq = selector.indexOf('=');
    const key = eq === -1 ? selector : selector.slice(0, eq);
    const skill = eq === -1 ? '' : selector.slice(eq + 1).toLowerCase();
    items = key === 'skill' ? items.filter((item) => item.skills?.includes(skill)) : [];
    if (items.length === 0) return noResources;
    filter = { skill };
  }

  if (output === 'yaml') {
    const { toYaml } = await import('./yaml');
    return {
      kind: 'yaml',
      text: toYaml({ apiVersion: 'v1', kind: 'List', items: items.map((item) => item.manifest) }),
    };
  }
  const prefix = resource.kind.toLowerCase();
  if (output === 'name')
    return { kind: 'lines', lines: items.map((item) => ({ text: `${prefix}/${item.name}` })) };

  const wide = output === 'wide' && resource.wide !== undefined;
  return {
    kind: 'table',
    caption: cmd.raw,
    columns: wide ? [...resource.columns, ...(resource.wide ?? [])] : resource.columns,
    rows: items.map((item) => (wide ? { ...item.row, ...item.wide } : item.row)),
    ...(resource.warning === undefined ? {} : { warning: resource.warning }),
    ...(filter === undefined ? {} : { filter }),
  };
}

/** Every skill a project used, for `-l skill=` completion. */
export const skillNames = (ctx: DataContext): string[] =>
  [...new Set(ctx.snapshot.projects.flatMap((project) => project.tech))].sort();

export const get: Command = {
  verb: 'get',
  readOnly: true,
  needsData: true,
  run,
  complete: (args, ctx, namespace) => {
    if (args.length <= 1) return NAMES;
    const resource = find(args[0] ?? '');
    if (args.length !== 2 || !resource || !ctx.snapshot) return [];
    return resource
      .items({ ...ctx, snapshot: ctx.snapshot }, namespace)
      .flatMap((item) => [...(item.aliases ?? []), item.name]);
  },
};
