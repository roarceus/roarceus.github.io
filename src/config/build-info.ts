import pkg from '../../package.json';

export interface BuildInfo {
  /** SemVer without a leading "v", e.g. "0.1.0". */
  version: string;
  /** Full commit SHA, or "dev" for local builds. */
  commit: string;
  /** First 7 characters of the commit, or "dev". */
  shortCommit: string;
}

interface BuildEnv {
  PUBLIC_VERSION?: string | undefined;
  PUBLIC_COMMIT_SHA?: string | undefined;
}

/** Trims a value and treats empty or whitespace-only strings as missing. */
function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

/** Resolves build metadata from CI-injected env vars, falling back to package.json for local builds. */
export function resolveBuildInfo(env: BuildEnv, fallbackVersion: string): BuildInfo {
  const version = nonEmpty(env.PUBLIC_VERSION)?.replace(/^v/, '') ?? fallbackVersion;
  const commit = nonEmpty(env.PUBLIC_COMMIT_SHA) ?? 'dev';
  return { version, commit, shortCommit: commit.slice(0, 7) };
}

export const buildInfo: BuildInfo = resolveBuildInfo(import.meta.env, pkg.version);
