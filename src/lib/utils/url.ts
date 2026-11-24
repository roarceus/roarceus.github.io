/**
 * Base-path helpers. Every internal link, asset, and fetch goes through `url()` so the site works
 * both at the root (production) and under `/pr-preview/pr-<N>/` (PR previews). See SPEC §2.
 */

// A scheme ("https:", "mailto:", "javascript:") or a protocol-relative "//host" prefix.
const ABSOLUTE_URL = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

/**
 * Joins a base path and an internal path with exactly one slash between segments.
 * Duplicate slashes are collapsed in the path only; the query string and hash are kept as is.
 *
 * @throws {TypeError} if `path` is an absolute or protocol-relative URL.
 */
export function joinBase(base: string, path = ''): string {
  if (ABSOLUTE_URL.test(path)) {
    throw new TypeError(`url() only accepts internal paths, got "${path}"`);
  }

  const prefix = `/${base}/`.replace(/\/{2,}/g, '/');
  const relative = path.replace(/^\/+/, '');

  const suffixStart = relative.search(/[?#]/);
  const pathname = suffixStart === -1 ? relative : relative.slice(0, suffixStart);
  const suffix = suffixStart === -1 ? '' : relative.slice(suffixStart);

  return prefix + pathname.replace(/\/{2,}/g, '/') + suffix;
}

/** Prefixes an internal path with the site's base path (`import.meta.env.BASE_URL`). */
export function url(path = ''): string {
  return joinBase(import.meta.env.BASE_URL, path);
}
