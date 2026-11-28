import { suggest } from '@/lib/utils/suggest';

import type { CommandResult, Line } from './types';

/** Shared kubectl wording for command output (SPEC §5 "Accuracy matters"). */

const LABEL_WIDTH = 14;

/** A `describe` field: the label and colon padded to a fixed column, like kubectl. */
export const field = (label: string, value: string, extra: Omit<Line, 'text'> = {}): Line => ({
  text: `${`${label}:`.padEnd(Math.max(LABEL_WIDTH, label.length + 2))}${value}`,
  ...extra,
});

/** An error result; `suggestion` is left out when there is none. */
export function error(message: string, suggestion?: string): CommandResult {
  return suggestion === undefined ? { kind: 'error', message } : { kind: 'error', message, suggestion };
}

/**
 * An error with "Did you mean this?" built from the closest candidate: `line(candidate)` is the
 * whole command to suggest.
 */
export function errorWithMatch(
  message: string,
  word: string,
  candidates: readonly string[],
  line: (match: string) => string,
): CommandResult {
  const match = suggest(word, candidates);
  return error(message, match === undefined ? undefined : line(match));
}

/** `Error from server (NotFound): <type> "<name>" not found`, with a suggestion. */
export function notFound(
  type: string,
  name: string,
  candidates: readonly string[],
  line: (match: string) => string,
): CommandResult {
  return errorWithMatch(`Error from server (NotFound): ${type} "${name}" not found`, name, candidates, line);
}

/** `error: the server doesn't have a resource type "<x>"`, with a suggestion. */
export function unknownType(type: string, candidates: readonly string[], line: (match: string) => string) {
  return errorWithMatch(`error: the server doesn't have a resource type "${type}"`, type, candidates, line);
}

/** `start to end`, or `<unknown>` with no start. */
export const period = (start: string | undefined, end: string | undefined): string =>
  start === undefined ? '<unknown>' : `${start} to ${end ?? 'present'}`;

/** Splits `TYPE/NAME` (`pod/asktrace`) into its parts; a bare word is a type. */
export function splitTypeName(args: readonly string[]): [string | undefined, string | undefined] {
  const [first, second] = args;
  if (first?.includes('/')) {
    const [type = '', ...rest] = first.split('/');
    return [type, rest.join('/')];
  }
  return [first, second];
}
