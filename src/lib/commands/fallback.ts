import { parse } from '@/lib/parser/parse';
import { joinBase } from '@/lib/utils/url';

import { splitTypeName } from './format';

/**
 * Where a clickable command links without JavaScript (design doc stage-3 §5.4): chips, table names, and
 * suggestions stay real links to the plain view, and the island runs the command instead.
 */

const SECTIONS: Record<string, string> = {
  experience: 'plain/#experience',
  nodes: 'plain/#experience',
  node: 'plain/#experience',
  no: 'plain/#experience',
  pods: 'plain/#projects',
  pod: 'plain/#projects',
  po: 'plain/#projects',
  projects: 'plain/#projects',
  skills: 'plain/#skills',
  certificates: 'plain/#certifications',
  achievements: 'plain/#awards',
  events: 'updates/',
  updates: 'updates/',
};

function pathFor(run: string): string {
  const parsed = parse(run);
  if (!parsed.ok) return 'plain/';
  const { verb, args } = parsed.command;
  if (verb === 'apply') return 'plain/#contact';
  const [type = '', name] = splitTypeName(args);
  if (verb === 'describe' && (type === 'pod' || type === 'pods' || type === 'po') && name) {
    return `projects/${name}/`;
  }
  return SECTIONS[type.toLowerCase()] ?? 'plain/';
}

/** The plain-view URL for a command line, under `base`. */
export const plainHref = (run: string, base: string): string => joinBase(base, pathFor(run));
