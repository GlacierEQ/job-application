# Retired workflows

GitHub Actions only runs workflows in `.github/workflows/`, so the files here are
kept for reference and do not run. They were retired on 2026-09-30 because they
verify legacy SHA-pinned release bridges (V15, V21, V25, Application Compiler
Overlay) that production no longer serves.

To restore one, move it back: `git mv .github/workflows-retired/<name>.yml .github/workflows/`.
