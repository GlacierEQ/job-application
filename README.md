\n> **Estate projection upgrade (2026-08-29):** company and repository views now consume the source-exhaustive Helix estate contract. Fixed counts are snapshot observations, never portfolio ceilings; recruiter filtering changes presentation, not membership.\n# GlacierEQ Hiring System

**One governed portfolio truth. Multiple evaluator-specific projections. Evidence stays with the system that earned it.**

[Open the current public portfolio](https://casey-barton-glaciereq.vercel.app)

`GlacierEQ/job-application` is the public presentation and delivery surface for Casey Barton’s hiring system. It is **not** the portfolio authority and it does not independently promote repository claims.

The current architecture is:

```text
child repositories
  own code, tests, releases, and repository-native receipts
        ↓
GlacierEQ/job-app-helix
  owns portfolio admission, classification, company alignment,
  flagship state, evidence projection policy, and root-truth receipts
        ↓ build-time, commit-pinned projection
GlacierEQ/job-application
  renders recruiter, résumé, master, mesh, atlas, and machine surfaces
        ↓
casey-barton-glaciereq.vercel.app
```

A source-head or evidence change can make a downstream projection stale. Builds fail closed when required Helix sources are missing, inconsistent, unsafe for public release, or leak private records.

## Current Release Line

The repository has progressed beyond the historical V12/V13 prototypes.

- **V15 hiring-system foundation:** the current script-free public-site architecture and validation line.
- **V16 signal architecture:** higher-impact recruiter presentation while preserving the underlying factual graph.
- **V17 résumé intelligence:** two-page human résumé, editable DOCX, ATS text, structured résumé JSON, evidence IDs, and PSYSOC-X factual-invariance validation.
- **Helix projection architecture:** the production hiring site is compiled from a commit-pinned public-safe snapshot of Job App Helix source truth rather than relying on live GitHub requests in the browser.
- **Retained V17 source bridge:** the historical Node 24 compatibility bridge remains repaired and runtime-verified, but it is not the active production delivery mechanism.

Release names describe compatible layers of one hiring system; they are not independent competing portfolios.

## Primary Public Surfaces

| Surface | Audience | Purpose |
|---|---|---|
| **Recruiter** ([`/`](https://casey-barton-glaciereq.vercel.app/)) | Recruiters and hiring managers | Fast identity, strongest proof, role fit, and bounded outcomes |
| **Résumé** ([`/resume/`](https://casey-barton-glaciereq.vercel.app/resume/)) | Recruiters, ATS workflows, and hiring teams | Evidence-forward professional history and selected systems |
| **Technical Master** ([`/master/`](https://casey-barton-glaciereq.vercel.app/master/)) | Senior engineers and technical leaders | Architecture, executed evidence, blockers, non-claims, and promotion state |
| **Evidence Mesh** ([`/mesh/`](https://casey-barton-glaciereq.vercel.app/mesh/)) | Systems reviewers | Typed relationships among systems, repositories, evidence, and company tracks |
| **Systems Atlas** ([`/atlas/`](https://casey-barton-glaciereq.vercel.app/atlas/)) | Technical hiring managers | Helix-governed Crown Jewels and company-aligned public systems |
| **Machine** ([`/machine/`](https://casey-barton-glaciereq.vercel.app/machine/)) | AI systems and automated reviewers | Stable machine contracts, evidence semantics, and bounded startup paths |

## Authority Split

### Child repositories are source authority

Each child repository owns its own:

- implementation;
- README and technical contract;
- tests and current test count;
- build and release state;
- deployment evidence;
- security and failure behavior;
- repository-native receipts.

### Job App Helix is portfolio authority

`GlacierEQ/job-app-helix` owns:

- whether a repository belongs in the governed hiring portfolio;
- whether it is public, private, excluded, quarantined, experimental, reference-only, or promoted;
- company and role alignment;
- Crown Jewel / flagship hierarchy;
- public-safe evidence state;
- portfolio-wide freshness and promotion policy;
- projection contracts for the public site and résumé system.

### This repository is presentation authority

`GlacierEQ/job-application` owns:

- recruiter information architecture;
- visual presentation;
- human, master, mesh, atlas, and machine navigation;
- release validation for the public site;
- generated hiring artifacts;
- commit-pinned consumption of Helix public-safe truth.

It may change presentation. It may not silently change facts, evidence states, uncertainty, privacy, affiliation boundaries, or source authority.

## Résumé Intelligence

The V17 résumé system provides separate interfaces for different consumers while preserving one factual identity:

- human résumé page;
- two-page recruiter/hiring-manager PDF;
- editable DOCX companion;
- linear ATS text at `/resume/ats.txt`;
- structured résumé JSON at `/data/resume.json`;
- evidence-linked project claims;
- machine-readable discovery through `llms.txt` and related contracts.

PSYSOC-X may alter density, ordering, terminology, and emphasis for a declared audience. It may not alter dates, identity, evidence state, test totals, uncertainty, authority, dignity, or non-affiliation boundaries.

## Current Technical Narrative

The hiring system is designed around a simple standard:

```text
CLAIM
  ↓
required observable behavior
  ↓
implementation
  ↓
executable verification
  ↓
receipt bound to the tested state
  ↓
public promotion
```

A repository name is not proof. Source presence is not executed behavior. A green build is not automatically a deployment. A simulation is not hardware evidence. A private architecture is not presented as publicly inspectable source.

## Portfolio Hierarchy

The public site exposes a governed hierarchy from Helix without treating any level as a fixed-size shortlist or membership boundary. The hierarchy is an evidence and orientation model:

1. **Crown Jewels / flagships** — strongest differentiated systems with the clearest evidence and senior-level value.
2. **Advanced systems** — substantial original systems whose remaining gates are explicit.
3. **Focused prototypes** — bounded technical exhibits that need stronger current execution, hardware, provider, benchmark, or deployment proof.
4. **Reference architecture / private systems** — useful architectural context with the applicable public boundary.
5. **Studies, upstream references, and experiments** — visible with their actual provenance and never presented as original recruiter proof without verified differentiated contribution.
6. **Quarantined or blocked systems** — preserved for repair or history, not promoted as completed proof.

The Atlas, Inventions, Mesh, Machine, Mega-Skills, and owning repository routes provide the full governed relationship model. Orientation order, pagination, and recruiter views improve comprehension but never define what exists.

## Helix Projection Pipeline

The public site consumes Helix through a fail-closed build-time compiler.

Key contracts include:

```text
portfolio-source.json
scripts/sync-helix-projection.mjs
scripts/validate-helix-projection.mjs
scripts/render-helix-atlas.mjs
scripts/link-helix-atlas.mjs
scripts/validate-helix-atlas.mjs
site-v15/data/helix-root.json
site-v15/data/helix-root.receipt.json
```

The projection rejects, among other failures:

- missing or unsupported Helix root contracts;
- inconsistent inventory relationships;
- unknown source identities;
- private-record leakage;
- disallowed promotion states;
- duplicate flagship or company identities;
- missing non-affiliation boundaries;
- source/receipt digest mismatch;
- Atlas drift from the compiled snapshot;
- unsafe public URLs;
- inherited hiring-system validation failures.

The browser therefore does not need a live GitHub request to decide portfolio truth.

## Production and Compatibility Boundary

The current public domain is:

`https://casey-barton-glaciereq.vercel.app`

The active production architecture is the newer static Helix projection. A historical V17 read-only source bridge remains in the repository for compatibility. Its Node 24 request parsing was repaired to use the WHATWG `URL` API and independently runtime-verified in an isolated preview without rolling production backward.

That compatibility receipt does **not** mean `/api/proxy` is part of the current production presentation path.

## Verify the Hiring System

Repository workflows and validators cover the current release surfaces. Relevant checks include:

- hiring-site validation;
- résumé-signature and artifact validation;
- PSYSOC-X factual-invariance checks;
- Helix projection reconciliation;
- public/private boundary checks;
- Atlas generation and count consistency;
- source/receipt integrity;
- Node 24 compatibility regression coverage for the retained bridge.

Use the repository-native scripts and workflows for the release being changed rather than copying historical test counts into a new claim.

## Evidence Boundary

This repository supports claims about:

- public presentation engineering;
- evidence-aware hiring architecture;
- build-time portfolio projection;
- human/ATS/machine résumé interfaces;
- structured machine contracts;
- release validation and integrity receipts;
- explicit privacy and non-affiliation controls.

It does **not** independently establish:

- current runtime success of every connected repository;
- customers, revenue, scale, or measured business impact;
- employment by or affiliation with a named target company;
- proprietary access;
- private implementation details;
- recruiter response or hiring outcome;
- unrestricted tool, connector, or deployment authority.

Those states require evidence from their actual owning system.

## Repository Map

```text
README.md                              current public-hiring contract
RESUME.md                              public evidence-bound résumé source surface
portfolio-source.json                  Helix consumer pointer and public-data boundary
site-v15/                              current public-site source line
site-v15/data/helix-root.json          generated public-safe Helix snapshot
site-v15/data/helix-root.receipt.json  projection integrity receipt
site-v15/atlas/                        generated Systems Atlas
site-v15/machine/                      machine-facing contracts
scripts/                               projection, rendering, and validation tools
deployment/                            retained delivery and compatibility paths
deployment-receipts/                   source/deployment verification receipts
.github/workflows/                     hiring, résumé, projection, and release gates
```

## Promotion Rule

A public change is complete only when:

1. the owning source is current;
2. the relevant repository-native checks pass;
3. Helix root truth accepts the evidence and classification change when portfolio state is affected;
4. the public projection is rebuilt from one immutable Helix commit;
5. the generated artifacts match their receipts;
6. the Vercel production deployment is verified at the current public domain;
7. the human, ATS, master, mesh, atlas, and machine surfaces remain mutually consistent.

**The presentation may be ambitious. The evidence contract may not bluff.**
