import { error, errorWithMatch } from './format';

import type { Command } from './types';

/** `kubectl top skills` (SPEC §7): each skill with its level as a five-step usage bar. */

const MAX_LEVEL = 5;

const bar = (level: number): string => '█'.repeat(level) + '░'.repeat(MAX_LEVEL - level);

export const top: Command = {
  verb: 'top',
  readOnly: true,
  needsData: true,
  run: (cmd, { snapshot }) => {
    const [resource] = cmd.args;
    if (resource === undefined)
      return error('error: you must specify a resource: skills', 'kubectl top skills');
    const lower = resource.toLowerCase();
    if (['nodes', 'node', 'no', 'pods', 'pod', 'po'].includes(lower)) {
      return error('error: Metrics API not available', 'kubectl top skills');
    }
    if (lower !== 'skills' && lower !== 'skill') {
      return errorWithMatch(
        `error: unknown command "${resource}" for "kubectl top"`,
        resource,
        ['skills'],
        () => 'kubectl top skills',
      );
    }
    return {
      kind: 'table',
      caption: cmd.raw,
      columns: [
        { key: 'name', label: 'NAME' },
        { key: 'category', label: 'CATEGORY' },
        { key: 'level', label: 'LEVEL' },
        { key: 'usage', label: 'USAGE' },
      ],
      rows: snapshot.skills.flatMap(({ category, items }) =>
        items.map(({ name, level }) => ({
          name,
          category,
          level: level === undefined ? '-' : `${String(level)}/${String(MAX_LEVEL)}`,
          usage: level === undefined ? '-' : bar(level),
        })),
      ),
    };
  },
  complete: (args) => (args.length <= 1 ? ['skills'] : []),
};
