/**
 * Parses a line typed into the terminal (SPEC §7). Pure: input is split into tokens and never
 * evaluated. Errors use kubectl or shell wording so the terminal can print them as they are.
 */

export interface ParsedCommand {
  /** `k` resolves to `kubectl`. */
  program: 'kubectl' | 'clear' | 'help';
  /** The kubectl verb (`get`, `describe`, ...), lowercased; undefined for `kubectl` alone. */
  verb: string | undefined;
  /** Positional arguments after the verb, case kept. */
  args: string[];
  /** Normalized flag names: `n`, `o`, `f`, `help`; others keep their name without dashes. */
  flags: Record<string, string | true>;
  /** The trimmed input. */
  raw: string;
}

export type ParseResult = { ok: true; command: ParsedCommand } | { ok: false; error: string };

export const MAX_INPUT = 200;

const ALIASES: Record<string, string> = {
  n: 'n',
  namespace: 'n',
  o: 'o',
  output: 'o',
  l: 'l',
  selector: 'l',
  f: 'f',
  filename: 'f',
  follow: 'f',
  h: 'help',
  help: 'help',
};

/** Flags that never take a value. */
const BOOLEAN = new Set(['help', 'follow']);

/**
 * Flags from untrusted input. `Object.fromEntries` defines each name as a plain own property (even
 * `__proto__`), never through a setter, and the object has no prototype, so a lookup like
 * `flags.constructor` can't reach `Object.prototype`. A repeated flag keeps its last value.
 */
function toFlags(pairs: [string, string | true][]): Record<string, string | true> {
  return Object.setPrototypeOf(Object.fromEntries(pairs), null) as Record<string, string | true>;
}

type Tokens = { ok: true; tokens: string[] } | { ok: false };

function tokenize(input: string): Tokens {
  const tokens: string[] = [];
  let current = '';
  let started = false;
  let quote: '"' | "'" | undefined;
  for (const char of input) {
    if (quote) {
      if (char === quote) quote = undefined;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) tokens.push(current);
      current = '';
      started = false;
    } else {
      current += char;
      started = true;
    }
  }
  if (quote) return { ok: false };
  if (started) tokens.push(current);
  return { ok: true, tokens };
}

function isFlag(token: string): boolean {
  return token.startsWith('-') && token.length > 1 && token !== '--';
}

export function parse(input: string): ParseResult {
  const raw = input.trim();
  if (raw === '') return { ok: false, error: '' };
  if (raw.length > MAX_INPUT) {
    return { ok: false, error: `error: input is too long (max ${String(MAX_INPUT)} characters)` };
  }
  const tokenized = tokenize(raw);
  if (!tokenized.ok) return { ok: false, error: 'error: unterminated quoted string' };

  const [first = '', ...rest] = tokenized.tokens;
  const program = first.toLowerCase();
  if (program === 'clear' || program === 'help') {
    return { ok: true, command: { program, verb: undefined, args: rest, flags: {}, raw } };
  }
  if (program !== 'kubectl' && program !== 'k') {
    return { ok: false, error: `command not found: ${first}` };
  }

  const positional: string[] = [];
  // Flag names come from the input (and from ?run= links), so they are collected as pairs and never
  // written as property keys one by one (see `toFlags`).
  const pairs: [string, string | true][] = [];
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i] ?? '';
    if (!isFlag(token)) {
      positional.push(token);
      continue;
    }
    const body = token.replace(/^--?/, '');
    const eq = body.indexOf('=');
    const rawName = eq === -1 ? body : body.slice(0, eq);
    const name = Object.hasOwn(ALIASES, rawName) ? (ALIASES[rawName] ?? rawName) : rawName;
    if (eq !== -1) {
      pairs.push([name, body.slice(eq + 1)]);
      continue;
    }
    const next = rest[i + 1];
    if (!BOOLEAN.has(rawName) && name !== 'help' && next !== undefined && !isFlag(next)) {
      pairs.push([name, next]);
      i++;
    } else {
      pairs.push([name, true]);
    }
  }

  const [verb, ...args] = positional;
  return {
    ok: true,
    command: { program: 'kubectl', verb: verb?.toLowerCase(), args, flags: toFlags(pairs), raw },
  };
}
