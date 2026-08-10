# Capability Cluster — Revision-Bound Proof Promotion

## Recruiter

Built a repeatable proof-governance pattern that prevents old test evidence from silently becoming proof for changed code. Across three independent systems, promotion is tied to an exact source revision; changed heads must earn fresh evidence, while historical green results remain usable only as explicitly pinned historical proof.

**Defensible claim:** I design engineering proof surfaces where verification authority is revision-bound rather than repository-name-bound.

## Master

The repeated mechanism is **revision-bound proof promotion**:

1. identify the exact source revision that produced an observed result;
2. bind proof state to that revision and its machine-readable receipt;
3. refuse automatic proof inheritance when the implementation head changes;
4. demote or narrow claims when current-head evidence fails or is absent;
5. require fresh exact-head verification before re-promotion.

This pattern appears independently in:

- **GlacierEQ/anthropic-agent-coordinator** — historical `62/62` remains pinned to executable commit `87438f57bdfd2cb380730cf51140611963d7c95b`; changed head `0f2ca5199e67664a87ffef3f874d5836984dbbdb` is explicitly represented as `DISCOVERED`, `proof_ok=false`, `operable_ok=false`, with `TESTS_FAIL` rather than inheriting the historical result.
- **GlacierEQ/waymo-phantom-freespace-certificate** — promoted component evidence is source-bound to `feee6e51999ea391bd8793a77f2576c21b6464bc` and workflow run `31403184766`.
- **GlacierEQ/waymo-uncertainty-lane-graph** — promoted component evidence is source-bound to `e22e8a85d455cca69cfd40ebc7bcae0c2fedad07` and workflow run `31404546209`.

These are three independent repositories supporting one accomplishment pattern, not three accomplishments. No fork, backup, or duplicate is counted as an independent build.

## Machine

```yaml
capability: revision_bound_proof_promotion
accomplishment_count: 1
repository_count: 3
forks_or_backups_counted_as_independent: false
integration_exercised: false
invariant: >-
  verification authority belongs to the exact source revision that earned it;
  changed code cannot inherit prior promotion without fresh evidence.
donors:
  - repo: GlacierEQ/anthropic-agent-coordinator
    historical_proof_sha: 87438f57bdfd2cb380730cf51140611963d7c95b
    historical_result: 62/62
    current_head: 0f2ca5199e67664a87ffef3f874d5836984dbbdb
    current_state: DISCOVERED
    current_proof_ok: false
    current_operable_ok: false
    current_blocker: TESTS_FAIL
  - repo: GlacierEQ/waymo-phantom-freespace-certificate
    source_proof_sha: feee6e51999ea391bd8793a77f2576c21b6464bc
    workflow_run: 31403184766
    current_state: EVOLVING
  - repo: GlacierEQ/waymo-uncertainty-lane-graph
    source_proof_sha: e22e8a85d455cca69cfd40ebc7bcae0c2fedad07
    workflow_run: 31404546209
    current_state: EVOLVING
    external_claim_ceiling: PROMOTED
claim_ceiling: CROSS_REPOSITORY_PROOF_GOVERNANCE_PATTERN
```

## Mesh

### Proven now
- Proof can be pinned to exact source revisions rather than transferred by repository identity.
- A changed head can be explicitly demoted while historical proof remains preserved and correctly scoped.
- Independently promoted component evidence can be represented with exact source SHA and workflow-run binding.

### Not claimed
- one integrated proof-orchestration platform across the three repositories;
- production deployment of a shared verifier;
- automatic cryptographic attestation across all repositories;
- current-head Agent Coordinator promotion;
- Waymo or Anthropic adoption, affiliation, or proprietary-system equivalence.

### Next promotion gate
Build a shared verifier that consumes repository proof receipts, compares current head to proof-source SHA, automatically marks stale inheritance invalid, and emits a fresh canonical receipt after exact-head gates pass.

## Supersession

Where these donors are cited together, this cluster supersedes weaker wording such as “keeps test results documented” or “tracks CI status.” The stronger defensible capability is **revision-bound verification authority with explicit non-inheritance across changed code**.
