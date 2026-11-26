import { parse } from '@/lib/parser/parse';

import { ctx } from './fixtures';
import { execute } from './run';

import type { CommandContext, CommandResult } from './types';

/** Parses and executes one input line, as the terminal will. */
export async function exec(input: string, overrides: Partial<CommandContext> = {}): Promise<CommandResult> {
  const parsed = parse(input);
  if (!parsed.ok) throw new Error(parsed.error);
  return execute(parsed.command, ctx(overrides));
}

/** Narrows a result to one kind or fails the test. */
export function as<K extends CommandResult['kind']>(
  result: CommandResult,
  kind: K,
): Extract<CommandResult, { kind: K }> {
  if (result.kind !== kind) throw new Error(`Expected ${kind}, got ${JSON.stringify(result)}`);
  return result as Extract<CommandResult, { kind: K }>;
}

/** The text of every line of a `lines` result. */
export const texts = (result: CommandResult): string[] => as(result, 'lines').lines.map((line) => line.text);
