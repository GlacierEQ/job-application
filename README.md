# Job Application — Evidence-Bound Portfolio Portal

> A recruiter-facing front door that turns a curated engineering manifest into an inspectable showcase, a durable resume entrypoint, and a machine-readable map into the wider GlacierEQ system.

`job-application` is not a pile of application files and it is not a repository-count advertisement. It is the public presentation layer for a hiring portfolio: three flagship systems, the proof each one exposes, the boundaries each one still carries, and the control plane that keeps those statements synchronized with the underlying repositories.

**Current posture:** `HARDENING` — the portal, generator, tests, and public repository links are present; runtime, deployment, scale, and performance remain repository-native claims that require their own receipts.

## The portfolio front door

A hiring reviewer should be able to answer four questions quickly:

1. **What does Casey build?** AI operating systems, connector infrastructure, governed automation, and verifiable artifact pipelines.
2. **Where is the strongest proof?** In a deliberately small set of public flagship repositories with explicit evidence paths.
3. **What is verified versus unfinished?** Every flagship separates inspectable proof from current gaps.
4. **How does the work connect?** `job-app-helix` supplies the inventory, verification, README, and repository-mesh control plane.

### Proof in three minutes

| Open | What it gives you |
|---|---|
| [`SHOWCASE.md`](SHOWCASE.md) | The concentrated recruiter review: three flagships, evidence paths, gaps, and review sequence. |
| [`RESUME.md`](RESUME.md) | The long-form engineering resume and portfolio narrative. |
| [`portfolio_manifest.json`](portfolio_manifest.json) | The source of truth used to generate the public showcase. |
| [`generate_showcase.py`](generate_showcase.py) | The deterministic standard-library generator for the recruiter surface. |
| [`test_showcase.py`](test_showcase.py) | Guards against stale visibility, unsupported hype, legal/case leakage, and broken portfolio structure. |
| [`job-app-helix`](https://github.com/GlacierEQ/job-app-helix) | The evidence and governance control plane behind the wider portfolio. |

### Flagship signal

| System | Role in the portfolio | Public evidence boundary |
|---|---|---|
| [Resume Shapeshifter](https://github.com/GlacierEQ/JOB-RESUME-BUILDER-) | Product engineering and truth-constrained resume transformation | Source, API routes, truthfulness logic, and tests are inspectable; production deployment is not claimed here. |
| [AKOS](https://github.com/GlacierEQ/AKOS) + [pro-code](https://github.com/GlacierEQ/pro-code) | Agent governance, engineering contracts, and multi-repository operating structure | Public governance and standards surfaces are inspectable; cross-repository runtime proof remains repository-native. |
| [xAI Colossus Cooling](https://github.com/GlacierEQ/xai-colossus-cooling) | Infrastructure modeling, technical research, and architecture communication | Public source is reviewable; deployed xAI infrastructure, production scale, and performance are not claimed. |

## How the portal stays honest

The public surface is generated from a checked-in manifest instead of being maintained as freehand marketing copy.

```text
portfolio_manifest.json
        │
        ▼
manifest validation
identity • visibility • status • evidence • gaps
        │
        ▼
generate_showcase.py
        │
        ▼
SHOWCASE.md
        │
        ├── test_showcase.py
        ├── tests/test_job_application.py
        └── reusable GitHub Actions CI
```

The contract is intentionally strict:

- exactly three flagship systems;
- at least one directly inspectable public flagship;
- every flagship declares what it demonstrates, where the evidence lives, what is verified, and what remains unresolved;
- public repositories render as direct links;
- private repositories, if introduced later, render as labeled references rather than implied public proof;
- sensitive personal, legal, contact, credential, and application-tracking material is blocked from the recruiter manifest;
- generated output must be reproducible from the checked-in source.

## Engineering anatomy

| Component | Responsibility | Failure behavior |
|---|---|---|
| [`portfolio_manifest.json`](portfolio_manifest.json) | Canonical identity, positioning, flagship inventory, visibility, proof, gaps, and exclusions | Missing fields, duplicate IDs, unsupported states, or unsafe content fail validation. |
| [`generate_showcase.py`](generate_showcase.py) | Validates the manifest and renders the human-facing portfolio surface | Refuses to generate when the manifest is invalid or blocked content is detected. |
| [`SHOWCASE.md`](SHOWCASE.md) | Generated recruiter and engineering review path | Treated as derived output; changes belong in the manifest or generator first. |
| [`test_showcase.py`](test_showcase.py) | Contract, visibility, public-link, concentration, and content-boundary tests | A stale private/public classification or leaked blocked term fails the suite. |
| [`tests/test_job_application.py`](tests/test_job_application.py) | Baseline artifact and manifest sanity checks | Missing resume/manifest or wrong owner identity fails the suite. |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | Delegates Python verification to the shared GlacierEQ reusable CI workflow | Pull requests and pushes do not receive a clean verification path when the reusable job fails. |
| [`.integrity/file_hashes.json`](.integrity/file_hashes.json) | Checked-in integrity inventory for repository artifacts | Hash inventory is evidence of file identity, not runtime or deployment proof. |

### Run the evidence loop

The generator and tests use the Python standard library.

```bash
# Rebuild the public showcase from its source manifest
python3 generate_showcase.py

# Verify the focused showcase contract
python3 test_showcase.py

# Verify baseline repository artifacts
python3 tests/test_job_application.py

# Confirm the generated surface is committed and current
python3 generate_showcase.py
git diff --exit-code -- SHOWCASE.md
```

A successful generator run proves that the checked-in manifest satisfies this portal's contract and can reproduce `SHOWCASE.md`. It does **not** prove that every connected repository builds, deploys, or performs correctly. Those are separate evidence levels governed by each repository and coordinated by Job-App Helix.

### Change discipline

When a flagship changes state:

1. update `portfolio_manifest.json` first;
2. preserve the distinction between inspectable source, executable proof, deployment proof, and unresolved scope;
3. regenerate `SHOWCASE.md`;
4. run both test surfaces;
5. commit the manifest, generator changes when necessary, generated output, and tests together.

This keeps the public narrative downstream from evidence rather than allowing the narrative to become its own source of truth.

## Machine entrypoint

AI systems should begin with `portfolio_manifest.json`, not scrape prose from the README and infer portfolio truth.

```yaml
contract: glaciereq.job-application.portal.v1
repository: GlacierEQ/job-application
canonical_branch: main
role: public_portfolio_entrypoint
state: HARDENING

inputs:
  - portfolio_manifest.json
  - RESUME.md
  - repository-native evidence paths

transforms:
  - command: python3 generate_showcase.py
    output: SHOWCASE.md
  - command: python3 test_showcase.py
    output: pass_or_fail_contract_result

invariants:
  - exactly_three_flagships
  - every_flagship_has_evidence_and_gaps
  - public_visibility_matches_public_link_behavior
  - private_repositories_are_never_implied_public
  - recruiter_manifest_excludes_sensitive_operational_material
  - generated_showcase_is_reproducible
  - repository_source_is_not_deployment_proof

outputs:
  human:
    - SHOWCASE.md
    - RESUME.md
  machine:
    - portfolio_manifest.json
    - .integrity/file_hashes.json

relationships:
  - target: GlacierEQ/job-app-helix
    relation: GOVERNED_BY
    purpose: exact inventory, verification planning, README contracts, typed mesh, and evidence receipts
  - target: GlacierEQ/JOB-RESUME-BUILDER-
    relation: PRESENTS
    purpose: public product proof for truth-constrained resume transformation
  - target: GlacierEQ/AKOS
    relation: PRESENTS
    purpose: agent authority, governance, topology, and completion semantics
  - target: GlacierEQ/pro-code
    relation: PRESENTS
    purpose: reusable engineering standards and control-surface patterns
  - target: GlacierEQ/xai-colossus-cooling
    relation: PRESENTS
    purpose: infrastructure modeling and technical architecture exhibit
  - target: GlacierEQ/job-app
    relation: EXCLUDES_FROM_PUBLIC_SURFACE
    purpose: private application operations, contacts, outreach, and tracking
```

## Repository mesh

```text
                         ┌──────────────────────────┐
                         │      job-app-helix       │
                         │ governance • inventory  │
                         │ verification • receipts │
                         └────────────┬─────────────┘
                                      │ governs
                                      ▼
┌────────────────────────────────────────────────────────────┐
│                    job-application                         │
│ manifest → validation → generated showcase → resume entry │
└───────────┬──────────────────┬──────────────────┬───────────┘
            │ presents         │ presents         │ presents
            ▼                  ▼                  ▼
  JOB-RESUME-BUILDER-      AKOS + pro-code   xai-colossus-cooling
  product behavior        governance mesh    systems exhibit

            private operational continuation
                              │
                              ▼
                           job-app
```

### Curated library

- **Evidence governance:** [job-app-helix](https://github.com/GlacierEQ/job-app-helix)
- **Agent operating system:** [AKOS](https://github.com/GlacierEQ/AKOS)
- **Engineering contracts:** [pro-code](https://github.com/GlacierEQ/pro-code)
- **Public product proof:** [JOB-RESUME-BUILDER-](https://github.com/GlacierEQ/JOB-RESUME-BUILDER-)
- **Infrastructure exhibit:** [xai-colossus-cooling](https://github.com/GlacierEQ/xai-colossus-cooling)

## Repository map

```text
.
├── README.md                    public orientation and machine entrypoint
├── SHOWCASE.md                  generated flagship review
├── RESUME.md                    long-form resume
├── portfolio_manifest.json     canonical recruiter-facing source data
├── generate_showcase.py        deterministic renderer and validator
├── test_showcase.py             focused evidence-bound contract tests
├── tests/                       baseline repository tests
├── docs/                        application strategy, outreach, and technical exhibits
├── scripts/                     verification helpers
├── .integrity/                  file-integrity inventory and watchdog tooling
└── .github/workflows/           reusable CI entrypoint
```

The portal is successful when a reviewer can understand the work quickly, an engineer can inspect the proof without hunting, and an AI system can enter through stable data rather than reverse-engineering marketing prose.
