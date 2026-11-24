/**
 * Finds hardcoded root-relative paths ("/plain/") that would break under a PR preview base path
 * (SPEC §2). Internal paths must go through url() from @/lib/utils/url instead, written without a
 * leading slash: url('plain/'). Protocol-relative URLs ("//cdn...") are external and allowed.
 */
export interface RootPathHit {
  /** 1-based line number. */
  line: number;
  /** The matched text, ending at the offending slash. */
  text: string;
}

const ROOT = String.raw`\/(?!\/)`;
const QUOTE = String.raw`["'\x60]`;

const PATTERNS: RegExp[] = [
  // Attributes: href="/x", src='/x', href={'/x'}, href={`/x`}
  new RegExp(String.raw`\b(?:href|src|srcset|action|formaction|poster)\s*=\s*\{?\s*${QUOTE}${ROOT}`, 'g'),
  // fetch('/x')
  new RegExp(String.raw`\bfetch\(\s*${QUOTE}${ROOT}`, 'g'),
  // CSS url(/x), url('/x'), and url('/x') calls in code (pass 'x' to url() instead)
  new RegExp(String.raw`\burl\(\s*${QUOTE}?${ROOT}`, 'g'),
  // Astro.redirect('/x')
  new RegExp(String.raw`\.redirect\(\s*${QUOTE}${ROOT}`, 'g'),
];

export function findRootPaths(source: string): RootPathHit[] {
  const hits: RootPathHit[] = [];
  source.split(/\r?\n/).forEach((lineText, index) => {
    for (const pattern of PATTERNS) {
      for (const match of lineText.matchAll(pattern)) {
        hits.push({ line: index + 1, text: match[0] });
      }
    }
  });
  return hits;
}
