import { experienceRows } from '@/lib/content/cluster';
import type { ParsedCommand } from '@/lib/parser/parse';
import { kubectlAgeClamped } from '@/lib/utils/kubectl';
import { joinBase } from '@/lib/utils/url';

import { error, notFound, unknownType } from './format';

import type { Cell, Column, Command, CommandResult, DataContext, Line } from './types';

/** `kubectl get <resource>` (SPEC §7): tables, `-o wide|yaml|name`, and `get all`. */

interface Item {
  name: string;
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
  /** Only in the `projects` namespace (`get pods` needs `-n projects`). */
  namespaced?: boolean;
  columns: Column[];
  wide?: Column[];
  items(ctx: DataContext): Item[];
}

const col = (label: string): Column => ({ key: label.toLowerCase().replace(/ /g, '-'), label });
const cols = (...labels: string[]): Column[] => labels.map(col);
const describeLink = (type: 'node' | 'pod', name: string): Cell => ({
  text: name,
  run: `kubectl describe ${type} ${name}`,
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
      const starts = snapshot.experience.filter((role) => role.node === node.name).map((role) => role.start);
      return {
        name: node.name,
        row: {
          name: describeLink('node', node.name),
          status: 'Ready',
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
    wide: { node: node ?? '<none>', tech: tech.join(',') },
    manifest: {
      ...manifest('Pod', slug, { nodeName: node, tech, ...spec }, { namespace: 'projects' }),
      status: { phase },
    },
  }));

const pods: Resource = {
  plural: 'pods',
  aliases: ['pods', 'pod', 'po'],
  kind: 'Pod',
  namespaced: true,
  columns: PROJECT_COLUMNS,
  wide: cols('NODE', 'TECH'),
  items: projectItems,
};

const projects: Resource = {
  ...pods,
  plural: 'projects',
  aliases: ['projects', 'project'],
  namespaced: false,
};

const certificates: Resource = {
  plural: 'certificates',
  aliases: ['certificates', 'certificate', 'certs', 'cert', 'certifications'],
  kind: 'Certificate',
  columns: cols('NAME', 'ISSUER', 'STATUS', 'DATE'),
  items: ({ snapshot }) =>
    snapshot.certifications.map(({ name, issuer, status, date }) => ({
      name,
      row: { name, issuer, status, date: date ?? '<none>' },
      manifest: manifest('Certificate', name, { issuer, status, date }),
    })),
};

const achievements: Resource = {
  plural: 'achievements',
  aliases: ['achievements', 'achievement', 'awards'],
  kind: 'Achievement',
  columns: cols('NAME', 'ORG', 'DATE'),
  items: ({ snapshot }) =>
    snapshot.achievements.map(({ title, org, date, ...spec }) => ({
      name: title,
      row: { name: title, org: org ?? '<none>', date },
      manifest: manifest('Achievement', title, { org, date, ...spec }),
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

const RESOURCES = [nodes, experience, pods, projects, certificates, achievements, events];
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
      entries: ctx.snapshot.certifications.map((cert) => ({ text: `  certificate/${cert.name}` })),
    },
    {
      title: 'achievements',
      run: 'kubectl get achievements',
      entries: ctx.snapshot.achievements.map((item) => ({ text: `  achievement/${item.title}` })),
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

  const { n: namespace, o: output } = cmd.flags;
  if (namespace === true) return needsValue('n');
  if (output === true) return needsValue('o');
  if (output !== undefined && !FORMATS.includes(output)) {
    return error(
      `error: unable to match a printer suitable for the output format "${output}", allowed formats are: ${FORMATS.join(',')}`,
    );
  }
  if (resource.namespaced && namespace !== 'projects') {
    return { kind: 'lines', lines: [{ text: `No resources found in ${namespace ?? 'default'} namespace.` }] };
  }

  let items = resource.items(ctx);
  if (name !== undefined) {
    const names = items.map((item) => item.name);
    const scope = resource.namespaced ? ' -n projects' : '';
    items = items.filter((item) => item.name === name);
    if (items.length === 0) {
      return notFound(
        resource.plural,
        name,
        names,
        (match) => `kubectl get ${resource.plural} ${match}${scope}`,
      );
    }
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
  };
}

export const get: Command = {
  verb: 'get',
  readOnly: true,
  needsData: true,
  run,
  complete: (args, ctx) => {
    if (args.length <= 1) return NAMES;
    const resource = find(args[0] ?? '');
    if (args.length !== 2 || !resource || !ctx.snapshot) return [];
    return resource.items({ ...ctx, snapshot: ctx.snapshot }).map((item) => item.name);
  },
};
