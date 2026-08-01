# Job Application — Evidence-Bound Hiring Portfolio Portal

> Gives recruiters one concentrated, inspectable path into the strongest GlacierEQ work while keeping private application operations and unsupported claims out of the public surface.

**Role:** `PUBLIC_PORTAL`  
**Visibility:** `PUBLIC`  
**Canonical branch:** `main`  
**Status:** `PARTIALLY_VERIFIED` — the manifest-driven showcase, governance reconciliation, focused tests, baseline tests, and CI truth gate passed on the July 31, 2026 synchronization change; deployment, portfolio-wide runtime, scale, performance, and child-repository behavior remain repository-native evidence questions.

## For recruiters and non-technical reviewers

`job-application` is the public front door to the GlacierEQ hiring portfolio. It does not ask a reviewer to evaluate hundreds of repositories or accept repository count as evidence. It presents a deliberately small flagship set, explains what each system demonstrates, points to inspectable proof, and names what remains unfinished.

### What this portal answers

1. **What does Casey build?** Governed AI systems, connector infrastructure, product software, automation, and evidence-bearing artifact pipelines.
2. **Where should a reviewer start?** With three flagship systems rather than the full repository estate.
3. **What is real versus unresolved?** Each flagship carries an evidence boundary and explicit gaps.
4. **How is the narrative controlled?** A checked-in manifest generates the showcase, while Job-App Helix governs inventory and evidence promotion.

### Proof in 60 seconds

| Open or run | What it proves | Current state |
|---|---|---|
| [`SHOWCASE.md`](SHOWCASE.md) | The concentrated three-flagship review path | Generated recruiter surface |
| [`portfolio_manifest.json`](portfolio_manifest.json) | Identity, visibility, proof, gaps, exclusions, and Helix governance binding | Canonical portal source |
| [`generate_showcase.py`](generate_showcase.py) | The public surface is reproducibly generated rather than maintained as freehand marketing | Verified in prior CI |
| [`test_showcase.py`](test_showcase.py) | Public/private separation, flagship concentration, governance counts, and blocked-content rules | Verified in prior CI |
| [`docs/PORTFOLIO_SYNC_2026-07-31.md`](docs/PORTFOLIO_SYNC_2026-07-31.md) | The dated reconciliation among the portal, Helix, Resume Shapeshifter, and private operations | Historical synchronization record |
| [`job-app-helix`](https://github.com/GlacierEQ/job-app-helix) | The wider portfolio inventory, rollout, proof planning, and README authority | External control plane |

### Flagship review

| System | Portfolio role | Evidence boundary |
|---|---|---|
| [Resume Shapeshifter](https://github.com/GlacierEQ/JOB-RESUME-BUILDER-) | Lead product flagship: source-grounded résumé tailoring | Source, API routes, deterministic truthfulness checks, tests, lint, build workflow, and failure behavior are inspectable; production deployment and hiring-outcome prediction are not claimed. |
| [AKOS](https://github.com/GlacierEQ/AKOS) + [pro-code](https://github.com/GlacierEQ/pro-code) | Agent authority, governance, engineering contracts, and multi-repository operating structure | Public governance and standards are inspectable; cross-repository runtime proof remains repository-native. |
| [xAI Colossus Cooling](https://github.com/GlacierEQ/xai-colossus-cooling) | Infrastructure modeling and technical architecture exhibit | Public source is reviewable; deployed xAI infrastructure, production scale, and performance are not claimed. |

### Claim boundary

This portal does **not** claim:

- that every GlacierEQ repository is original, complete, tested, or production-ready;
- that a public source repository proves deployment;
- that portfolio language count proves engineering depth;
- that child repositories inherit the portal's verification state;
- that private application tracking, contacts, outreach, or personal data are public;
- that company-specific technical exhibits establish affiliation, access, deployment, or use by that company;
- that the current public flagship set represents every project worth reviewing.

## For senior engineers and domain experts

### System boundary

**This repository owns**

- the public hiring-portfolio identity and review sequence;
- the canonical recruiter manifest;
- public/private repository presentation rules;
- deterministic generation of the showcase;
- portal-level tests for concentration, visibility, leakage, and governance synchronization;
- the public handoff into repository-native proof.

**This repository does not own**

- child-repository source correctness, builds, tests, benchmarks, or deployments;
- private application operations;
- live job openings, outreach, or application state;
- portfolio-wide proof execution;
- production hosting or operational guarantees for presented systems.

### Architecture

```text
repository-native evidence + Helix governance
                    │
                    ▼
          portfolio_manifest.json
 identity • positioning • visibility • proof • gaps • exclusions
                    │
                    ▼
             manifest validation
   exact flagships • blocked content • governance reconciliation
                    │
                    ▼
             generate_showcase.py
                    │
                    ▼
                 SHOWCASE.md
                    │
                    ├── recruiter review
                    ├── engineering handoff
                    └── links to repository-native proof
```

The manifest is the source of truth. `SHOWCASE.md` is derived output. Narrative changes belong in the manifest or generator first.

### Core engineering decisions

| Decision | Value | Cost or limitation |
|---|---|---|
| Exactly three flagship systems | concentrates reviewer attention | requires deliberate exclusion of other strong work |
| Manifest-driven showcase | makes the public narrative reproducible and testable | requires generated output to stay synchronized |
| Public/private visibility contract | prevents operational material from leaking into recruiter surfaces | requires a separate private workspace |
| Helix governance binding | prevents portal prose from outrunning the live inventory and evidence ladder | cross-repository synchronization must be maintained |
| Explicit gaps beside proof | increases trust and review efficiency | reduces the freedom to use broad promotional language |

### Correctness and failure behavior

| Condition | Required behavior | Evidence |
|---|---|---|
| flagship identity is missing or duplicated | fail validation | `generate_showcase.py`, `test_showcase.py` |
| public/private classification drifts | fail the portal truth gate | `test_showcase.py` |
| private `job-app` enters recruiter inventory | fail governance reconciliation | `test_showcase.py` |
| blocked personal, legal, credential, or tracking content appears | refuse generation or fail tests | generator and content-boundary tests |
| generated showcase is stale | regenerated output creates a Git diff | `python3 generate_showcase.py` + `git diff --exit-code` |
| child repository lacks proof | retain its unresolved boundary; do not promote it | manifest gaps and Helix policy |
| Helix inventory changes | update governance metadata and synchronization record before promotion | manifest reconciliation contract |

### Security and privacy boundary

- **Untrusted inputs:** repository descriptions, copied technical claims, external links, and AI-generated portfolio prose.
- **Private source:** `GlacierEQ/job-app` contains application operations and must remain outside the public inventory.
- **Blocked material:** personal contact data, credentials, legal or case material, private outreach, application tracking, and unsupported company affiliation.
- **External links:** public links are presentation paths, not endorsements or deployment receipts.
- **Secrets:** this repository should require no runtime secret for standard generation and tests; credentials must not be embedded in the manifest.
- **Mutation boundary:** the generator writes the derived showcase locally; it does not send applications, publish posts, or mutate external systems.

### Verification

The generator and tests use the Python standard library.

```bash
# Rebuild the public showcase from the canonical manifest
python3 generate_showcase.py

# Verify the focused recruiter-surface contract
python3 test_showcase.py

# Verify baseline repository artifacts
python3 tests/test_job_application.py

# Prove the generated surface is committed and current
python3 generate_showcase.py
git diff --exit-code -- SHOWCASE.md
```

Prior synchronization verification:

- PR head: `a4e40e3fa41af772e39b9a8051c86ac9cc9107a6`
- CI workflow: success
- Portfolio truth gate: success
- Merged as: `1ff1f6d332f41b4e14811c4614a55018c902c6dc`

The new README architecture change must pass the same repository workflows before its proof state is promoted.

### Claim ledger

| Claim | Evidence | Command or receipt | State |
|---|---|---|---|
| Showcase is generated from a manifest | `portfolio_manifest.json`, `generate_showcase.py`, `SHOWCASE.md` | `python3 generate_showcase.py` | VERIFIED at prior PR head |
| Portal rejects stale visibility and blocked content | `test_showcase.py` | CI run on prior synchronization PR | VERIFIED at prior PR head |
| Baseline identity artifacts exist | `tests/test_job_application.py` | CI run on prior synchronization PR | VERIFIED at prior PR head |
| Public flagships reconcile with Helix | manifest governance block and synchronization tests | Portfolio truth gate | VERIFIED at prior PR head |
| Portal is production deployed | provider receipt | none | UNVERIFIED |
| Child repositories build, test, or deploy | repository-native receipts | not inherited here | MIXED / repository-native |

### Change discipline

When a flagship or evidence state changes:

1. update `portfolio_manifest.json` first;
2. preserve the distinction among source, static analysis, build, test, integration, and deployment;
3. reconcile the repository with the Helix inventory and rollout policy;
4. regenerate `SHOWCASE.md`;
5. run both test surfaces;
6. confirm the generated surface has no uncommitted drift;
7. commit the manifest, derived output, tests, and synchronization record together.

### Exact contribution and provenance

- **Original:** the recruiter portal architecture, portfolio manifest, generator, tests, governance reconciliation, review sequence, and public/private boundary maintained here.
- **Adapted:** public GitHub presentation patterns and standard Markdown/JSON/Python conventions.
- **Generated:** `SHOWCASE.md` is generated from the checked-in manifest; AI-assisted prose remains subject to manifest constraints, tests, and human review.
- **External:** child repositories, GitHub hosting, Helix manifests, and public links.
- **Unresolved:** production deployment of the portal and repository-native proof for every wider portfolio project.

### Repository map

```text
.
├── README.md                    public orientation and machine entrypoint
├── SHOWCASE.md                  generated flagship review
├── RESUME.md                    long-form engineering resume
├── portfolio_manifest.json     canonical recruiter source and governance binding
├── generate_showcase.py        deterministic renderer and validator
├── test_showcase.py             focused evidence and visibility contract
├── tests/                       baseline repository checks
├── docs/                        synchronization, strategy, and supporting records
├── scripts/                     verification helpers
├── .integrity/                  file-identity inventory; not runtime proof
└── .github/workflows/           CI and portfolio truth gate
```

## For AI systems and toolchains

```yaml
schema: glaciereq.readme.v1
profile: glaciereq.readme-impact.v2.1
repository: GlacierEQ/job-application
canonical_branch: main
role: PUBLIC_PORTAL
visibility: PUBLIC
purpose: >-
  Generate and verify a concentrated recruiter-facing portfolio surface from a
  canonical manifest while preserving child-repository evidence boundaries and
  excluding private application operations.
status:
  state: PARTIALLY_VERIFIED
  verified_at: 2026-07-31
  verified_release: a4e40e3fa41af772e39b9a8051c86ac9cc9107a6
  verified_scope:
    - manifest validation and deterministic showcase generation
    - recruiter-surface concentration and blocked-content tests
    - public flagship and private-operations governance reconciliation
    - baseline identity artifact checks
  blocked_scope: []
  unverified_scope:
    - production deployment of this portal
    - portfolio-wide runtime, integration, scale, and performance
    - child-repository proof not represented by repository-native receipts
interfaces:
  inputs:
    - portfolio_manifest.json
    - RESUME.md
    - docs/PORTFOLIO_SYNC_2026-07-31.md
    - repository-native evidence paths
    - Job-App Helix inventory and rollout policy
  outputs:
    - SHOWCASE.md
    - recruiter review sequence
    - machine-readable flagship and governance metadata
  commands:
    install: no_external_runtime_dependency_for_standard_verification
    generate: python3 generate_showcase.py
    test: python3 test_showcase.py && python3 tests/test_job_application.py
    verify_generated: python3 generate_showcase.py && git diff --exit-code -- SHOWCASE.md
evidence:
  source:
    - portfolio_manifest.json
    - generate_showcase.py
  tests:
    - test_showcase.py
    - tests/test_job_application.py
  workflows:
    - .github/workflows/ci.yml
    - .github/workflows/portfolio-truth-gate.yml
  receipts:
    - github-actions://GlacierEQ/job-application/30655682701
    - github-actions://GlacierEQ/job-application/30655678577
provenance:
  original:
    - portal manifest, generator, tests, governance binding, and reviewer sequence
  adapted:
    - standard GitHub, Markdown, JSON, and Python presentation patterns
  generated:
    - SHOWCASE.md generated from portfolio_manifest.json
  external:
    - child repositories, GitHub hosting, and Helix governance records
relationships:
  - target: GlacierEQ/job-app-helix
    relation: GOVERNED_BY
    combined_value: Helix supplies the exact inventory, evidence ladder, rollout policy, README contract, and repository mesh behind the public portal.
  - target: GlacierEQ/JOB-RESUME-BUILDER-
    relation: CONSUMES
    combined_value: The portal consumes Resume Shapeshifter's repository-native product evidence as the lead public flagship without inheriting deployment claims.
  - target: GlacierEQ/AKOS
    relation: CONSUMES
    combined_value: The portal consumes AKOS governance evidence as one component of the agent-systems flagship.
  - target: GlacierEQ/pro-code
    relation: CONSUMES
    combined_value: The portal consumes pro-code engineering-contract evidence alongside AKOS without collapsing their repository boundaries.
  - target: GlacierEQ/xai-colossus-cooling
    relation: CONSUMES
    combined_value: The portal consumes the infrastructure exhibit's public source and stated limitations as a bounded technical showcase.
adjacent_links:
  - target: GlacierEQ/job-app
    human_relation: PRIVATE_OPERATIONAL_CONTINUATION
    purpose: Private application tracking, contacts, outreach, and target-specific materials remain outside the public recruiter inventory.
limits:
  - portal verification is not child-repository verification
  - source presence and build files are not deployment proof
  - public links do not imply company affiliation or use
  - private application operations are deliberately excluded
```

## Portfolio mesh

```text
                         ┌──────────────────────────┐
                         │      job-app-helix       │
                         │ inventory • policy      │
                         │ verification • receipts │
                         └────────────┬─────────────┘
                                      │ governs
                                      ▼
┌────────────────────────────────────────────────────────────┐
│                    job-application                         │
│ manifest → validation → generated showcase → review path  │
└───────────┬──────────────────┬──────────────────┬───────────┘
            │ consumes         │ consumes         │ consumes
            ▼                  ▼                  ▼
  JOB-RESUME-BUILDER-      AKOS + pro-code   xai-colossus-cooling
  product flagship        governance mesh    systems exhibit

            private operational continuation
                              │
                              ▼
                           job-app
```

The portal is successful when a reviewer understands the work quickly, an engineer reaches proof without hunting, and a machine enters through stable data without promoting prose beyond evidence.
