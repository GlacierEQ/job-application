# Capability Cluster — Evidence-Carrying Execution

## Canonical claim

**Evidence-Carrying Execution**: bind the identity and input of an operation before execution, constrain authority to that bound operation, and emit a deterministic/tamper-evident receipt that lets downstream reviewers connect outcome claims back to the exact execution context.

Claim ceiling: `INDEPENDENT_CURRENT_SOURCE_IMPLEMENTATIONS_OF_EVIDENCE_CARRYING_EXECUTION`.

This is **one repeated engineering capability**, not two accomplishments and not a repository-count claim.

## Recruiter surface

Built independent systems where automation does not merely run and report “success.” The operation is tied to its exact identity/input boundary and the resulting evidence records enough immutable context to audit what actually ran. This pattern reduces ambiguous provenance, replay risk, and unsupported success claims in automated workflows.

## Master surface

The repeated design pattern has four parts:

1. **Bind before execution** — establish exact repository/workflow/actor/input identity before authority is granted.
2. **Attenuate authority** — grant only the minimum capability required for the bound operation.
3. **Carry evidence through execution** — propagate hashes/typed identity into telemetry or receipt state rather than reconstructing provenance after the fact.
4. **Close on receipt truth** — completion is not promoted when the required evidence publication/receipt boundary fails.

### Independent donor A — `GlacierEQ/public-actions-runner-host`

Exact source revision observed: `597c188b2734d750fcfbdde9e7374afe74dc9b45`.

Current source contract establishes:

- immutable repository/workflow/actor identity checks before token minting and checkout;
- strict metadata-only job envelopes and rejection of unauthorized/ambiguous inputs;
- short-lived one-repository tokens with minimum permissions;
- duplicate-job replay guard before workload checkout;
- immutable private receipts that bind payload SHA-256, publication timestamp, workflow run ID/attempt, public-runner commit SHA, execution repository, trigger actor/actor ID, source repository, and source ref;
- successful workload execution without successful receipt publication remains a blocked release state;
- explicit statement that live OIDC operational completion must not be claimed without the required real run receipt.

Usable evidence class: **current source-contract evidence**. This artifact does not claim live OIDC activation or production operation.

### Independent donor B — `GlacierEQ/the-tower-of-babel`

Exact source revision observed: `f7e132c9717eda574f3bb5f643b2f983309f319f`.

The flagship pipeline contract establishes:

- validated operator mission ingress with an input hash;
- registry-bound authority that fails closed on invalid/non-bound plans;
- typed execution telemetry carrying an evidence hash;
- constrained persisted mission/event records;
- a capability-limited sandbox boundary;
- receipt sequence monotonicity as an explicit invariant;
- a deterministic tamper-evident Tower Receipt as the verification stage;
- exact blocker recording for unavailable toolchain stages rather than silently promoting them as executed.

Usable evidence class: **current source-contract / flagship-path evidence**. This artifact does not infer execution of unavailable toolchain stages or deployment.

## Machine surface

```yaml
schema: glaciereq.portfolio.capability-cluster.v1
capability_id: evidence-carrying-execution
claim_ceiling: INDEPENDENT_CURRENT_SOURCE_IMPLEMENTATIONS_OF_EVIDENCE_CARRYING_EXECUTION
accomplishment_count: 1
pattern:
  pre_execution:
    - bind_operation_identity
    - bind_input_or_payload
    - fail_closed_on_identity_or_contract_mismatch
  authority:
    - minimum_required_scope
    - operation_bound_execution
  evidence:
    - carry_hash_or_typed_identity_through_execution
    - persist_receipt_or_tamper_evident_result
  promotion:
    - do_not_promote_completion_when_required_receipt_closure_fails
donors:
  - repo: GlacierEQ/public-actions-runner-host
    revision: 597c188b2734d750fcfbdde9e7374afe74dc9b45
    evidence_class: current_source_contract
    anchors:
      - immutable_repository_workflow_actor_identity
      - strict_job_envelope
      - one_repository_short_lived_tokens
      - duplicate_replay_guard
      - immutable_private_receipt
      - payload_sha256_and_execution_identity_binding
      - receipt_publication_required_for_release
    exclusions:
      - live_oidc_activation
      - production_operation
  - repo: GlacierEQ/the-tower-of-babel
    revision: f7e132c9717eda574f3bb5f643b2f983309f319f
    evidence_class: current_source_contract_flagship_path
    anchors:
      - mission_input_hash
      - registry_bound_authority
      - evidence_hash_telemetry
      - constrained_state
      - receipt_sequence_monotonicity
      - deterministic_tamper_evident_receipt
      - explicit_toolchain_blockers
    exclusions:
      - unavailable_stage_execution
      - production_deployment
forbidden_inferences:
  - repositories_are_integrated
  - repository_count_equals_accomplishment_count
  - production_deployment
  - employer_or_company_affiliation
  - proprietary_system_access
  - live_oidc_path_is_operationally_complete
```

## Mesh surface

### Proven now

- Two independently canonical engineering systems implement the same underlying pattern: execution context is bound before/during the operation and carried into auditable evidence.
- Both systems explicitly resist truth inflation: one blocks release when receipt publication fails; the other records unavailable execution stages as blockers.
- The shared capability is stronger and more reusable than presenting isolated features such as “hashing,” “OIDC,” “telemetry,” or “receipts.”

### Not promoted

- No claim that the two repositories are integrated.
- No claim that either system is production deployed.
- No live OIDC activation claim for `public-actions-runner-host` without the repository-required real-run receipt.
- No claim that unavailable Tower toolchain stages executed.
- No employer, target-company, or proprietary-environment affiliation.

### Supersession

This proof object supersedes weaker portfolio treatment of these mechanisms as disconnected identity, hashing, telemetry, and receipt features. The durable portfolio unit is now the cross-system capability **Evidence-Carrying Execution**.

## Receipt manifest

```json
{
  "schema": "glaciereq.portfolio-proof.receipt.v1",
  "artifact": "portfolio-proof/CAPABILITY_CLUSTER__EVIDENCE_CARRYING_EXECUTION__2026-08-11.md",
  "capability_id": "evidence-carrying-execution",
  "claim_ceiling": "INDEPENDENT_CURRENT_SOURCE_IMPLEMENTATIONS_OF_EVIDENCE_CARRYING_EXECUTION",
  "accomplishment_count": 1,
  "donors": [
    {
      "repo": "GlacierEQ/public-actions-runner-host",
      "revision": "597c188b2734d750fcfbdde9e7374afe74dc9b45",
      "source": "README.md"
    },
    {
      "repo": "GlacierEQ/the-tower-of-babel",
      "revision": "f7e132c9717eda574f3bb5f643b2f983309f319f",
      "source": "flagship/README.md"
    }
  ],
  "next_cursor": "Project this cluster into the highest-value role/company whose bottleneck requires traceable automation, execution provenance, or secure delegated actions; retain the exact donor revisions and evidence-class exclusions."
}
```
