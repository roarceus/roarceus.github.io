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
  /**
   * `contact` is the manifest form (`apply -f contact.yaml`); its name is `metadata.name`. `component` is a
   * control plane static pod, `certificate` and `achievement` use their ids, and `home` is the scene's home
   * view (design doc stage-4 §5).
   */
  kind: 'node' | 'pod' | 'contact' | 'component' | 'certificate' | 'achievement' | 'home';
  name: string;
}

export interface Column {
  key: string;
  label: string;
}

export type CommandResult =
  /**
   * `warning` prints above the table (kubectl's stderr line); `filter` is a skill label selector the
   * scene lights up (`get pods -l skill=go`).
   */
  | {
      kind: 'table';
      caption: string;
      columns: Column[];
      rows: Record<string, Cell>[];
      warning?: string;
      filter?: { skill: string };
    }
  /** The detail panel shows `target`; `lines` echo in the terminal. */
  | { kind: 'detail'; target: Selection; lines: Line[] }
  | { kind: 'yaml'; text: string }
  /** `stream`: the terminal reveals the lines one by one (instantly under reduced motion). */
  | { kind: 'lines'; lines: Line[]; stream?: boolean }
  /** `suggestion` is a whole command line, printed under "Did you mean this?". */
  | { kind: 'error'; message: string; suggestion?: string }
  | { kind: 'action'; action: 'clear' | 'navigate' | 'open'; href?: string; lines?: Line[] };

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
  /** Candidates for the last of `args` (positionals after the verb), unfiltered; `namespace` is `-n`. */
  complete(args: string[], ctx: CommandContext, namespace?: string): string[];
}

export type Command = CommandBase &
  (
    | { needsData: true; run(cmd: ParsedCommand, ctx: DataContext): CommandResult | Promise<CommandResult> }
    | {
        needsData: false;
        run(cmd: ParsedCommand, ctx: CommandContext): CommandResult | Promise<CommandResult>;
      }
  );
