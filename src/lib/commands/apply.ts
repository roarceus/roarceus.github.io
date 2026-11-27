import { error } from './format';

import type { Command } from './types';

/**
 * `kubectl apply -f contact.yaml` (SPEC §7, ADR 0005): opens the contact manifest in the details panel.
 * The only file in this cluster, so any other path does not exist, as kubectl says.
 */

export const CONTACT_FILE = 'contact.yaml';
const OPEN = `kubectl apply -f ${CONTACT_FILE}`;

export const apply: Command = {
  verb: 'apply',
  readOnly: false,
  needsData: false,
  run: (cmd) => {
    const file = cmd.flags.f;
    if (file === undefined) return error('error: must specify one of -f and -k', OPEN);
    if (file === true) return error("error: flag needs an argument: 'f' in -f", OPEN);
    if (file.toLowerCase() !== CONTACT_FILE) return error(`error: the path "${file}" does not exist`, OPEN);
    return {
      kind: 'detail',
      target: { kind: 'contact', name: 'sohan' },
      lines: [
        {
          text: `${CONTACT_FILE} is open in the details panel. Fill in spec, then press Apply.`,
          tone: 'muted',
        },
      ],
    };
  },
  complete: () => [],
};
