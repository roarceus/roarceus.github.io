import { useId, useState, type KeyboardEvent } from 'react';

import { focusRing } from '@/components/ui/recipes';
import { completions } from '@/lib/commands/run';
import type { CommandContext } from '@/lib/commands/types';
import { clearTerminal, echoCancel, runCommand } from '@/lib/state/run';
import { $snapshot } from '@/lib/state/snapshot-loader';
import { $terminal } from '@/lib/state/terminal';

/**
 * The prompt (design doc stage-3 §5.4): a real labeled input. Enter runs, Up/Down walk history, Tab
 * completes (a second Tab lists the options), Ctrl+L clears, Ctrl+C cancels the line. Tab is only taken
 * while it completes something, and Shift+Tab never, so keyboard focus can always leave.
 */

interface Props {
  build: CommandContext['build'];
  base: string;
}

function commonPrefix(lines: string[]): string {
  const [first = '', ...rest] = lines;
  let end = first.length;
  for (const line of rest) {
    while (end > 0 && line.slice(0, end).toLowerCase() !== first.slice(0, end).toLowerCase()) end--;
  }
  return first.slice(0, end);
}

const lastWord = (line: string) => line.trim().split(/\s+/).at(-1) ?? '';

export function TerminalInput({ build, base }: Props) {
  const id = useId();
  const [value, setValue] = useState('');
  /** Position while walking history; undefined at the live line. */
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  /** Tab presses in a row on the same line: 1 completes the common part, 2 lists the options. */
  const [tabs, setTabs] = useState(0);
  const [options, setOptions] = useState<string[]>([]);

  const edit = (next: string) => {
    setValue(next);
    setTabs(0);
    setOptions([]);
  };

  function complete(event: KeyboardEvent<HTMLInputElement>) {
    if (value.trim() === '' || tabs >= 2) return;
    const ctx: CommandContext = { snapshot: $snapshot.get().data, build, base, now: new Date() };
    const matches = completions(value, ctx);
    if (matches.length === 0) return;
    event.preventDefault();
    if (matches.length === 1) {
      edit(`${matches[0] ?? value} `);
      return;
    }
    const prefix = commonPrefix(matches);
    if (prefix.length > value.length) {
      edit(prefix);
      return;
    }
    // Nothing more to complete: the first Tab waits (as bash does), the second lists the options.
    if (tabs === 1) setOptions(matches.map(lastWord));
    setTabs(tabs + 1);
  }

  function walk(step: -1 | 1) {
    const { history } = $terminal.get();
    if (history.length === 0) return;
    if (cursor === undefined) {
      if (step === 1) return;
      setCursor(history.length - 1);
      edit(history.at(-1) ?? '');
      return;
    }
    const next = cursor + step;
    if (next >= history.length) {
      setCursor(undefined);
      edit('');
      return;
    }
    const clamped = Math.max(0, next);
    setCursor(clamped);
    edit(history[clamped] ?? '');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const { key, ctrlKey, metaKey, altKey, shiftKey } = event;
    if (key === 'Tab' && !shiftKey && !ctrlKey && !metaKey && !altKey) {
      complete(event);
      return;
    }
    if (key === 'Enter') {
      event.preventDefault();
      const line = value;
      setCursor(undefined);
      edit('');
      void runCommand(line, 'input');
    } else if (key === 'ArrowUp' || key === 'ArrowDown') {
      event.preventDefault();
      walk(key === 'ArrowUp' ? -1 : 1);
    } else if (ctrlKey && key.toLowerCase() === 'l') {
      event.preventDefault();
      clearTerminal();
    } else if (ctrlKey && key.toLowerCase() === 'c') {
      const input = event.currentTarget;
      if (input.selectionStart !== input.selectionEnd) return;
      event.preventDefault();
      echoCancel(value);
      setCursor(undefined);
      edit('');
    } else if (key === 'Escape') {
      setOptions([]);
    }
  }

  return (
    // The hint takes no space while empty, so hydrating the input fits the box the server reserved.
    <div className="flex flex-col">
      <div className="flex items-center gap-2 font-mono text-sm">
        <label htmlFor={id} className="sr-only">
          Command
        </label>
        <span aria-hidden="true" className="text-accent-soft">
          $
        </span>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(event) => {
            edit(event.target.value);
          }}
          onKeyDown={onKeyDown}
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={200}
          className={`min-h-11 min-w-0 flex-1 rounded-md border border-border-strong bg-surface-1 px-2 text-text placeholder:text-text-muted ${focusRing}`}
          placeholder="kubectl get pods -n projects"
        />
      </div>
      <p id={`${id}-hint`} className="mt-1 font-mono text-xs text-text-muted empty:mt-0" aria-live="polite">
        {options.length > 0 ? options.join(' ') : ''}
      </p>
    </div>
  );
}
