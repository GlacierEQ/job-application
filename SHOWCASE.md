# GlacierEQ — Engineering Portfolio

> **Ship capabilities, not prompt piles.**

Systems architect and full-stack engineer building AI operating systems, connector infrastructure, failure-tolerant workflows, and verifiable artifact pipelines.

This portfolio is intentionally concentrated around **three evidence-bearing systems** rather than repository-count marketing. All three flagship systems are public and directly inspectable. Every claim below is paired with an evidence path and an explicit boundary.

## Start here: three-minute proof

1. Open **[Resume Shapeshifter](https://github.com/GlacierEQ/JOB-RESUME-BUILDER-)**.
2. Follow its listed evidence paths into the implementation and tests.
3. Compare the verified proof with the stated gaps; the gaps are part of the product record.
4. Open **[job-app-helix](https://github.com/GlacierEQ/job-app-helix)** to inspect how portfolio evidence, README contracts, and repository relationships are governed.

## Flagship systems

| System | Access | Readiness | Primary signal |
|---|---|---|---|
| **Resume Shapeshifter** | public | hardening | Next.js product engineering, model-backed document analysis, schema-validated structured output |
| **AKOS + pro-code** | public | hardening | agent governance, engineering operating contracts, multi-repository orchestration |
| **xAI Colossus Cooling** | public | hardening | infrastructure systems thinking, thermal and capacity modeling, target-company technical research |

## 1. Resume Shapeshifter

**Repository:** [JOB-RESUME-BUILDER-](https://github.com/GlacierEQ/JOB-RESUME-BUILDER-)  
**Access:** Public and directly inspectable  
**Status:** `hardening`

### What it demonstrates

- Next.js product engineering
- model-backed document analysis
- schema-validated structured output
- deterministic truthfulness enforcement
- human review before completion

### Verified proof

- Model-service failures no longer return canned success data.
- Generated employers and titles are checked against the source resume.
- New numeric claims and unsupported skills are rejected.
- The deterministic guard has an executable Node test suite.

### Evidence path

- README.md
- app/api/analyze/route.ts
- app/api/tailor/route.ts
- lib/truthfulness.ts
- tests/truthfulness.test.ts
- services/tailoring-engine.ts

### Current gaps

- Repository name still needs cleanup.
- Production deployment has not been verified.
- Document export is not implemented yet.
- Match-score calibration has not been benchmarked.

---

## 2. AKOS + pro-code

**Repository:** [AKOS](https://github.com/GlacierEQ/AKOS) · [pro-code](https://github.com/GlacierEQ/pro-code)  
**Access:** Public and directly inspectable  
**Status:** `hardening`

### What it demonstrates

- agent governance
- engineering operating contracts
- multi-repository orchestration
- continuity across tools and sessions
- truth and completion boundaries

### Verified proof

- Both repositories are public and directly inspectable.
- AKOS exposes identity, governance, repository topology, and completion semantics as explicit documents.
- pro-code carries reusable engineering standards and control-surface modules.

### Evidence path

- AKOS: IDENTITY.md, GOVERNANCE.md, REPOS.md
- pro-code: engineering standards and control-surface modules

### Current gaps

- A unified cross-repository demonstration and evidence receipt are not yet linked from this portal.
- Runtime and deployment claims remain repository-native and must be verified in each project.

---

## 3. xAI Colossus Cooling

**Repository:** [xai-colossus-cooling](https://github.com/GlacierEQ/xai-colossus-cooling)  
**Access:** Public and directly inspectable  
**Status:** `hardening`

### What it demonstrates

- infrastructure systems thinking
- thermal and capacity modeling
- target-company technical research
- architecture documentation

### Verified proof

- The repository is public and its source and documentation are directly inspectable.
- This portal treats the implementation as reviewable engineering evidence, not proof of deployed xAI infrastructure.

### Evidence path

- README.md and technical overview
- assumptions and source ledger
- model or simulation entry point
- tests and reproducible examples

### Current gaps

- Model assumptions and calculations still require repository-native reproducibility receipts.
- Deployment, scale, and production-performance claims remain unverified.


---

## Ten-minute engineering review

1. **Product behavior:** inspect Resume Shapeshifter's API routes, truthfulness boundary, and adversarial tests.
2. **Governance architecture:** inspect AKOS and pro-code for explicit authority, completion, and engineering-contract surfaces.
3. **Systems modeling:** inspect xAI Colossus Cooling's assumptions, calculations, and reproducibility path.
4. **Evidence discipline:** verify that each system separates public source, executable proof, deployment proof, and unresolved scope.
5. **Portfolio control:** inspect `job-app-helix` for deterministic inventory, planning, verification receipts, and the typed README Mesh.

## Repository roles

```text
job-application
├── recruiter-facing portfolio and application portal
├── evidence-bound flagship manifest
└── generated showcase and resume entrypoints

job-app-helix
├── portfolio inventory and verification control plane
├── README contract and typed repository mesh
└── deterministic plans and atomic receipts

JOB-RESUME-BUILDER-
└── public product proof; branded as Resume Shapeshifter

job-app
└── private resumes, applications, outreach, and status tracking
```

## Release gates

- Regenerate `SHOWCASE.md` whenever `portfolio_manifest.json` changes.
- Verify every public repository link before publishing the portal.
- Require repository-native tests or receipts before promoting runtime claims.
- Keep deployment, scale, and performance claims unverified until provider-backed evidence exists.
- Keep private operations, personal contacts, and credentials outside this public repository.

## Excluded by design

- sensitive personal records and dispute-related material
- personal outreach contacts
- application tracking data
- credentials or runtime secrets
- invented metrics
- unverified production claims

---

_Generated from `portfolio_manifest.json`. Edit the manifest, run `python3 generate_showcase.py`, then run `python3 test_showcase.py`._
