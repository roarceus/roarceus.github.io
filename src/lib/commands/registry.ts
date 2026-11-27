import { apply } from './apply';
import { describe } from './describe';
import { get } from './get';
import { help } from './help';
import { clear, clusterInfo, config, portForward, version } from './info';
import { logs } from './logs';
import { top } from './top';

import type { Command } from './types';

/** Every command by verb (SPEC §7). */
export const registry: ReadonlyMap<string, Command> = new Map(
  [get, describe, top, logs, apply, version, clusterInfo, config, portForward, help, clear].map((command) => [
    command.verb,
    command,
  ]),
);

/** Verbs that exist only as programs (`clear`), never after `kubectl`. */
export const PROGRAM_ONLY = new Set(['clear']);
