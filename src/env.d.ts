interface ImportMetaEnv {
  /** Release version injected by CI (e.g. "0.1.0" or "v0.1.0"). */
  readonly PUBLIC_VERSION?: string;
  /** Full commit SHA injected by CI. */
  readonly PUBLIC_COMMIT_SHA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
