# System Proof — GitHub Merge Authority Graph

**Status:** CLAIM_PROMOTED production projection read back  
**Evidence authority:** `projects/github-merge-authority-proof/proof/production-claim-promotion-readback.json` at `208b743e9a68955b08099ee25d0e449c32619e49`  
**Truth boundary:** Independent GlacierEQ work. No GitHub affiliation, endorsement, employment, proprietary access, GitHub adoption, or deployment of this capability inside GitHub production is claimed.

## Recruiter

Built and reproduced a governed GitHub mutation path that treats merge authority as explicit state rather than an implicit side effect. The company-specific portfolio claim is now proof-bound and publicly projected with immutable receipts and live production readback. The deployed portfolio verifier returned PASS, and the GitHub company projection read back at `CLAIM_PROMOTED` with a `proof_bound_company_specific` claim ceiling.

## Master

The system separates capability from authority and authority from promotion. Historical claim receipts establish the implemented/reproduced mutation path; Helix carries the company-specific promotion; the production portfolio compiles from effective Helix authority; and live readback checks the canonical alias against that authority. Freshness is fail-closed: a newer Helix head remains projection-equivalent only when the deployed authority is its ancestor and every intervening path is receipt-only under an allowed non-projection prefix. Any source, authority, or manifest delta requires a new deployment/readback rather than silent inheritance.

This creates a defensible chain:

`implemented mutation path -> reproduced proof -> immutable claim receipt -> Helix CLAIM_PROMOTED -> compiled production projection -> live canonical-alias readback`

The strongest reusable engineering pattern is **authority-aware mutation with proof-bound promotion**: execution is not enough; the system records who/what may mutate, binds the resulting claim to immutable evidence, and refuses to inherit higher authority from unrelated repository state.

## Machine

```yaml
schema: glaciereq.system-proof.github-merge-authority.v1
system: github_merge_authority_graph
company_projection: GitHub
source_receipt:
  repository: GlacierEQ/job-application
  commit: 208b743e9a68955b08099ee25d0e449c32619e49
  path: projects/github-merge-authority-proof/proof/production-claim-promotion-readback.json
promotion:
  transition: PROOF_REPRODUCED -> CLAIM_PROMOTED
  helix_claim_promotion_commit: 7128a51bcc2bbadce1b2c4452dfea6c3c19d5c8f
  claim_ceiling: proof_bound_company_specific
production_projection:
  project: casey-barton-glaciereq
  deployment_id: dpl_HxKmXvuPT3jBjEHasbM4kTb1ZrTJ
  source_commit: f420ad15c2843a868cdc5acc6852a97003f5149a
  helix_commit: b09b7925a5448b934c69e8f175f6b6747794a474
live_readback:
  bundle_verifier: PASS
  v25_verifier: PASS
  v26_verifier: PASS
  github_stage: CLAIM_PROMOTED
  github_claim_receipts: 2
boundaries:
  github_affiliation: false
  github_adoption: false
  github_capability_production_deployment: false
  production_scale_reliability: false
  apex_canonical_transition_inferred: false
```

## Mesh

```text
GitHub merge-authority proof

IMPLEMENTATION
  reproduced governed mutation path

CLAIM
  immutable historical claim receipt

HELIX
  PROOF_REPRODUCED -> CLAIM_PROMOTED
  ceiling -> proof_bound_company_specific

PRODUCTION PORTFOLIO
  effective Helix authority compiled
  bundle verifier -> PASS
  V25 verifier -> PASS
  V26 verifier -> PASS
  GitHub JSON/record/HTML -> CLAIM_PROMOTED

FRESHNESS
  receipt-only Helix deltas may preserve projection equivalence
  source/authority/manifest deltas fail closed and require new readback

NONCLAIMS
  no GitHub affiliation or endorsement
  no GitHub adoption
  no deployment of capability inside GitHub production
  no production-scale reliability claim
  no inferred Apex CANONICAL state
```

## Claim ceiling

> GlacierEQ independently implemented and reproduced a governed GitHub mutation path and carries a proof-bound company-specific public claim backed by immutable claim and production-projection receipts.

No stronger operational, affiliation, adoption, or scale claim is authorized by this proof object.
