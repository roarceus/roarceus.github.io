import type { ClusterSnapshot } from '@/lib/content/snapshot';
import type { ParsedCommand } from '@/lib/parser/parse';

/**
 * What a command returns (design doc stage-3 §5.2). Plain data, never HTML: the terminal renders it as
 * React elements, so nothing a visitor types or links can become markup.
 */

/** A table cell: text, optionally a command to run on click (`run`) or a link (`href`). */
export type Cell = string | { text: string; run?: string; href?: string };

export interface Line {
  text: string;
  run?: string;
  href?: string;
  tone?: 'muted' | 'error' | 'ok';
}

/** What the detail panel shows (design doc §5.3). */
export interface Selection {
  kind: 'node' | 'pod';
  name: string;
}

export interface Column {
  key: string;
  label: string;
}

export type CommandResult =
  | { kind: 'table'; caption: string; columns: Column[]; rows: Record<string, Cell>[] }
  /** The detail panel shows `target`; `lines` echo in the terminal. */
  | { kind: 'detail'; target: Selection; lines: Line[] }
  | { kind: 'yaml'; text: string }
  /** `stream`: the terminal reveals the lines one by one (instantly under reduced motion). */
  | { kind: 'lines'; lines: Line[]; stream?: boolean }
  /** `suggestion` is a whole command line, printed under "Did you mean this?". */
  | { kind: 'error'; message: string; suggestion?: string }
  | { kind: 'action'; action: 'clear' | 'navigate' | 'open' | 'contact'; href?: string; lines?: Line[] };

export interface CommandContext {
  /** Missing until `cluster.<hash>.json` loads (or when it failed). */
  snapshot: ClusterSnapshot | undefined;
  /** Site version and commit, known at page build time (no data needed for `version`). */
  build: { version: string; commit: string };
  /** `url('')`: the base path every internal href is joined to. */
  base: string;
  /** The clock for AGE columns. */
  now: Date;
}

export type DataContext = CommandContext & { snapshot: ClusterSnapshot };

interface CommandBase {
  /** The kubectl verb; `help` and `clear` are programs that map to verbs of the same name. */
  verb: string;
  /** On the `?run=` deep-link allowlist (design doc §5.6). */
  readOnly: boolean;
  /** Candidates for the last of `args` (positionals after the verb), unfiltered. */
  complete(args: string[], ctx: CommandContext): string[];
}

export type Command = CommandBase &
  (
    | { needsData: true; run(cmd: ParsedCommand, ctx: DataContext): CommandResult | Promise<CommandResult> }
    | {
        needsData: false;
        run(cmd: ParsedCommand, ctx: CommandContext): CommandResult | Promise<CommandResult>;
      }
  );
