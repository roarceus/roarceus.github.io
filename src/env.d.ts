/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Release version injected by CI (e.g. "0.1.0" or "v0.1.0"). */
  readonly PUBLIC_VERSION?: string;
  /** Full commit SHA injected by CI. */
  readonly PUBLIC_COMMIT_SHA?: string;
  /** Comma-separated feature flags to turn on in non-production builds (src/config/features.ts). */
  readonly PUBLIC_ENABLED_FLAGS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
