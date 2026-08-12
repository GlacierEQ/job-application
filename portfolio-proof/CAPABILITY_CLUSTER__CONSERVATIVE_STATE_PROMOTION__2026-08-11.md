# Capability Cluster — Conservative State Promotion

## Canonical claim

**Conservative State Promotion**: when the available evidence, dependency state, or resource budget cannot justify a stronger conclusion, preserve the unresolved state explicitly instead of manufacturing completion or certainty.

Claim ceiling: `CROSS_DOMAIN_CONSERVATIVE_STATE_PROMOTION_WITH_ANDURIL_CURRENT_CANONICAL_IMPLEMENTATION_AND_HISTORICAL_VERIFIED_COORDINATOR_REVISION`.

This is one repeated engineering capability across independent domains, not two accomplishments and not a repository-count claim.

## Recruiter surface

Built independent systems that refuse to turn incomplete inputs into false certainty: a resource-bounded coordinator records tasks as deferred when they cannot be fully funded or their dependencies did not complete, while a multi-sensor track compiler preserves residual unknown mass and grows uncertainty from stale/covariant evidence rather than collapsing every observation into confidence.

## Independent donor A — GlacierEQ/anduril-track-envelope-compiler

Canonical revision observed: `46f0061f27070e5bcfbfcfe77d5b06b0e014c31f`.

Implemented mechanism:

- temporally decays support from stale detections;
- counts repeated observations from one sensor as geometry evidence without treating them as independent confidence;
- expands spatial bounds from covariance;
- fuses independent sensor support while retaining `residual_unknown_mass`;
- adds spatial and covariance penalties into `residual_uncertainty`;
- fingerprints policy and evidence deterministically.

Repository excellence state records the central mechanism, deterministic proof, adversarial survival, operability, proof receipt, authority bounds, and projection-truth gates as passed. The evolution receipt binds Python/native-C verification to workflow `31461547751` on candidate `fb8e460e3b76b9d0453e702dfd2bd167368dd6a5`; canonical `main@46f0061f...` contains that promoted evolution.

Evidence class: `CURRENT_CANONICAL_SOURCE_WITH_BOUND_PROMOTED_EVOLUTION_PROOF`.

Nonclaims: authenticated sensor identity, production deployment, Anduril affiliation, operational tracking performance at scale.

## Independent donor B — GlacierEQ/anthropic-agent-coordinator

Exact verified executable revision: `87438f57bdfd2cb380730cf51140611963d7c95b`.

Implemented mechanism:

- assigns a task only when its full token estimate fits both remaining global budget and aggregate role capacity;
- records explicit deferral reasons for global-budget exhaustion, role-capacity exhaustion, and incomplete dependencies;
- never partially funds a task and calls it assigned;
- deferred prerequisites never unlock downstream work;
- `CoordinationResult.complete` is true only when the deferred set is empty.

The repository promotion receipt binds this revision to `62 collected / 62 executed / 62 passed / 0 failed / 0 errors / 0 skipped` under exact local repository reconstruction.

Evidence class: `HISTORICAL_EXACT_REVISION_TEST_PROOF`.

Current-head boundary: the repository has changed since this verified revision and current-head documentation/verification work remains separately gated. This cluster does not transfer the 62-test receipt to current `master`.

Nonclaims: agent execution, provider calls, hosted cross-version CI, production scale, deployment, Anthropic affiliation.

## Shared engineering invariant

The implementations are independent and domain-specific, but they share the same promotion rule:

1. Define the condition required to justify promotion.
2. Evaluate the available evidence/resources against that condition.
3. Preserve unresolved mass/state when the condition is not met.
4. Expose the unresolved state explicitly to downstream consumers.
5. Never relabel partial satisfaction as full completion/confidence.

Semantic boundary versus adjacent clusters:

- **Conservative State Promotion** — preserves uncertainty, deferral, or incompleteness in the semantic output until the promotion condition is satisfied.
- **Fail-Closed Execution Envelopes** — prevents execution or terminal-result acceptance when authority, identity, state, or verification conditions fail.
- **Evidence-Carrying Execution** — binds provenance and receipts to an execution/result so downstream consumers can verify what produced it.

## Machine surface

```yaml
schema: glaciereq.portfolio.capability-cluster.v1
capability_id: conservative-state-promotion
accomplishment_count: 1
claim_ceiling: CROSS_DOMAIN_CONSERVATIVE_STATE_PROMOTION_WITH_ANDURIL_CURRENT_CANONICAL_IMPLEMENTATION_AND_HISTORICAL_VERIFIED_COORDINATOR_REVISION
invariant:
  - require_full_promotion_condition
  - preserve_unresolved_state
  - expose_uncertainty_or_deferral
  - never_promote_partial_state_as_complete
donors:
  - repo: GlacierEQ/anduril-track-envelope-compiler
    revision: 46f0061f27070e5bcfbfcfe77d5b06b0e014c31f
    evidence_class: CURRENT_CANONICAL_SOURCE_WITH_BOUND_PROMOTED_EVOLUTION_PROOF
    proof_candidate: fb8e460e3b76b9d0453e702dfd2bd167368dd6a5
    workflow_run: 31461547751
    anchors:
      - temporal_decay
      - covariance_expanded_bounds
      - sensor_independence
      - residual_unknown_mass
      - residual_uncertainty
  - repo: GlacierEQ/anthropic-agent-coordinator
    revision: 87438f57bdfd2cb380730cf51140611963d7c95b
    evidence_class: HISTORICAL_EXACT_REVISION_TEST_PROOF
    tests:
      collected: 62
      executed: 62
      passed: 62
      failed: 0
      errored: 0
      skipped: 0
    anchors:
      - full_funding_only
      - global_budget_deferral
      - role_capacity_deferral
      - dependency_not_completed_deferral
      - complete_only_when_no_deferred_tasks
forbidden_inferences:
  integration:
    - repositories_are_integrated
    - agent_execution_or_provider_calls
  accomplishment:
    - repository_count_equals_accomplishment_count
  proof_inheritance:
    - coordinator_current_head_inherits_historical_test_proof
  deployment:
    - production_deployment
  affiliation:
    - employer_or_company_affiliation
  authority:
    - authenticated_sensor_identity
```

## Next cursor

Project this capability into roles where calibration under incomplete information matters — agent reliability, safety/reliability engineering, autonomy infrastructure, distributed scheduling, or sensor/data fusion — while retaining the donor-specific evidence ceilings above.
