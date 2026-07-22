# Changesets

Release flow for `rsc-observer` (the only published package — `apps/*` are
private and ignored).

- In any PR that should ship, run `pnpm changeset` and pick the bump +
  write a summary. Commit the generated file here.
- On merge to `main`, the release workflow opens/updates a
  **Version Packages** PR that applies all pending changesets
  (version bump + CHANGELOG).
- Merging that PR publishes to npm via **trusted publishing (OIDC)** —
  there is no npm token anywhere; the workflow authenticates per-run and
  npm attaches provenance automatically.

Docs: https://github.com/changesets/changesets
