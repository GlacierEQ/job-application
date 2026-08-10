# Capability Cluster — Truth-Preserving Public Projections

**Date:** 2026-08-10  
**Cluster ID:** `truth_preserving_public_projections`  
**Claim ceiling:** `MULTI_REPOSITORY_PATTERN_VERIFIED`  
**Pattern:** Convert private, sensitive, or canonical source truth into public/recruiter-facing projections without changing authority, leaking protected identifiers, or silently widening claims.

## Recruiter surface

> I build public-facing engineering surfaces that stay mechanically subordinate to their source truth. Across independent systems, the recurring pattern is: preserve the canonical authority, bind public projections to exact source revisions, expose only admitted non-secret state, and reject private identifiers or unsupported promotion from crossing the boundary.

This is not generic documentation hygiene. The evidence shows projection boundaries implemented as contracts or regression-tested invariants in multiple repositories.

## Master surface

### Repeated mechanism

A truth-preserving projection has four independent obligations:

1. **Authority stays upstream.** Publishing a public representation does not migrate or mint canonical authority.
2. **Projection is source-bound.** Consumers can identify the exact source commit/blob or evidence reference used to derive the public surface.
3. **Disclosure is admission-controlled.** Sensitive/private material does not become public merely because it contributes transferable engineering value.
4. **Projection cannot inflate proof.** A public representation is not evidence that a consuming repository, company, or deployment satisfies the projected contract.

### Independent donor A — AKOS public governance projection

**Repository:** `GlacierEQ/AKOS`  
**Canonical head observed:** `2c9665764215a3084bd64fa9d36626811dd0b0b1`  
**Exact artifact:** `governance/glaciereq.repo-excellence-public-contract.v1.json`  
**Blob:** `de8f9e9fdb6883c0cdff946814f714d3a08ee20c`

The contract declares itself a `public_non_secret_governance_projection`, pins the private Monolith authority to an exact Git head, states that Monolith remains source authority, and explicitly says that publication neither grants private access nor proves that consumers satisfy the contract. Consumers are required to record the AKOS commit and contract blob used for census/validation.

This verifies **authority-preserving public projection** and **immutable consumer binding**.

### Independent donor B — ECHO sanitized public mesh boundary

**Repository:** `GlacierEQ/ECHO`  
**Canonical head observed:** `6acdb3be1739f1659f3cec9f4b7d39d5799cd476`  
**Exact regression test:** `tests/test_public_surface.py`  
**Blob:** `be33a9fca21c13784f3b0a4905f4e5c036a96b34`

ECHO's public-surface tests reject known sensitive domain-repository identifiers from the public README and require the invariant that only separately admitted, sanitized capabilities may cross the boundary. A private/domain system may contribute only a separately sanitized transferable capability after its own admission gate passes.

This verifies **negative disclosure controls** and **capability-level sanitization rather than repository-level leakage**.

### Independent donor C — Helix public company evidence contract

**Repository:** `GlacierEQ/job-app-helix`  
**Canonical head observed:** `fb2c130ba9cebeb9b3297ca48b2bf2ac8544f17d`  
**Exact artifact:** `manifests/company_second_depth.json`  
**Blob:** `3f5d8ac04f67cb79af2898e035a1389913dcd834`

Helix projects company-specific proof only through evidence records that carry immutable `source_ref`, explicit `verification_state`, and `visibility: public`. Stage/claim ceilings remain separate from evidence presence, and explicit next gates/nonclaims prevent inspected code or reproduced proof from silently becoming deployment, affiliation, adoption, production-scale, or semantic-safety claims.

This verifies **evidence-addressable public projection** and **claim-ceiling separation from source existence**.

## Cross-repository synthesis

The common architecture is stronger than "public/private separation":

```text
CANONICAL / SENSITIVE SOURCE
        |
        | exact source binding
        v
ADMISSION + SANITIZATION
        |
        | explicit public-safe schema / tests
        v
PUBLIC PROJECTION
        |
        | claim ceiling + nonclaims + next gate
        v
CONSUMER SURFACE
```

Failure modes are explicit:

- public projection becomes a second authority;
- sensitive identifiers leak through a mesh or README;
- transferable capability is confused with permission to publish the source system;
- a public evidence pointer is mutable or unverified;
- projection presence is mistaken for implementation/adoption/deployment;
- company naming is mistaken for affiliation or production use.

## Machine surface

```yaml
schema: glaciereq.capability-cluster.v1
id: truth_preserving_public_projections
status: VERIFIED_MULTI_REPOSITORY_PATTERN
claim_ceiling: MULTI_REPOSITORY_PATTERN_VERIFIED
independence_rule: distinct canonical repositories; forks/backups do not count
mechanisms:
  - authority_preservation
  - immutable_source_binding
  - public_safe_admission
  - negative_disclosure_testing
  - sanitized_capability_transfer
  - evidence_visibility_contract
  - claim_ceiling_separation
  - explicit_nonclaims
  - exact_next_gate
sources:
  - repository: GlacierEQ/AKOS
    head: 2c9665764215a3084bd64fa9d36626811dd0b0b1
    path: governance/glaciereq.repo-excellence-public-contract.v1.json
    blob: de8f9e9fdb6883c0cdff946814f714d3a08ee20c
    proves:
      - public_non_secret_projection
      - upstream_authority_retained
      - exact_source_binding
      - projection_not_consumer_compliance
  - repository: GlacierEQ/ECHO
    head: 6acdb3be1739f1659f3cec9f4b7d39d5799cd476
    path: tests/test_public_surface.py
    blob: be33a9fca21c13784f3b0a4905f4e5c036a96b34
    proves:
      - sensitive_identifier_exclusion
      - sanitized_capability_admission
      - public_boundary_regression_testing
  - repository: GlacierEQ/job-app-helix
    head: fb2c130ba9cebeb9b3297ca48b2bf2ac8544f17d
    path: manifests/company_second_depth.json
    blob: 3f5d8ac04f67cb79af2898e035a1389913dcd834
    proves:
      - immutable_public_evidence_references
      - explicit_verification_state
      - public_visibility_contract
      - stage_and_claim_ceiling_separation
nonclaims:
  - universal_estate_adoption
  - secrecy_or_privacy_certification
  - zero_information_leakage_across_all_surfaces
  - automatic_sanitization_of_arbitrary_private_data
  - production_deployment_of_every_projection
  - affiliation_or_adoption_by_named_companies
```

## Mesh

```text
TRUTH-PRESERVING PUBLIC PROJECTIONS

AKOS
  private Monolith authority
    -> public non-secret governance contract
    -> exact source binding
    -> projection does not mint authority

ECHO
  private/domain systems
    -> separate capability admission
    -> sanitized transferable capability only
    -> regression-tested public identifier exclusion

HELIX
  repository/company evidence
    -> immutable public evidence references
    -> verification + visibility fields
    -> bounded stage / claim ceiling
    -> nonclaims preserved

COMMON PATTERN
  preserve authority
  bind exact source
  admit only public-safe state
  prevent sensitive leakage
  keep projection separate from adoption/deployment proof
```

## Portfolio positioning

Prefer **"truth-preserving public projection boundaries"** over weaker phrases such as "documentation generation" or "public/private separation" when the cited evidence is this cluster. The stronger phrase is justified because the repeated mechanism combines authority preservation, immutable source binding, negative disclosure controls, and bounded claim projection.

## Boundaries

This cluster does **not** prove that every GlacierEQ repository implements the pattern, that arbitrary private data is automatically sanitized, or that these controls constitute a formal privacy/security certification. Each donor proves only the mechanism identified above at its cited revision.
