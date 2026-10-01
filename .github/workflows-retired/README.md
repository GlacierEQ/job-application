# Retired workflows

GitHub Actions only runs workflows in `.github/workflows/`, so the files here are
kept for reference and do not run. They were retired on 2026-09-30 because they
verify legacy SHA-pinned release bridges (V15, V21, V25, Application Compiler
Overlay) that production no longer serves.

Also retired on 2026-09-30. Each one failed its only run on `main`, at a20c28d:

- `v13-invention-portfolio.yml` "V13 Invention Portfolio" and `v13-portfolio-depth.yml`
  "V13 Portfolio Depth": they run inside `site-v13/`, which no longer exists. Production
  serves `site-v15/`.
- `v14-canonical-home.yml` "V14 Canonical Homepage": runs `site-v14/scripts/validate.mjs`,
  and `site-v14/` no longer exists.
- `helix-effective-once.yml` "Effective Helix Projection Strike": a one-shot 2026-08-09
  job pinned to Helix `82ab13c`. It rewrites a validator and opens a PR. Its target
  assertion no longer exists (`missing_stage_count_assertion:MAPPED_ONLY`), and the
  current build refreshes Helix pins itself (`scripts/vercel-build.mjs`).
- `excellence-live-registry.yml` "Excellence Live Registry": its census reads the
  public-contract authority from `GlacierEQ/AKOS`. That repository is private, so the
  API returns 404 with the workflow token. A public repository can't run that census
  without exposing private-estate data in its logs and artifacts.

To restore one, move it back: `git mv .github/workflows-retired/<name>.yml .github/workflows/`.
