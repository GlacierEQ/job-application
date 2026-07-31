# Portfolio Orchestration Contract

`job-application` is the **public recruiter and hiring-review surface** for the GlacierEQ engineering portfolio. It does not own repository governance, cross-repository execution, or proof promotion. Those responsibilities belong to [`GlacierEQ/job-app-helix`](https://github.com/GlacierEQ/job-app-helix).

Its responsibility is narrower and testable: publish a concentrated, accessible account of the strongest systems while preserving the evidence state, current gaps, and repository-native proof boundary of every claim.

## Operating law

> Make the portfolio say what the repositories prove, and make every published claim point back to the proof that supports it.

A portfolio statement is publishable only when its identity, evidence path, access state, verification state, and known limits are explicit.

## Source and projection boundary

| Surface | Authority |
|---|---|
| `portfolio_manifest.json` | Canonical recruiter-facing selection and claim metadata. |
| `generate_showcase.py` | Deterministic rendering logic. |
| `SHOWCASE.md` | Generated public projection; never the source of truth. |
| `test_showcase.py` and `tests/` | Local truth, safety, concentration, and artifact checks. |
| `job-app-helix` | Exact portfolio inventory, rollout waves, verification receipts, and consolidation authority. |
| Child repositories | Native build, test, integration, deployment, and performance evidence. |

```text
child repository evidence
          │
          ▼
Job-App Helix inventory + verification receipt
          │
          ▼
portfolio_manifest.json
          │
          ▼
generate_showcase.py
          │
          ▼
SHOWCASE.md
          │
          ├── contract tests
          ├── drift rejection
          └── human release review
```

## Evidence vocabulary

- **Verified** — directly supported by inspectable code, tests, artifacts, or reproducible measurements.
- **Measured** — supported by a repeatable run with inputs, environment, and method recorded.
- **Illustrative** — an example, simulation, or design exercise; not a production result.
- **Planned** — intended work that has not been implemented.
- **Blocked** — implementation or proof exists but a named dependency, service, toolchain, permission, or hardware boundary prevents promotion.
- **Unknown** — not established and never smoothed into an accomplishment.

Source availability is not deployment proof. A passing repository-local test is not production-scale evidence. A declared relationship is not a connected integration.

## Recruiter-surface release gate

Every public update must pass:

1. **Identity** — repository, owner, and role are unambiguous.
2. **Truthfulness** — each material claim has an evidence path and evidence state.
3. **Access** — linked public proof is accessible without privileged context.
4. **Reproducibility** — generated output matches the checked-in manifest and renderer.
5. **Safety** — no credentials, private contacts, legal records, application tracking, or machine-local paths.
6. **Concentration** — the first review path remains focused enough to inspect.
7. **Native proof** — build, test, benchmark, integration, and deployment claims remain owned by the repository that produced the receipt.
8. **Human release authority** — visibility changes, submissions, and strategic positioning remain operator-controlled.

## Branch lifecycle

A branch is a temporary work surface, not a second source of truth.

```text
DISCOVER
  → COMPARE WITH MAIN
  → PRESERVE UNIQUE VALUE
  → VERIFY
  → MERGE OR CLOSE
  → RETIRE REMOTE REF
  → RECORD DISPOSITION
```

Rules:

- `main` is the canonical public state.
- A merged or fully superseded branch must not remain an active workstream.
- Unique useful files are transplanted onto current `main` ancestry before an obsolete pull request is closed.
- Diverged branches are compared by content and purpose, not commit count alone; squash merges can make ancestry misleading.
- Closing a pull request and deleting a branch ref are distinct events and must not be reported as the same action.
- No branch is retired merely because it is old; it is retired because its useful work is merged, preserved elsewhere, or explicitly rejected.

## Verification

```bash
python -m json.tool portfolio_manifest.json >/dev/null
python scripts/runner_verify.py
python tests/test_job_application.py
```

The dedicated portfolio truth gate runs the same contract on relevant pushes and pull requests with read-only repository permissions and non-persistent checkout credentials.

## Relationship to the wider library

`job-application` is the front door. `job-app-helix` is the portfolio execution and audit control plane. The Tower of Babel governs technology placement and proof fit. AKOS governs identity, authority, evidence, persistence, and completion semantics. Individual projects remain responsible for their own executable truth.
