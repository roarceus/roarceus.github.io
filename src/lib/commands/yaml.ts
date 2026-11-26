/**
 * A small YAML writer for `kubectl get -o yaml` (design doc stage-3 §5.2). The snapshot is flat
 * (strings, numbers, booleans, lists, maps), so no YAML dependency. Sequences sit at their key's
 * indent, the way kubectl prints them. A string is quoted (JSON style, which is valid YAML) whenever
 * YAML could read it as something else: `:` or `#`, a leading indicator, edge spaces, or a value that
 * looks like a number, boolean, or null.
 */

const PLAIN = /^[^\s:#\-?,[\]{}&*!|>'"%@`]([^:#]*[^\s:#])?$/;
const OTHER_TYPE = /^(?:true|false|yes|no|on|off|null|~|[-+]?(?:\d[\d_]*)?\.?\d+(?:e[-+]?\d+)?|0x[\da-f]+)$/i;

/** A scalar: numbers and booleans as they are, strings plain or quoted, anything else `null`. */
function scalar(value: unknown): string {
  if (typeof value === 'string') {
    return PLAIN.test(value) && !OTHER_TYPE.test(value) ? value : JSON.stringify(value);
  }
  return typeof value === 'number' || typeof value === 'boolean' ? String(value) : 'null';
}

const isMap = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Inline form for a value with no children: scalars and empty collections. */
function inline(value: unknown): string | undefined {
  if (Array.isArray(value)) return value.length === 0 ? '[]' : undefined;
  if (isMap(value)) return Object.keys(value).length === 0 ? '{}' : undefined;
  return scalar(value);
}

function mapLines(map: Record<string, unknown>, pad: string): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(map)) {
    if (value === undefined) continue;
    const short = inline(value);
    if (short !== undefined) lines.push(`${pad}${key}: ${short}`);
    else if (Array.isArray(value)) lines.push(`${pad}${key}:`, ...listLines(value, pad));
    else lines.push(`${pad}${key}:`, ...mapLines(value as Record<string, unknown>, `${pad}  `));
  }
  return lines;
}

function listLines(list: unknown[], pad: string): string[] {
  const lines: string[] = [];
  for (const item of list) {
    const short = inline(item);
    if (short !== undefined) lines.push(`${pad}- ${short}`);
    else if (Array.isArray(item)) lines.push(`${pad}-`, ...listLines(item, `${pad}  `));
    else {
      const [first = '', ...rest] = mapLines(item as Record<string, unknown>, `${pad}  `);
      lines.push(`${pad}- ${first.slice(pad.length + 2)}`, ...rest);
    }
  }
  return lines;
}

/** A YAML document for a map, ending with a newline. */
export function toYaml(map: Record<string, unknown>): string {
  return `${mapLines(map, '').join('\n')}\n`;
}
