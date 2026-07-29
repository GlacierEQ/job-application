# GlacierEQ — Engineering Portfolio

> **Ship capabilities, not prompt piles.**

Systems architect and full-stack engineer building AI operating systems, connector infrastructure, failure-tolerant workflows, and verifiable artifact pipelines.

This portfolio is intentionally narrow: **one public product and two deeper architecture systems**. It does not use repository count as a quality claim, and it does not present private work as publicly inspectable proof.

## Start here: three-minute proof

1. Open **[Resume Shapeshifter](https://github.com/GlacierEQ/JOB-RESUME-BUILDER-)**.
2. Read `lib/truthfulness.ts` and `tests/truthfulness.test.ts`.
3. Inspect the fail-closed model boundary and API orchestration.
4. Use the private architecture systems only through a curated case study or explicit access grant.

## Flagship systems

| System | Access | Readiness | Primary signal |
|---|---|---|---|
| **Resume Shapeshifter** | public | hardening | Next.js product engineering, model-backed document analysis, schema-validated structured output |
| **AKOS + pro-code** | private | private-review | agent governance, engineering operating contracts, multi-repository orchestration |
| **xAI Colossus Cooling** | private | private-review | infrastructure systems thinking, thermal and capacity modeling, target-company technical research |

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

**Repository:** `AKOS` · `pro-code`  
**Access:** Private; curated review required  
**Status:** `private-review`

### What it demonstrates

- agent governance
- engineering operating contracts
- multi-repository orchestration
- continuity across tools and sessions
- truth and completion boundaries

### Verified proof

- The repositories exist and are accessible to the owner.
- They are intentionally private and require a curated public case study or review grant before recruiter use.

### Evidence path

- AKOS: IDENTITY.md, GOVERNANCE.md, REPOS.md
- pro-code: engineering standards and control-surface modules

### Current gaps

- Recruiters cannot access the repositories while they remain private.
- A compact architecture case study and runnable proof path are still required.

---

## 3. xAI Colossus Cooling

**Repository:** `xai-colossus-cooling`  
**Access:** Private; curated review required  
**Status:** `private-review`

### What it demonstrates

- infrastructure systems thinking
- thermal and capacity modeling
- target-company technical research
- architecture documentation

### Verified proof

- The repository exists and is accessible to the owner.
- The repository is private, so its technical claims are not presented here as publicly reviewable proof.

### Evidence path

- Curated technical overview
- assumptions and source ledger
- model or simulation entry point
- tests and reproducible examples

### Current gaps

- Recruiters cannot inspect the implementation while the repository remains private.
- The public portfolio needs a bounded case study with citations, assumptions, and reproducible calculations.


---

## Ten-minute engineering review

1. **Product surface:** open the public Resume Shapeshifter repository and read its README.
2. **Control boundary:** inspect the deterministic truthfulness validator.
3. **Tests:** run `npm test` and review the adversarial cases.
4. **Service behavior:** inspect the analyze and tailor API routes plus the fail-closed model-service path.
5. **Architecture depth:** request the curated AKOS/pro-code or Colossus cooling case study only after its access path is ready.

## Repository roles

```text
job-application
└── recruiter-facing portfolio portal

JOB-RESUME-BUILDER-
└── public product proof; branded as Resume Shapeshifter

job-app
└── private resumes, applications, outreach, and status tracking
```

## Release gates

- Verify this repository is public before sending its URL to a recruiter.
- Do not link private flagship repositories as though they are inspectable.
- Publish a bounded architecture case study or grant access before using private work as proof.
- Deploy and verify the public product before describing it as live.
- Rename `JOB-RESUME-BUILDER-` only after redirects and portfolio references are planned.

## Excluded by design

- sensitive personal records and dispute-related material
- personal outreach contacts
- application tracking data
- credentials or runtime secrets
- invented metrics
- unverified production claims

---

_Generated from `portfolio_manifest.json`. Edit the manifest, run `python3 generate_showcase.py`, then run `python3 test_showcase.py`._
