# Company Fit — xAI Data Center Reliability × Reversible Verified Change

Date: 2026-08-11
Status: CANONICAL COMPANY-FIT PROJECTION
Claim ceiling: `VERIFIED_CURRENT_ROLE_TO_RELIABILITY_CAPABILITY_ALIGNMENT_NOT_DOMAIN_EQUIVALENCE`

## Recruiter

xAI currently lists **Reliability Engineer (Data Center Infrastructure)** in Memphis, TN / Southaven, MS. GlacierEQ already has a canonical, independently supported **Reversible Verified Change** capability: preserve known-good state, gate mutation, verify the changed state, and restore on failed post-change checks. The defensible fit is the reliability-control pattern itself—not a claim of xAI employment, Colossus access, or equivalent physical-infrastructure experience.

## Current public role anchor

Official source observed 2026-08-11:
- xAI Open Roles: https://x.ai/careers/open-roles
- Department: Infrastructure
- Role: Reliability Engineer (Data Center Infrastructure)
- Location: Memphis, TN; Southaven, MS

The title and department establish a current reliability/data-center hiring target. They do not establish xAI's internal failure modes, tooling, architecture, or operating procedures.

## Existing company-study anchor

The current GlacierEQ xAI dossier already bounds the inferred operating problem as preserving reliability, safety, and debuggability while infrastructure scales and ships quickly, while explicitly labeling that bottleneck as GlacierEQ inference rather than employer-confirmed internal fact.

Source surface: `site-v15/companies/xai/index.html`
Prior state: `MAPPED_NOT_RECRUITER_READY`, with `current_role_not_verified` among the blockers.

This proof object closes only the **current-role verification** portion for the reliability/data-center target and adds a bounded capability mapping. It does not silently promote the entire xAI dossier to company-specific reproduced proof.

## Capability evidence

Canonical proof object: `portfolio-proof/CAPABILITY_CLUSTER__REVERSIBLE_VERIFIED_CHANGE__2026-08-10.md`

### Donor A — GlacierEQ/FILEBOSS
- Revision: `e0b75b204d40e5c2a3cb15f633526a1e6c78cbaa`
- Source: `ops/railway_release.py`
- Evidence class: current source-contract implementation
- Relevant mechanisms: snapshot newest successful deployment, verify rollback availability, perform rollback, poll resulting state, optionally require health validation, fail on bounded timeout.

### Donor B — GlacierEQ/xai-colossus-servers
- Revision: `676d6b7d1912d116f0f9204dd7aca14d03a00f90`
- Source: `firmware/pipeline.py`
- Evidence class: current source-contract implementation
- Relevant mechanisms: require SHA-256 metadata, save prior firmware version, mutate, run smoke test, automatically restore prior version on failure, return explicit `rolled_back` state.

These are two independent implementations supporting **one** capability pattern. Repository count is not accomplishment count.

## Master fit statement

The strongest defensible xAI-facing statement is:

> I have independently implemented reversible-change protocols in deployment and firmware contexts: preserve a recoverable prior state, validate the change path, verify post-change health, and fail back to known-good state when verification fails. That pattern aligns directly with reliability engineering as a control principle, while my evidence does not establish equivalent experience operating xAI data-center physical infrastructure.

## Machine

```json
{
  "schema": "glaciereq.portfolio.company-fit/v1",
  "company": "xAI",
  "role_anchor": {
    "title": "Reliability Engineer (Data Center Infrastructure)",
    "department": "Infrastructure",
    "location": ["Memphis, TN", "Southaven, MS"],
    "verified_date": "2026-08-11",
    "source": "https://x.ai/careers/open-roles"
  },
  "capability": "reversible_verified_change",
  "capability_proof": "portfolio-proof/CAPABILITY_CLUSTER__REVERSIBLE_VERIFIED_CHANGE__2026-08-10.md",
  "independent_donors": [
    "GlacierEQ/FILEBOSS@e0b75b204d40e5c2a3cb15f633526a1e6c78cbaa",
    "GlacierEQ/xai-colossus-servers@676d6b7d1912d116f0f9204dd7aca14d03a00f90"
  ],
  "fit": "reliability-control-pattern alignment",
  "claim_ceiling": "VERIFIED_CURRENT_ROLE_TO_RELIABILITY_CAPABILITY_ALIGNMENT_NOT_DOMAIN_EQUIVALENCE",
  "excluded_claims": [
    "xAI affiliation or employment",
    "access to xAI proprietary systems or Colossus operations",
    "production deployment at xAI",
    "physical data-center reliability experience equivalent to the posted role",
    "knowledge of xAI internal failure modes or procedures",
    "two repositories equal two accomplishments"
  ]
}
```

## Mesh

Edges:
- `xAI current Reliability Engineer role` → `ALIGNS_WITH` → `reversible_verified_change`
- `reversible_verified_change` → `SUPPORTED_BY` → `FILEBOSS`
- `reversible_verified_change` → `SUPPORTED_BY` → `xai-colossus-servers`
- `xAI company dossier` → `ROLE_BLOCKER_PARTIALLY_CLOSED_BY` → `2026-08-11 official role verification`

## Durable delta

Before this object, the xAI dossier explicitly carried `current_role_not_verified` and only a broad company-alignment ceiling. This object adds a current official role anchor and binds one already-canonical capability to that role under an explicit non-equivalence boundary.

The portfolio may now use the bounded statement **"verified current xAI reliability-role alignment to reversible-change engineering"**. It may not promote that statement into physical-infrastructure domain equivalence or company-specific operational proof.

## Exact next cursor

Inspect the official role detail page or other current xAI first-party role material for explicit reliability responsibilities/requirements. Then compare those requirements against exact-revision GlacierEQ evidence for observability, failure-domain isolation, incident receipts, commissioning/verification, or infrastructure diagnostics. Promote only the requirement-level overlaps that have direct evidence; leave physical-facility gaps explicit.
