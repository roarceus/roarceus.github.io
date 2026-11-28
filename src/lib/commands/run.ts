import type { ParsedCommand } from '@/lib/parser/parse';

import { CONTACT_FILE } from './apply';
import { error, errorWithMatch } from './format';
import { skillNames } from './get';
import { KUBE_SYSTEM } from './kube-system';
import { PROGRAM_ONLY, registry } from './registry';

import type { Command, CommandContext, CommandResult } from './types';

/**
 * Runs a parsed command against the registry (design doc stage-3 §5.2). Pure apart from the lazy
 * YAML import: the store in Task 5 is the only caller, and the only place results reach the screen.
 */

const VERBS = [...registry.keys()].filter((verb) => !PROGRAM_ONLY.has(verb));

const verbOf = (cmd: ParsedCommand): string =>
  (cmd.program === 'kubectl' ? (cmd.flags.help === undefined ? cmd.verb : 'help') : cmd.program) ?? 'help';

/** The registry entry a parsed command runs, or undefined for an unknown verb. */
export function commandFor(cmd: ParsedCommand): Command | undefined {
  const verb = verbOf(cmd);
  return cmd.program === 'kubectl' && PROGRAM_ONLY.has(verb) ? undefined : registry.get(verb);
}

export async function execute(cmd: ParsedCommand, ctx: CommandContext): Promise<CommandResult> {
  const command = commandFor(cmd);
  if (!command) {
    const word = verbOf(cmd);
    return errorWithMatch(`error: unknown command "${word}" for "kubectl"`, word, VERBS, (match) =>
      ['kubectl', match, ...cmd.args].join(' '),
    );
  }
  if (!command.needsData) return command.run(cmd, ctx);
  const { snapshot } = ctx;
  if (!snapshot) return error('Unable to connect to the server: failed to load cluster data');
  return command.run(cmd, { ...ctx, snapshot });
}

const PROGRAMS = ['kubectl', 'clear', 'help'];
const FLAG_VALUES: Record<string, string[]> = {
  '-n': ['projects', KUBE_SYSTEM],
  '--namespace': ['projects', KUBE_SYSTEM],
  '-l': [],
  '--selector': [],
  '-o': ['wide', 'yaml', 'name'],
  '--output': ['wide', 'yaml', 'name'],
};

function candidates(parts: string[], ctx: CommandContext): string[] {
  const [program = '', verb = '', ...rest] = parts;
  if (parts.length === 1) return PROGRAMS;
  if (program.toLowerCase() !== 'kubectl' && program.toLowerCase() !== 'k') return [];
  if (parts.length === 2) return VERBS;
  const command = registry.get(verb.toLowerCase());
  if (!command || PROGRAM_ONLY.has(command.verb)) return [];

  const previous = parts[parts.length - 2] ?? '';
  if (command.verb === 'apply' && (previous === '-f' || previous === '--filename')) return [CONTACT_FILE];
  if (previous === '-l' || previous === '--selector') {
    return ctx.snapshot
      ? skillNames({ ...ctx, snapshot: ctx.snapshot }).map((skill) => `skill=${skill}`)
      : [];
  }
  const flagValues = FLAG_VALUES[previous];
  if (flagValues) return flagValues;
  const word = rest[rest.length - 1] ?? '';
  if (word.startsWith('-')) return [];
  const positional = rest.filter((token, i) => !token.startsWith('-') && !FLAG_VALUES[rest[i - 1] ?? '']);
  const flag = rest.findIndex((token) => token === '-n' || token === '--namespace');
  const namespace = flag === -1 ? undefined : rest[flag + 1];
  return command.complete(positional, ctx, namespace);
}

/** Whole-line completions for Tab: the input with its last word completed, one entry per match. */
export function completions(input: string, ctx: CommandContext): string[] {
  const trimmed = input.trimStart();
  if (trimmed === '') return [];
  const parts = trimmed.split(/\s+/);
  const word = (parts[parts.length - 1] ?? '').toLowerCase();
  const head = parts.slice(0, -1).join(' ');
  const prefix = head === '' ? '' : `${head} `;
  return candidates(parts, ctx)
    .filter((candidate) => candidate.toLowerCase().startsWith(word))
    .map((candidate) => prefix + candidate);
}
