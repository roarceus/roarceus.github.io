import { commandFor } from '@/lib/commands/run';
import { MAX_INPUT, parse, type ParsedCommand } from '@/lib/parser/parse';

/**
 * `?run=` deep links (design doc stage-3 §5.6). Only read-only commands run from a link: `get`,
 * `describe`, `top`, `logs` without `-f`, `version`, `help`, `cluster-info`. Anything else is ignored
 * and the page loads normally.
 */

const CONTROL = /\p{Cc}/u;

function parseLine(value: string): ParsedCommand | undefined {
  const direct = parse(value);
  if (direct.ok) return direct.command;
  // A bare verb (`?run=describe+pod+asktrace`) means kubectl.
  const prefixed = parse(`kubectl ${value}`);
  return prefixed.ok ? prefixed.command : undefined;
}

const allowed = (cmd: ParsedCommand): boolean =>
  commandFor(cmd)?.readOnly === true && !(cmd.verb === 'logs' && cmd.flags.f !== undefined);

/** The command line to run from `location.search`, or undefined when there is none to run. */
export function readRunParam(search: string): string | undefined {
  const value = new URLSearchParams(search).get('run');
  if (value === null || value.trim() === '' || value.length > MAX_INPUT || CONTROL.test(value))
    return undefined;
  const cmd = parseLine(value);
  return cmd && allowed(cmd) ? cmd.raw : undefined;
}

/** A shareable link that runs `input`, under the current page's path (so previews keep their base). */
export function runHref(input: string, location: { pathname: string }): string {
  return `${location.pathname}?${new URLSearchParams({ run: input.trim() }).toString()}`;
}
