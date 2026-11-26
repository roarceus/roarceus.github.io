import { joinBase } from '@/lib/utils/url';

import { error, notFound } from './format';

import type { Command } from './types';

/** `kubectl logs updates [-f]` (SPEC §7): the newest updates, streamed in with `-f`. */
export const logs: Command = {
  verb: 'logs',
  readOnly: true,
  needsData: true,
  run: (cmd, { snapshot, base }) => {
    // `-f` also names a file (`apply -f x`), so the parser gives it the next word: `logs -f updates`.
    const { f: follow } = cmd.flags;
    const target = cmd.args[0] ?? (typeof follow === 'string' ? follow : undefined);
    if (target === undefined)
      return error('error: expected POD or TYPE/NAME argument', 'kubectl logs updates');
    if (target.toLowerCase() !== 'updates')
      return notFound('pods', target, ['updates'], () => 'kubectl logs updates');
    const lines = snapshot.updates.map((update) => ({
      text: `${update.date}  ${update.title}: ${update.summary}`,
      href: joinBase(base, `updates/${update.slug}/`),
    }));
    return follow === undefined ? { kind: 'lines', lines } : { kind: 'lines', lines, stream: true };
  },
  complete: (args) => (args.length <= 1 ? ['updates'] : []),
};
