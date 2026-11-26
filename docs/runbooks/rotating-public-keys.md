# Runbook: rotating keys

## release-please GitHub App private key (in use now)

The `release` workflow authenticates as the `roarceus-release-bot` GitHub App with
`vars.RELEASE_APP_ID` and `secrets.RELEASE_APP_PRIVATE_KEY`. Rotate it if it may have leaked, or yearly.

1. GitHub → Settings → Developer settings → GitHub Apps → `roarceus-release-bot` → **Generate a private
   key** (downloads a `.pem`).
2. Store it (PowerShell):
   `Get-Content "$HOME\Downloads\<new-key>.pem" -Raw | gh secret set RELEASE_APP_PRIVATE_KEY -R roarceus/roarceus.github.io`
3. Verify: push any change to `main` (or re-run the last **Release** run). `release-please` must succeed.
4. Back on the App page, **delete the old key**, then delete the `.pem` file from your machine.

The App ID doesn't change. If the App itself is replaced, update `vars.RELEASE_APP_ID` too.

## Public site keys

The Web3Forms access key (contact form, `site.contact.accessKey` in `src/config/site.ts`) is **public**
by design: it only lets a page send messages to Sohan's inbox. GoatCounter (analytics) joins it in
Stage 6. Keys live in `src/config/`, never in components. Rotating one:

1. Create the new key in the provider's dashboard.
2. Update it in `src/config/site.ts` in a `fix(config): rotate <provider> key` PR; check the preview
   (form submits, analytics event appears).
3. Merge and release, then revoke the old key in the provider's dashboard.

If a provider's endpoint or domain changes, update `cspDirectives()` in `src/lib/seo/csp.ts` in the
same PR (ADR 0004); CI's CSP audit fails until it matches.
