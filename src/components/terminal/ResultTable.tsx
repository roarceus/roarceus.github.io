import type { CommandResult } from '@/lib/commands/types';

import { RunLink } from './RunLink';

type Table = Extract<CommandResult, { kind: 'table' }>;

/**
 * kubectl table output: uppercase headers, columns sized to their content with kubectl's spacing, no
 * truncation. Wide tables scroll inside the terminal output, never the page.
 */
export function ResultTable({ result, base }: { result: Table; base: string }) {
  return (
    <table className="w-auto border-collapse self-start font-mono text-sm tabular-nums">
      <caption className="sr-only">{result.caption}</caption>
      <thead className="text-text-muted">
        <tr>
          {result.columns.map(({ key, label }) => (
            <th key={key} scope="col" className="pr-[3ch] text-left font-normal whitespace-nowrap last:pr-0">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-text">
        {result.rows.map((row, i) => (
          <tr key={i}>
            {result.columns.map(({ key }) => {
              const cell = row[key] ?? '';
              return (
                <td key={key} className="pr-[3ch] align-top whitespace-nowrap last:pr-0">
                  {typeof cell === 'string' ? (
                    cell
                  ) : cell.run !== undefined ? (
                    <RunLink run={cell.run} base={base} source="link">
                      {cell.text}
                    </RunLink>
                  ) : cell.href !== undefined ? (
                    <a href={cell.href} className="link">
                      {cell.text}
                    </a>
                  ) : (
                    cell.text
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
