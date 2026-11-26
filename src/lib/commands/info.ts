import { joinBase } from '@/lib/utils/url';

import { error, errorWithMatch, notFound, splitTypeName } from './format';

import type { Command } from './types';

/** The small commands: `version`, `cluster-info`, `config`, `port-forward`, and `clear` (SPEC §7). */

export const version: Command = {
  verb: 'version',
  readOnly: true,
  needsData: false,
  run: (_cmd, { build }) => ({
    kind: 'lines',
    lines: [{ text: `Client Version: v${build.version}` }, { text: `Build Commit: ${build.commit}` }],
  }),
  complete: () => [],
};

export const clusterInfo: Command = {
  verb: 'cluster-info',
  readOnly: true,
  needsData: true,
  run: (_cmd, { snapshot, base }) => {
    const { name, title, location, tagline, links, resume } = snapshot.profile;
    const resumeHref = joinBase(base, resume);
    return {
      kind: 'lines',
      lines: [
        { text: `${name} (${title}) is running at ${location}`, tone: 'ok' },
        { text: tagline },
        { text: `GitHub is running at ${links.github}`, href: links.github },
        { text: `LinkedIn is running at ${links.linkedin}`, href: links.linkedin },
        { text: `Email is running at ${links.email}`, href: `mailto:${links.email}` },
        { text: `Resume is running at ${resumeHref}`, href: resumeHref },
        {
          text: "To further debug and diagnose cluster problems, use 'kubectl describe node'.",
          tone: 'muted',
        },
      ],
    };
  },
  complete: () => [],
};

const CONTEXTS = ['cluster', 'plain'];
const SUBCOMMANDS = ['current-context', 'get-contexts', 'use-context'];

export const config: Command = {
  verb: 'config',
  readOnly: false,
  needsData: false,
  run: (cmd, { base }) => {
    const [sub = '', name = ''] = cmd.args;
    switch (sub) {
      case 'current-context':
        return { kind: 'lines', lines: [{ text: 'cluster' }] };
      case 'get-contexts':
        return {
          kind: 'table',
          caption: cmd.raw,
          columns: [
            { key: 'current', label: 'CURRENT' },
            { key: 'name', label: 'NAME' },
          ],
          rows: [
            { current: '*', name: 'cluster' },
            { current: '', name: { text: 'plain', run: 'kubectl config use-context plain' } },
          ],
        };
      case 'use-context':
        if (name === 'plain') {
          return {
            kind: 'action',
            action: 'navigate',
            href: joinBase(base, 'plain/'),
            lines: [{ text: 'Switched to context "plain".' }],
          };
        }
        if (name === 'cluster') return { kind: 'lines', lines: [{ text: 'Switched to context "cluster".' }] };
        return errorWithMatch(
          `error: no context exists with the name: "${name}"`,
          name,
          CONTEXTS,
          (m) => `kubectl config use-context ${m}`,
        );
      case '':
        return error(
          `error: you must specify a subcommand: ${SUBCOMMANDS.join(', ')}`,
          'kubectl config get-contexts',
        );
      default:
        return errorWithMatch(
          `error: unknown command "${sub}" for "kubectl config"`,
          sub,
          SUBCOMMANDS,
          (m) => `kubectl config ${m}`,
        );
    }
  },
  complete: (args) => {
    if (args.length <= 1) return SUBCOMMANDS;
    return args.length === 2 && args[0] === 'use-context' ? CONTEXTS : [];
  },
};

const SERVICES = ['github', 'linkedin'] as const;
const SERVICE_TYPES = ['svc', 'service', 'services'];

export const portForward: Command = {
  verb: 'port-forward',
  readOnly: false,
  needsData: true,
  run: (cmd, { snapshot }) => {
    const [type, name] = splitTypeName(cmd.args);
    const service = (SERVICE_TYPES.includes(type ?? '') ? name : type) ?? '';
    if (service === '') {
      return error(
        'error: TYPE/NAME is a required argument for the port-forward command',
        'kubectl port-forward github',
      );
    }
    const key = SERVICES.find((candidate) => candidate === service.toLowerCase());
    if (!key) return notFound('services', service, SERVICES, (m) => `kubectl port-forward ${m}`);
    const href = snapshot.profile.links[key];
    return {
      kind: 'action',
      action: 'open',
      href,
      lines: [{ text: `Forwarding from 127.0.0.1 -> ${href.replace(/^https?:\/\/(www\.)?/, '')}`, href }],
    };
  },
  complete: (args) => (args.length <= 1 ? [...SERVICES] : []),
};

export const clear: Command = {
  verb: 'clear',
  readOnly: false,
  needsData: false,
  run: () => ({ kind: 'action', action: 'clear' }),
  complete: () => [],
};
