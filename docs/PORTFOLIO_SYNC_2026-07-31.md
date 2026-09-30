# Portfolio Synchronization Record — July 31, 2026

## Outcome

The public job-application portal, Job-App Helix, and Resume Shapeshifter now describe the same repository relationships and evidence boundaries.

The live Helix inventory contains:

- one control-plane root: `job-app-helix`;
- sixty-six public portfolio children;
- sixty-seven total governed repositories.

`JOB-RESUME-BUILDER-` is now a named child of the live inventory and a member of `wave-3-technical-exhibits`. This closes the prior mismatch in which `job-application` presented Resume Shapeshifter as its lead product flagship while Helix did not govern that repository.

## Canonical roles

| Repository | Visibility | Canonical role | Public-inventory decision |
|---|---|---|---|
| `job-application` | Public | Recruiter-facing portal, manifest, generated showcase, and resume entrypoint | Included |
| `job-app-helix` | Public | Exact inventory, rollout, proof planning, receipts, and repository mesh | Root |
| `JOB-RESUME-BUILDER-` | Public | Resume Shapeshifter product implementation and repository-native evidence | Included; Wave 3 |
| `AKOS` | Public | Agent authority, governance, and completion semantics flagship | Included |
| `pro-code` | Public | Engineering standards and reusable control-surface patterns flagship | Included |
| `xai-colossus-cooling` | Public | Infrastructure modeling and technical architecture flagship | Included |
| `job-app` | Private | Applications, contacts, outreach, and status tracking | Intentionally excluded from public recruiter inventory |

## Evidence boundaries

### Established by repository inspection

- `job-application` declares exactly three public flagship systems and generates `SHOWCASE.md` from `portfolio_manifest.json`.
- Resume Shapeshifter exposes Next.js and TypeScript source, API routes, a deterministic truthfulness boundary, a Node test suite, a package lock, and a GitHub verification workflow.
- Helix validates an exact inventory partition and rejects missing, duplicated, or unexpected repository declarations.
- The public portal explicitly excludes sensitive personal, operational, credential, and application-tracking material.

### Not established by this synchronization

- portfolio-wide runtime success;
- production deployment of Resume Shapeshifter;
- calibrated applicant-tracking or hiring outcomes;
- document export, persistence, privacy operations, rate limiting, observability, or abuse protection;
- functional completeness of every repository found in the wider GitHub account;
- equivalence or safe deletion of diverged non-main branches;
- synchronization of uncommitted or local-only work on Casey's Mac.

## Historical audit treatment

The July 29 evidence audit and related 66-repository artifacts remain historical snapshots of their original boundary. They are not rewritten to imply that Resume Shapeshifter was included when those receipts were produced.

The live inventory, current README, execution program, recruiter summary, and candidate surface use the new 67-repository total. Historical documents remain labeled as historical where surfaced from current entrypoints.

## Wider GitHub curation

The July 31 GitHub sweep produced one immediate admission: `JOB-RESUME-BUILDER-`.

Other recently active or potentially original repositories are deferred until repository-native review establishes provenance, differentiated value, tests, relationship to existing systems, and whether they duplicate a stronger canonical project. Near-name pairs such as `grokadile`/`grokodile` and `xai-colossal-cooling`/`xai-colossus-cooling` require explicit successor or consolidation decisions before recruiter promotion.

Private personal/legal systems, backups, archives, and large upstream-shaped repositories remain outside the public recruiter boundary unless a later review identifies a distinct, evidence-backed GlacierEQ contribution.

## Branch state

Both anchor repositories contain diverged non-main branches without open pull requests. Several branches appear to contain work that was squash- or cherry-pick-integrated into `main`, so commit ancestry alone is insufficient to prove they are obsolete.

This synchronization does not delete those branches. Branch retirement requires either:

1. tree equivalence to a canonical commit; or
2. a recorded extraction of all unique value followed by an explicit obsolete/successor receipt.

## Local synchronization limitation

The connected Desktop Commander device was offline during this work. GitHub remote branches and files were inspected and updated, but Casey's local Mac worktrees, uncommitted changes, and local-only branches were not available. No claim is made that the Mac has pulled these changes or that all local work has been pushed.

## Verification commands

### Job application portal

```bash
python3 generate_showcase.py
python3 test_showcase.py
python3 tests/test_job_application.py
python3 generate_showcase.py
git diff --exit-code -- SHOWCASE.md
```

### Job-App Helix

```bash
python -m pip install -e ".[dev]"
python -m ruff check src tests scripts ci_audit_portfolio.py showcase/demo_15min_run.py
python -m mypy src/job_app_helix/
python -m pytest -q
python scripts/check_proto_contract.py
python scripts/check_public_surface.py
job-app-helix-portfolio validate
```

### Resume Shapeshifter

```bash
npm ci
npm test
npm run lint
npm run build
```

## Definition of synchronized

This record is complete when the three change branches receive repository-native green checks and are merged to their canonical branches. The final merge SHAs and check results belong in the corresponding GitHub pull requests and commit histories; no green result is inferred before those checks complete.